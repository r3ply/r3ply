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