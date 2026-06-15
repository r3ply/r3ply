+++
title = "r3ply docs: API"
template = "doc.html"

[extra.comments]
enabled = true
+++

{{ breadcrumbs() }}

# API

## REST

### Issue Signet

There is a rate limit of 12 requests/minute/ip.

* Request: `GET <R3PLY_DOMAIN>/signet/<SITE_DOMAIN>[/<ISSUED_DATE][?format=json|toml]`
* Response: Either a TOML or JSON object with the signet.

TOML Example:

```bash, name=TOML Example
$ curl "https://r3ply.com/signet/r3ply.com"

[[site]]
domain = "r3ply.com"
r3ply = "r3ply.com"
signet = "q6Ubc-6RzCm_PiAHKzVlNg"
issued = 2025-11-12
```

JSON Example:

```bash, name=JSON Example
$ curl "https://r3ply.com/signet/foo.com?format=json"

{
  "domain": "foo.com",
  "r3ply": "r3ply.com",
  "signet": "_hXrluj1TKWGVU_p2EUdJA",
  "issued": "2025-11-12"
}
```

With issued date:

```bash, name=Example with issued parameter
$ curl "https://r3ply.com/signet/foo.com/2023-07-16"

[[site]]
domain = "foo.com"
r3ply = "r3ply.com"
signet = "xpjqQrShPmcqc7VnLRPC9g"
issued = 2023-07-16
```

### Pending Comments Cache

There is a rate limit of 12 requests/minute/ip. Pending comments are available for at least 24 hours.

#### Get All Pending Comments for a Domain

