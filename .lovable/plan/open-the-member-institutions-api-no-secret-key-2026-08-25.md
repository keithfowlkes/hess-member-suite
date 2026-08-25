# Open the member institutions API (no secret key)

## About the secret

I can't retrieve the stored value of `HESS_MEMBER_PORTAL_WEBHOOK_SECRET` — secret values are write-only once saved. Rather than rotating and sharing a key, the plan below removes the key requirement entirely for this endpoint, since it only returns basic institution info.

## What changes

`list-member-institutions` becomes a public, read-only endpoint:

- Remove the `x-internal-secret` check and the timing-safe compare helper.
- Keep `verify_jwt = false` so no auth token is needed either.
- Accept both `GET` and `POST` so the other app can simply fetch the URL.
- Keep CORS open so the call can be made from browser code in credentials-compass.
- Keep the response shape unchanged: `{ institutions: [{ id, name, email_domain }] }`, limited to active member organizations only (no contacts, emails, addresses, or system data).

## Endpoint after the change

```text
GET https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/list-member-institutions
```

No headers required.

## Note on exposure

This makes the member institution list publicly readable by anyone with the URL. Only institution id, name, and email domain are returned — no contact or confidential data. If you'd prefer it stay gated, say so and I'll rotate the shared secret instead.
