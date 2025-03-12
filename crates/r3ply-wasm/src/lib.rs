pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
use wasm_bindgen::prelude::*;
use std::collections::{HashMap, HashSet};
use ammonia::Builder;

#[wasm_bindgen]
pub fn sanitize_html(text: String, allowed_tags: Vec<String>) -> String {
    let tag_set: HashSet<&str> = allowed_tags.iter().map(String::as_str).collect();
    let mut binding = Builder::default();
    let cleaner = binding.tags(tag_set);
    cleaner.clean(&text).to_string()
}

use pulldown_cmark::{Parser, html};

#[wasm_bindgen]
pub fn md_to_html(text: String) -> String {
  let parser = Parser::new(&text);
  let mut html_output = String::new();
  html::push_html(&mut html_output, parser);
  return html_output
}

use mail_parser::MessageParser;
use serde::Serialize;

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

use html_escape::decode_html_entities;

#[wasm_bindgen]
pub fn unescape_html(input: &str) -> String {
  decode_html_entities(input).into_owned()
}

use tera::{Tera, Context};

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