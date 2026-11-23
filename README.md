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
| `PORT`           | Default 3000                                                  |

## Local

    npm start                           # http://localhost:3000, mails are logged
    docker build -t countingpixels . && docker run --rm -p 8080:3000 countingpixels

## Deploy (Coolify)

Application from this Git repo, **Dockerfile** build pack, port **3000**,
plus the env vars above. Health check path: `/healthz`.
