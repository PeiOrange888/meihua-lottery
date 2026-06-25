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
the expected public `lottery` paths:

- `lottery/qigua_count`
- `lottery/ssq/records/{recordId}`
- `lottery/dlt/records/{recordId}`

Browser writes cannot replace an entire lottery branch. Prediction writes must
create a new `pending` record with a stable key and valid ball ranges. Count
writes must increase `qigua_count` by one.

## Limitations

Because this is a static public page, Firebase rules can restrict shape and
paths, but they cannot fully prove that a write came from trusted application
logic. A user can still send valid-looking writes from their own browser.

Settlement now runs through a GitHub Actions job using Firebase Admin SDK. For
stronger integrity of visitor-created predictions, move browser writes to a
trusted backend too:

- Firebase Cloud Functions
- Cloudflare Workers
- Another server-side API

In that model, GitHub Pages remains the front end, and the backend performs
all database writes.

## Scheduled Settlement

This repository includes `.github/workflows/settle-lottery-admin.yml`, which
runs `scripts/settle-lottery-admin.mjs` every 30 minutes and can also be
triggered manually from the GitHub Actions tab.

The scheduled job handles lottery settlement so visitor browsers only need to
create predictions, read data, and display the latest draw results. It does not
by itself make writes fully private because the current Firebase rules still
allow public creation of valid-looking prediction records for the static site.
To make settlement fully trusted end to end, move prediction creation behind an
authenticated backend and remove browser database writes entirely.
