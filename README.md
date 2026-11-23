# counting-pixels

Landing page for countingpixels.com. Static HTML/CSS/JS served by a tiny Node
server (`server.js`) that also handles the contact form (`POST /api/contact`)
and emails it through the Resend API.

## Environment variables (set in Coolify)

| Variable         | Purpose                                                       |
|------------------|---------------------------------------------------------------|
| `RESEND_API_KEY` | Resend API key. If unset, emails are only logged              |
| `MAIL_FROM`      | Sender, must be on a Resend-verified domain (default `Counting Pixels <no-reply@countingpixels.com>`) |
| `MAIL_TO`        | Recipient of contact messages (default `jobs@countingpixels.com`) |
| `ALLOWED_HOSTS`  | Comma-separated hostnames allowed to post the form (default `countingpixels.com,www.countingpixels.com`) |
| `DAILY_CAP`      | Max messages per day across all visitors (default 40)         |
| `PORT`           | Default 3000                                                  |

## Spam protection

Honeypot field, minimum fill time (3 s), origin check, JSON-only, 3 messages per IP per hour,
daily cap, max 2 links, duplicate detection, and a human check: submitting the form returns a
riddle (`challenges.js`, image in `img/<picsum id>.jpg`); the email is only sent after
`POST /api/contact/confirm` with the right answer (3 attempts, 5 min expiry, single use).
To add a riddle: add an entry to `challenges.js` and save the photo as `img/<id>.jpg`
(`curl -L -o img/<id>.jpg https://picsum.photos/id/<id>/600/400.jpg`). Limits are in memory and reset on restart.
Blocked requests are logged as `blocked:` / `dropped:` (no personal data).

## Local

    npm start                           # http://localhost:3000, mails are logged
    docker build -t countingpixels . && docker run --rm -p 8080:3000 countingpixels

## Deploy (Coolify)

Application from this Git repo, **Dockerfile** build pack, port **3000**,
plus the env vars above. Health check path: `/healthz`.
