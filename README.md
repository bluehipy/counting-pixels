# counting-pixels

Landing page for countingpixels.com. Static HTML/CSS/JS served by a tiny Node
server (`server.js`) that also handles the contact form (`POST /api/contact`)
and emails it via SMTP.

## Environment variables (set in Coolify)

| Variable    | Purpose                                                  |
|-------------|----------------------------------------------------------|
| `MAIL_TO`   | Recipient of contact messages (default `jobs@countingpixels.com`) |
| `MAIL_FROM` | Sender address, should belong to your SMTP domain (default: `MAIL_TO`) |
| `SMTP_HOST` | SMTP server. If unset, emails are only logged            |
| `SMTP_PORT` | Default 587 (465 = implicit TLS)                         |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials                           |
| `PORT`      | Default 3000                                             |

## Local

    npm install && npm start            # http://localhost:3000, mails are logged
    docker build -t countingpixels . && docker run --rm -p 8080:3000 countingpixels

## Deploy (Coolify)

Application from this Git repo, **Dockerfile** build pack, port **3000**,
plus the env vars above. Health check path: `/healthz`.