* Request: `GET <R3PLY_DOMAIN>/cache/comments/pending/<SITE_DOMAIN>/`
* Response: JSON Array of [Template Contexts](@/docs/templating.md#template-context)

#### Get Pending Comments for a Domain + Path

* Request: `GET <R3PLY_DOMAIN>/cache/comments/pending/<SITE_DOMAIN>/<PATH*>`
* Response: JSON Array of [Template Contexts](@/docs/templating.md#template-context)

Example:

```bash,name=Example of pending comments for r3ply.com/demo/
# Please note the trailing slash. It must be exact.
$ curl "https://r3ply.com/cache/comments/pending/r3ply.com/demo/"

[
  {
    "r3ply": {
      "config_version": "0.0.1",
      "server": "r3ply.com",
      "site": "r3ply.com",
      "signet": "3ittH-OrSNatN6CoWg6syw",
      "issued": "2025-11-08"
    },
    "author": {
      "pseudonym": "30e991c8dd7ef21de607f346d063d68033338049778be8aee61410c8a96a4d13",
      "token": "lRUH00NMDKqxPNFRtoc7iTe3S384zfvqn_smUb2Fu__cDlmSFm4A3DcOx_K_OYdoUqP9qfs-SmOSkYH6Kzr0Brw46ZrZZNXtsS-DYMPjWL8t-hLjfL7JWlemX0aAdd-zKNS0JhfJ6LfJIxZzUKGkc8-HhCnL6oupAuC0z8Pt9-VBoAmywjX33dgJvLBc0XSGiEmF86QlPEbfNdfOq1k8Xqfy3o0gQbyRverIJS2ePri5W_M6AAa2smqbdMAA0u_z3b6G4c70H6AO7-9mYTitrUc6Q5gIJoLXNYULGavQRzvrBt8v3-upPlWHqxLZWyxga2_IDsiw94VivP2LZVzNJIqxImCwAocuIJ_WNpzTl3L4ZXxkqoRZ2135ICYV1KluoJVUqIQ2Tc1PDw7GAwFZdcg3NrsS_79StM3YhuWK2ShntfEQF-nYvKNPh5lMdTy9K9Im3f0BPMC7lQpt"
    },
    "comment": {
      "id": "13a00e7c9d614153a74f4ff17a459586",
      "ts_rcvd": "1762640687",
      "subject": {
        "url": "https://r3ply.com/demo/",
        "origin": "https://r3ply.com",
        "protocol": "https:",
        "hostname": "r3ply.com",
        "path": "/demo/"
      },
      "txt": "First comment!\r\n",
      "md": "<p>First comment!</p>\n",
      "html": "<p>First comment!</p>\n"
    },
    "email": {
      "to": "r3ply.com@r3ply.com",
      "subject": "/demo/",
      "date": "2025-11-08T23:24:41-01:00",
      "text": "First comment!\r\n",
      "auth": {
        "dkim": true,
        "spf": true,
        "dmarc": true,
        "pass": true
      },
      "from": {
        "pseudonym": "30e991c8dd7ef21de607f346d063d68033338049778be8aee61410c8a96a4d13",
        "signet": "3ittH-OrSNatN6CoWg6syw",
        "issued": "2025-11-08",
        "token": "lRUH00NMDKqxPNFRtoc7iTe3S384zfvqn_smUb2Fu__cDlmSFm4A3DcOx_K_OYdoUqP9qfs-SmOSkYH6Kzr0Brw46ZrZZNXtsS-DYMPjWL8t-hLjfL7JWlemX0aAdd-zKNS0JhfJ6LfJIxZzUKGkc8-HhCnL6oupAuC0z8Pt9-VBoAmywjX33dgJvLBc0XSGiEmF86QlPEbfNdfOq1k8Xqfy3o0gQbyRverIJS2ePri5W_M6AAa2smqbdMAA0u_z3b6G4c70H6AO7-9mYTitrUc6Q5gIJoLXNYULGavQRzvrBt8v3-upPlWHqxLZWyxga2_IDsiw94VivP2LZVzNJIqxImCwAocuIJ_WNpzTl3L4ZXxkqoRZ2135ICYV1KluoJVUqIQ2Tc1PDw7GAwFZdcg3NrsS_79StM3YhuWK2ShntfEQF-nYvKNPh5lMdTy9K9Im3f0BPMC7lQpt"
      }
    }
  },
  {
    "r3ply": {
      "config_version": "0.0.1",
      "server": "r3ply.com",
      "site": "r3ply.com",
      "signet": "3ittH-OrSNatN6CoWg6syw",
      "issued": "2025-11-08"
    },
    "author": {
      "pseudonym": "211b2954cde81d961f6c1127d2ac4a23248dbea6ea5ff652a9d71d98531b5a82",
      "token": "wXvXYxqAYMJQgJzIxAQBuhWQRtwld_XBApTtxOyEdhC5XLY0GLU6KpVQxkab5g-SFyQAoNsFEoPMpdaKSnwMZAMbDTFuWdZ7i3iLVJ7wusIbp64_x1kWTkZHDeqh9IG27NwU087IuvDsmGAlEfU8f5AlF8qSyBPkivj3uBz4QRU_08okTJZi-2s5nNsdZs35APGO8nnBH1NTeW7vxRh0U6xX9MmQjwsPd1hZixN2su5JHl-BnqJ2EsEgZ9-9LmeDX3Iqj7K9wS5T37Nc84lK63SIXM4TR5CNgQtb9NiOXs2D3JC8WzoDiE5gxgKRMNRbpKwvzPbYZEq-MIZiP03bTLg3ZdfXHO9L8FOUkPKKYR53IMlRzHCeUma3FgenBDuFdkteiOuOlw5Vm4R8_l0bmjLfCsknNjbgCTAoCoGFPsO_Us5M2fRXbfVqYuzlzDFc2lOdojrJivOFTl9o"
    },
    "comment": {
      "id": "1ce2a8faace54d6c9dcff1cb79ca7e72",
      "ts_rcvd": "1762708612",
      "subject": {
        "url": "https://r3ply.com/demo/",
        "origin": "https://r3ply.com",
        "protocol": "https:",
        "hostname": "r3ply.com",
        "path": "/demo/"
      },
      "txt": "Ciao!\r\n",
      "md": "<p>Ciao!</p>\n",
      "html": "<p>Ciao!</p>\n"
    },
    "email": {
      "to": "r3ply.com@r3ply.com",
      "subject": "/demo/",
      "date": "2025-11-09T18:16:49-01:00",
      "text": "Ciao!\r\n",
      "auth": {
        "dkim": true,
        "spf": true,
        "dmarc": true,
        "pass": true
      },
      "from": {
        "pseudonym": "211b2954cde81d961f6c1127d2ac4a23248dbea6ea5ff652a9d71d98531b5a82",
        "signet": "3ittH-OrSNatN6CoWg6syw",
        "issued": "2025-11-08",
        "token": "wXvXYxqAYMJQgJzIxAQBuhWQRtwld_XBApTtxOyEdhC5XLY0GLU6KpVQxkab5g-SFyQAoNsFEoPMpdaKSnwMZAMbDTFuWdZ7i3iLVJ7wusIbp64_x1kWTkZHDeqh9IG27NwU087IuvDsmGAlEfU8f5AlF8qSyBPkivj3uBz4QRU_08okTJZi-2s5nNsdZs35APGO8nnBH1NTeW7vxRh0U6xX9MmQjwsPd1hZixN2su5JHl-BnqJ2EsEgZ9-9LmeDX3Iqj7K9wS5T37Nc84lK63SIXM4TR5CNgQtb9NiOXs2D3JC8WzoDiE5gxgKRMNRbpKwvzPbYZEq-MIZiP03bTLg3ZdfXHO9L8FOUkPKKYR53IMlRzHCeUma3FgenBDuFdkteiOuOlw5Vm4R8_l0bmjLfCsknNjbgCTAoCoGFPsO_Us5M2fRXbfVqYuzlzDFc2lOdojrJivOFTl9o"
      }
    }
  }
]
```

## Email

There is also a simple email interface under development.

### ping@r3ply.com

Responds with the time between when the email was sent and when it was received in milliseconds.

{{ next_prev(prev_path="/docs/schemas/", prev_text="r3ply Schemas", next_path="/project/", next_text="r3ply Project") }}