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
use std::collections::HashSet;
use ammonia::Builder;

#[wasm_bindgen]
pub fn sanitize_html(text: String, allowed_tags: Vec<String>) -> String {
    // Convert Vec<String> into HashSet<&str>
    let tag_set: HashSet<&str> = allowed_tags.iter().map(String::as_str).collect();

    let mut binding = Builder::default();
    let cleaner = binding.tags(tag_set);

    // Example sanitized output (replace with actual input later)
    cleaner.clean(&text).to_string()
}

use pulldown_cmark::{Parser, html};

#[wasm_bindgen]
pub fn md_to_html(text: String) -> String {
  let parser = Parser::new(&text);

  // Write to a new String buffer.
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
  // Convert the string into bytes (assumed UTF-8) and call the other function.
  parse_email_bytes(email.as_bytes())
}