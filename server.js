const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO, MAIL_FROM } = process.env;

const transport = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true }); // dev: log instead of send

if (!SMTP_HOST) console.warn('SMTP_HOST not set: emails will be logged, not sent');

const FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
  '/main.js': 'main.js',
  '/favicon.svg': 'favicon.svg',
};
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

// naive in-memory rate limit: 5 messages per IP per hour
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

function send(res, code, body, headers = {}) {
  res.writeHead(code, {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...headers,
  });
  res.end(body);
}
const json = (res, code, obj) =>
  send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json' });

function readBody(req, limit = 10_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > limit) { reject(new Error('too large')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function contact(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  let b;
  try { b = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'Bad request' }); }

  // honeypot: pretend success so bots move on
  if (b.website) return json(res, 200, { ok: true });
  if (limited(ip)) return json(res, 429, { error: 'Too many messages, try again later' });

  const clean = (v, max) => String(v || '').trim().slice(0, max);
  const name = clean(b.name, 120), email = clean(b.email, 200);
  const topic = clean(b.topic, 80), message = clean(b.message, 5000);
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, 400, { error: 'Please fill in name, a valid email and a message' });
  }

  try {
    const info = await transport.sendMail({
      from: MAIL_FROM || MAIL_TO || 'jobs@countingpixels.com',
      to: MAIL_TO || 'jobs@countingpixels.com',
      replyTo: `"${name.replace(/["\r\n]/g, '')}" <${email}>`,
      subject: `[countingpixels.com] ${topic || 'Contact'} — ${name}`.replace(/[\r\n]/g, ' '),
      text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}\n`,
    });
    if (!SMTP_HOST) console.log(info.message);
    json(res, 200, { ok: true });
  } catch (err) {
    console.error('sendMail failed:', err.message);
    json(res, 502, { error: 'Could not send message' });
  }
}

http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/api/contact') {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    return contact(req, res);
  }
  if (url === '/healthz') return send(res, 200, 'ok');

  const file = FILES[url];
  if (!file || (req.method !== 'GET' && req.method !== 'HEAD')) return send(res, 404, 'Not found');
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) return send(res, 500, 'Error');
    send(res, 200, req.method === 'HEAD' ? '' : data, {
      'Content-Type': TYPES[path.extname(file)],
      'Cache-Control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=3600',
    });
  });
}).listen(PORT, () => console.log(`Listening on ${PORT}`));
