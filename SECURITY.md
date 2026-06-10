# Security Notes

This project is hosted as a static GitHub Pages site and writes directly to
Firebase Realtime Database from the browser.

## Current Security Model

- The web page is public.
- Firebase read access is public for the `lottery` data branch.
- Browser writes are limited by Firebase Realtime Database Rules.
- No private API keys or server secrets should be placed in this repository.

## Firebase Rules

Use `firebase-database.rules.json` as the baseline Realtime Database rules.

To apply the rules manually:

1. Open Firebase Console.
2. Select the `meihua-abb40` project.
3. Open **Realtime Database**.
4. Go to **Rules**.
5. Replace the rules with the contents of `firebase-database.rules.json`.
6. Publish the rules.

These rules keep the database readable for the page, but only allow writes under
the expected `lottery` paths:

- `lottery/qigua_count`
- `lottery/schema_version`
- `lottery/updated_at`
- `lottery/ssq`
- `lottery/dlt`

## Limitations

Because this is a static public page, Firebase rules can restrict shape and
paths, but they cannot fully prove that a write came from trusted application
logic. A user can still send valid-looking writes from their own browser.

For stronger integrity, move settlement and writes to a trusted backend:

- Firebase Cloud Functions
- GitHub Actions scheduled job
- Cloudflare Workers
- Another server-side API

In that model, GitHub Pages remains the front end, and the backend performs
settlement and database writes.
