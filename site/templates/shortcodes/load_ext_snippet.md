{#
  `path` - path to file
  `replace` - text to substitute with content located at `path`
#}
{% set data = load_data(path=path, format="plain") %}
{% set add_class = add_class | default(value="") %}

<div class="{{ add_class }}">

{{ body | regex_replace(pattern=replace, rep=data) }}

</div>