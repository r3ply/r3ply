use wasm_bindgen::prelude::*;
use serde::Serialize;
use mail_parser::MessageParser;
use mail_builder::{headers::{address::{Address, EmailAddress}, message_id::MessageId}, MessageBuilder};
use std::{borrow::Cow, collections::{HashMap, HashSet}};
use ammonia::Builder;
use pulldown_cmark::{Parser, html};
use html_escape::decode_html_entities;
use tera::{Tera, Context};

// html sanitization -----------------------------------------------------------
#[wasm_bindgen]
pub fn sanitize_html(text: String, allowed_tags: Vec<String>) -> String {
    let tag_set: HashSet<&str> = allowed_tags.iter().map(String::as_str).collect();
    let mut binding = Builder::default();
    let cleaner = binding.tags(tag_set);
    cleaner.clean(&text).to_string()
}

// md -> html ------------------------------------------------------------------
#[wasm_bindgen]
pub fn md_to_html(text: String) -> String {
  let parser = Parser::new(&text);
  let mut html_output = String::new();
  html::push_html(&mut html_output, parser);
  return html_output
}

// email parsing/building ------------------------------------------------------
#[wasm_bindgen]
pub fn parse_email_bytes(email: &[u8]) -> JsValue {
  let serializer = serde_wasm_bindgen::Serializer::json_compatible()
      .serialize_missing_as_null(true);
  MessageParser::default()
      .parse(email)
      .map(|message| message.serialize(&serializer).unwrap())
      .unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn parse_email_str(email: &str) -> JsValue {
  parse_email_bytes(email.as_bytes())
}

#[wasm_bindgen]
pub fn build_email(message_id: &str, date: Option<i64>, from_name: Option<String>, from_email: &str, to_email: &str, subject: &str, text_body: &str) -> Result<String, JsError> {
  let mut email = MessageBuilder::new()
    .message_id(MessageId::new(message_id))
    .from(Address::Address(EmailAddress {
      name: from_name.map(Cow::Owned),
      email: Cow::Borrowed(from_email),
    }))
    .to(to_email)
    .subject(subject)
    .text_body(text_body);

  if let Some(date) = date {
    email = email.date(date);
  }

    // TODO: if I need to add attachments
    // if let Some(attachment) = attachment {
    //   email = email.attachment((*attachment.content_type).clone(), (*attachment.filename).clone(), (*attachment.value).clone());
    // }
    //
    // #[wasm_bindgen]
    // #[derive(Clone, Debug)]
    // pub struct Attachment {
    //     content_type: Box<String>, // Wrapped in Box
    //     filename: Box<String>,     // Wrapped in Box
    //     value: Box<Vec<u8>>,       // Wrapped in Box
    // }

  return email.write_to_string().map_err(|error| JsError::from(error))
}

// html decoding ---------------------------------------------------------------
#[wasm_bindgen]
pub fn unescape_html(input: &str) -> String {
  decode_html_entities(input).into_owned()
}

// template processing ---------------------------------------------------------
#[wasm_bindgen]
pub fn tera(template: String, data: JsValue) -> Result<String, JsError> {
  let obj: HashMap<String, serde_json::Value> = serde_wasm_bindgen::from_value(data).expect("Expected a JSON object");
  let mut ctx = Context::new();
  for (key, value) in obj {
    ctx.insert(key, &value);
  };
  let mut tera = Tera::default();
  tera.render_str(&template, &ctx).map_err(|error| JsError::from(error))
}

// tests -----------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_email_works() {
      let actual = build_email("123", Some(1741963670), Some("Steve".to_owned()), "steve@apple.com", "woz@apple.com", "pokemon", "Gotta catch them all").unwrap();
      let expected = r#"
        Message-ID: <123>
        From: "Steve" <steve@apple.com>
        To: <woz@apple.com>
        Subject: pokemon
        Date: Fri, 14 Mar 2025 14:47:50 +0000
        MIME-Version: 1.0
        Content-Type: text/plain; charset="utf-8"
        Content-Transfer-Encoding: 7bit

        Gotta catch them all"#
        .trim_start()
        .lines()
        .map(|line| line.trim_start()) // Remove leading spaces for each line
        .collect::<Vec<_>>()
        .join("\r\n");
      assert_eq!(actual, expected );
    }
}