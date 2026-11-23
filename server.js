const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const CHALLENGES = require('./challenges');

const PORT = process.env.PORT || 3000;
const { RESEND_API_KEY, MAIL_TO, MAIL_FROM } = process.env;
const TO = MAIL_TO || 'jobs@countingpixels.com';
const FROM = MAIL_FROM || 'Counting Pixels <no-reply@countingpixels.com>';

if (!RESEND_API_KEY) console.warn('RESEND_API_KEY not set: emails will be logged, not sent');

async function sendMail(mail) {
  if (!RESEND_API_KEY) return console.log(JSON.stringify(mail));
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(mail),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

const FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
  '/main.js': 'main.js',
  '/favicon.svg': 'favicon.svg',
};
for (const c of CHALLENGES) FILES[`/img/${c.img}.jpg`] = `img/${c.img}.jpg`;
const TYPES = {
  '.jpg': 'image/jpeg',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

// ---- abuse guards (in-memory; reset on restart) ----
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || 'countingpixels.com,www.countingpixels.com')
  .split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
const IP_LIMIT = 3;                                   // messages per IP per hour
const DAILY_CAP = Number(process.env.DAILY_CAP) || 40; // total messages per day (Resend free = 100/day)
const MIN_FILL_MS = 3000;                             // humans take longer than this to fill a form
const MAX_LINKS = 2;

const ipHits = new Map();   // ip -> [timestamps]
const seen = new Map();     // content hash -> timestamp
let day = { key: '', count: 0 };

function realIp(req) {
  // Behind Coolify's proxy the LAST x-forwarded-for entry is the one the proxy saw;
  // earlier entries can be forged by the client.
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map((x) => x.trim()).filter(Boolean);
  return xff.length ? xff[xff.length - 1] : req.socket.remoteAddress || '';
}
function ipLimited(ip) {
  const now = Date.now();
  const list = (ipHits.get(ip) || []).filter((t) => now - t < 3600e3);
  list.push(now);
  ipHits.set(ip, list);
  return list.length > IP_LIMIT;
}
function dailyCapReached() {
  const key = new Date().toISOString().slice(0, 10);
  if (day.key !== key) day = { key, count: 0 };
  return day.count >= DAILY_CAP;
}
function originAllowed(req) {
  const src = req.headers.origin || req.headers.referer;
  if (!src) return false;
  try {
    const host = new URL(src).hostname.toLowerCase();
    if (ALLOWED_HOSTS.includes(host)) return true;
    return process.env.NODE_ENV !== 'production' && (host === 'localhost' || host === '127.0.0.1');
  } catch { return false; }
}
// ---- human check ----
const CH_TTL = 5 * 60e3, MAX_ATTEMPTS = 3, MAX_PENDING = 500;
const pending = new Map(); // id -> { payload, i, attempts, expires }
const NUM = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

function norm(s) {
  const t = String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (t.length > 1 && ['a', 'an', 'the'].includes(t[0])) t.shift();
  return t.map((w) => (Object.hasOwn(NUM, w) ? String(NUM[w]) : w)).join('');
}
function pick(exclude) {
  let i;
  do { i = crypto.randomInt(CHALLENGES.length); } while (CHALLENGES.length > 1 && i === exclude);
  return i;
}
const view = (id, i) => ({ id, question: CHALLENGES[i].q, image: `/img/${CHALLENGES[i].img}.jpg` });

setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of ipHits) if (!list.some((t) => now - t < 3600e3)) ipHits.delete(ip);
  for (const [h, t] of seen) if (now - t > 86400e3) seen.delete(h);
  for (const [id, p] of pending) if (p.expires < now) pending.delete(id);
}, 600e3).unref();

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
  const block = (code, error, why) => { console.log('blocked:', why); return json(res, code, { error }); };
  const quiet = (why) => { console.log('dropped:', why); return json(res, 200, { ok: true }); }; // bots think it worked

  if (!originAllowed(req)) return block(403, 'Forbidden', 'origin');
  if (!/^application\/json/i.test(req.headers['content-type'] || '')) return block(415, 'Bad request', 'content-type');

  const ip = realIp(req);
  let b;
  try { b = JSON.parse(await readBody(req)); } catch { return block(400, 'Bad request', 'json'); }
  if (!b || typeof b !== 'object') return block(400, 'Bad request', 'shape');

  if (b.website) return quiet('honeypot');
  if (!(Number(b.ms) >= MIN_FILL_MS)) return quiet('too fast');
  if (ipLimited(ip)) return block(429, 'Too many messages, please try again later', 'ip limit');
  if (dailyCapReached()) return block(503, 'We are receiving too many messages right now, please try again tomorrow', 'daily cap');

  const clean = (v, max) => String(v || '').trim().slice(0, max);
  const name = clean(b.name, 120), email = clean(b.email, 200);
  const topic = clean(b.topic, 80), message = clean(b.message, 5000);
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return block(400, 'Please fill in name, a valid email and a message', 'invalid');
  }
  if (message.length < 10) return block(400, 'Please write a slightly longer message', 'too short');
  if ((`${name} ${message}`.match(/https?:\/\/|www\./gi) || []).length > MAX_LINKS) {
    return block(400, 'Please remove links from your message', 'links');
  }
  if (pending.size >= MAX_PENDING) return block(503, 'Please try again in a few minutes', 'pending full');

  const id = crypto.randomBytes(16).toString('hex');
  const i = pick(-1);
  pending.set(id, { payload: { name, email, topic, message }, i, attempts: 0, expires: Date.now() + CH_TTL });
  json(res, 200, { challenge: view(id, i) });
}

async function confirm(req, res) {
  const block = (code, error, why) => { console.log('blocked:', why); return json(res, code, { error }); };
  if (!originAllowed(req)) return block(403, 'Forbidden', 'origin');
  if (!/^application\/json/i.test(req.headers['content-type'] || '')) return block(415, 'Bad request', 'content-type');
  let b;
  try { b = JSON.parse(await readBody(req)); } catch { return block(400, 'Bad request', 'json'); }
  if (!b || typeof b !== 'object') return block(400, 'Bad request', 'shape');

  const id = String(b.id || '');
  const p = pending.get(id);
  if (!p || p.expires < Date.now()) {
    pending.delete(id);
    return block(410, 'This check expired, please send the form again', 'expired');
  }

  if (!CHALLENGES[p.i].a.some((a) => norm(a) === norm(b.answer))) {
    if (++p.attempts >= MAX_ATTEMPTS) {
      pending.delete(id);
      return block(410, 'Too many wrong answers, please send the form again', 'attempts');
    }
    p.i = pick(p.i);
    console.log('wrong answer');
    return json(res, 200, { retry: true, error: 'Not quite, try this one', challenge: view(id, p.i) });
  }

  pending.delete(id); // single use
  const { name, email, topic, message } = p.payload;
  if (dailyCapReached()) return block(503, 'We are receiving too many messages right now, please try again tomorrow', 'daily cap');
  const hash = crypto.createHash('sha256').update(`${email.toLowerCase()}|${message}`).digest('hex');
  if (seen.has(hash)) { console.log('dropped: duplicate'); return json(res, 200, { ok: true }); }
  seen.set(hash, Date.now());
  day.count++;

  try {
    await sendMail({
      from: FROM,
      to: [TO],
      reply_to: `${name.replace(/[<>"\r\n]/g, '')} <${email}>`,
      subject: `[countingpixels.com] ${topic || 'Contact'} — ${name}`.replace(/[\r\n]/g, ' '),
      text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}\n`,
    });
    json(res, 200, { ok: true });
  } catch (err) {
    console.error('sendMail failed:', err.message);
    json(res, 502, { error: 'Could not send message' });
  }
}

http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/api/contact/confirm') {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    return confirm(req, res);
  }
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
