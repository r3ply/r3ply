+++
template = "doc.html"
title = "r3ply schemas"
+++

# r3ply Schemas

This page is a listing of all the schemas used by r3ply so they can be browsed or referenced by tooling.

<div class="mt-8 -mb-4 p-0 text-lg flex justify-center gap-3 dark:text-amber-200">{{ fleuron_fish() }}</div>

## Config Schemas

| Version | Schema                                                                      | Remarks                             |
| ------- | --------------------------------------------------------------------------- | ----------------------------------- |
| v0.0.1  | [site](/schemas/v0.0.1/config/site.v0.0.1.json)                             | The main site config schema         |
| v0.0.1  | [signet](/schemas/v0.0.1/config/signet.v0.0.1.json)                         | For `[[site]]` entries              |
| v0.0.1  | [extra](/schemas/v0.0.1/config/extra.v0.0.1.json)                           | User defined content                |
| v0.0.1  | [comments](/schemas/v0.0.1/config/comments.v0.0.1.json)                     | The top-level config for comments   |
| v0.0.1  | [comments.email](/schemas/v0.0.1/config/comments/email.v0.0.1.json)         | Email comments                      |
| v0.0.1  | [moderation](/schemas/v0.0.1/config/moderation.v0.0.1.json)                 | The top-level config for moderation |
| v0.0.1  | [moderation.github](/schemas/v0.0.1/config/moderation/github.v0.0.1.json)   | GitHub Moderation channels          |
| v0.0.1  | [moderation.local](/schemas/v0.0.1/config/moderation/local.v0.0.1.json)     | Local Moderation channels           |
| v0.0.1  | [moderation.webhook](/schemas/v0.0.1/config/moderation/webhook.v0.0.1.json) | Webhook Moderation channels         |
