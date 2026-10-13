// Cloudflare Pages Functions: shiLo admin + public content API.
// Required: KV binding SHILO_DATA, secrets SHILO_SETUP_KEY and SHILO_SESSION_SECRET.
const STORE_KEY = 'content:v1';
const ADMIN_KEY = 'admin:v1';
const SESSION_SECONDS = 60 * 60 * 24;
const ITERATIONS = 160000;
const enc = new TextEncoder();
const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};
function reply(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...jsonHeaders, ...headers } });
}
function fail(message, status = 400) { return reply({ error: message }, status); }
function b64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function unb64(value) {
  const text = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(text + '='.repeat((4 - text.length % 4) % 4));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
function str(value, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function allowedUrl(value) {
  const v = str(value, 600);
  if (!v) return '';
  try {
    const u = new URL(v);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
  } catch { return ''; }
}
function cleanDate(value) {
  const v = str(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : '';
}
function cleanTime(value) {
  const v = str(value, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : '';
}
function cleanId(value) {
  const v = str(value, 80);
  return /^[\w-]{8,80}$/.test(v) ? v : crypto.randomUUID();
}
function items(arr, kind, max) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, max).filter(v => v && typeof v === 'object').map(v => {
    const base = { id: cleanId(v.id), published: v.published === true };
    if (kind === 'events') return {
      ...base, title: str(v.title, 120), date: cleanDate(v.date),
      time: cleanTime(v.time), venue: str(v.venue, 120),
      ticketUrl: allowedUrl(v.ticketUrl), note: str(v.note, 600)
    };
    if (kind === 'news') return {
      ...base, title: str(v.title, 120), date: cleanDate(v.date),
      body: str(v.body, 1200), url: allowedUrl(v.url)
    };
    return {
      ...base, name: str(v.name, 80), role: str(v.role, 80),
      bio: str(v.bio, 500), imageUrl: allowedUrl(v.imageUrl)
    };
  }).filter(v => (kind === 'members' ? v.name : v.title));
}
function cleanContent(data) {
  const d = data && typeof data === 'object' ? data : {};
  const s = d.settings && typeof d.settings === 'object' ? d.settings : {};
  return {
    settings: { tagline: str(s.tagline, 130), about: str(s.about, 700) },
    events: items(d.events, 'events', 60),
    members: items(d.members, 'members', 30),
    news: items(d.news, 'news', 80)
  };
}
async function getSite(env) {
  const raw = await env.SHILO_DATA.get(STORE_KEY, 'json');
  if (raw && raw.data) return { revision: str(raw.revision, 100), data: cleanContent(raw.data) };
  return { revision: 'initial', data: cleanContent({}) };
}
async function getAdmin(env) { return await env.SHILO_DATA.get(ADMIN_KEY, 'json'); }
async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: unb64(salt), iterations: ITERATIONS, hash: 'SHA-256' }, key, 256
  );
  return b64(new Uint8Array(bits));
}
async function newCredential(id, password) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  return { id, salt, hash: await hashPassword(password, salt), version: crypto.randomUUID() };
}
function validId(id) { return /^[\p{L}\p{N}._-]{3,40}$/u.test(id); }
function validPass(p) { return typeof p === 'string' && p.length >= 12 && p.length <= 128; }
function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  return !!origin && origin === new URL(request.url).origin;
}
async function bodyOf(request) {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) throw Error('JSON形式で送信してください');
  const s = await request.text();
  if (s.length > 160000) throw Error('データが大きすぎます');
  try { return JSON.parse(s); } catch { throw Error('入力内容を確認してください'); }
}
function cookieValue(request) {
  const match = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)shilo_session=([^;]+)/);
  return match ? match[1] : '';
}
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signSession(env, admin) {
  const payload = b64(enc.encode(JSON.stringify({
    id: admin.id, v: admin.version, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  })));
  const signature = b64(new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(env.SHILO_SESSION_SECRET), enc.encode(payload))));
  return payload + '.' + signature;
}
async function activeAdmin(request, env) {
  const token = cookieValue(request);
  if (!token || token.length > 1500) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const key = await hmacKey(env.SHILO_SESSION_SECRET);
    const valid = await crypto.subtle.verify('HMAC', key, unb64(parts[1]), enc.encode(parts[0]));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(unb64(parts[0])));
    if (!payload.exp || payload.exp < Date.now() / 1000) return null;
    const admin = await getAdmin(env);
    return admin && payload.v === admin.version && payload.id === admin.id ? admin : null;
  } catch { return null; }
}
function sessionCookie(token) {
  return 'shilo_session=' + token + '; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=' + SESSION_SECONDS;
}
const clearCookie = 'shilo_session=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
async function loginRate(request, env, successful = false) {
  const ip = (request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^0-9a-fA-F:.]/g, '').slice(0, 64);
  const key = 'login-rate:' + ip;
  if (successful) { await env.SHILO_DATA.delete(key); return 0; }
  const count = Number(await env.SHILO_DATA.get(key) || 0);
  return { count, key };
}
export async function onRequest({ request, env }) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  const method = request.method;
  if (!env.SHILO_DATA) return fail('管理用データ保存先が未設定です。Cloudflare KVを接続してください。', 503);
  if (path === '/api/content' && method === 'GET') {
    const { data } = await getSite(env);
    return reply({
      settings: data.settings,
      events: data.events.filter(x => x.published),
      members: data.members.filter(x => x.published),
      news: data.news.filter(x => x.published)
    });
  }
  if (!env.SHILO_SESSION_SECRET || env.SHILO_SESSION_SECRET.length < 32) {
    return fail('管理用シークレットが未設定です。', 503);
  }
  if (path === '/api/admin/session' && method === 'GET') {
    const admin = await getAdmin(env);
    const current = admin ? await activeAdmin(request, env) : null;
    return reply({ loggedIn: !!current, id: current ? current.id : '', setupRequired: !admin });
  }
  if (path === '/api/admin/content' && method === 'GET') {
    if (!await activeAdmin(request, env)) return fail('ログインしてください', 401);
    return reply(await getSite(env));
  }
  if (path === '/api/admin/logout' && method === 'POST') {
    if (!sameOrigin(request)) return fail('不正な送信元です', 403);
    return reply({ ok: true }, 200, { 'Set-Cookie': clearCookie });
  }
  if (method !== 'POST' && method !== 'PUT') return fail('Not found', 404);
  if (!sameOrigin(request)) return fail('不正な送信元です', 403);
  let input;
  try { input = await bodyOf(request); } catch (e) { return fail(e.message); }
  if (path === '/api/admin/setup' && method === 'POST') {
    if (await getAdmin(env)) return fail('初期設定は完了しています', 409);
    if (!env.SHILO_SETUP_KEY || env.SHILO_SETUP_KEY.length < 24) return fail('初期設定用キーが未設定です', 503);
    if (str(input.setupKey, 250) !== env.SHILO_SETUP_KEY) return fail('初期設定用キーが違います', 401);
    const id = str(input.id, 50);
    if (!validId(id) || !validPass(input.password)) return fail('管理IDは3〜40文字、パスワードは12文字以上で入力してください');
    const admin = await newCredential(id, input.password);
    await env.SHILO_DATA.put(ADMIN_KEY, JSON.stringify(admin));
    return reply({ ok: true, id }, 200, { 'Set-Cookie': sessionCookie(await signSession(env, admin)) });
  }
  if (path === '/api/admin/login' && method === 'POST') {
    const rate = await loginRate(request, env);
    if (rate.count >= 8) return fail('ログイン試行回数が多いため、15分後にお試しください', 429);
    const admin = await getAdmin(env);
    const id = str(input.id, 50);
    const valid = admin && id === admin.id && typeof input.password === 'string' &&
      equalBytes(unb64(admin.hash), unb64(await hashPassword(input.password, admin.salt)));
    if (!valid) {
      await env.SHILO_DATA.put(rate.key, String(rate.count + 1), { expirationTtl: 900 });
      return fail('管理IDまたはパスワードが違います', 401);
    }
    await loginRate(request, env, true);
    return reply({ ok: true, id }, 200, { 'Set-Cookie': sessionCookie(await signSession(env, admin)) });
  }
  const admin = await activeAdmin(request, env);
  if (!admin) return fail('ログインし直してください', 401);
  if (path === '/api/admin/content' && method === 'PUT') {
    const current = await getSite(env);
    if (input.revision !== current.revision) return fail('他の端末で更新されています。再読み込みしてから編集してください', 409);
    const data = cleanContent(input.data);
    const revision = crypto.randomUUID();
    await env.SHILO_DATA.put(STORE_KEY, JSON.stringify({ revision, data }));
    return reply({ ok: true, revision, data });
  }
  if (path === '/api/admin/account' && method === 'POST') {
    if (typeof input.currentPassword !== 'string' ||
      !equalBytes(unb64(admin.hash), unb64(await hashPassword(input.currentPassword, admin.salt)))) {
      return fail('現在のパスワードが違います', 401);
    }
    const id = str(input.newId, 50);
    if (!validId(id)) return fail('管理IDは3〜40文字で入力してください');
    const password = typeof input.newPassword === 'string' && input.newPassword.length ? input.newPassword : input.currentPassword;
    if (!validPass(password)) return fail('パスワードは12文字以上で入力してください');
    const next = await newCredential(id, password);
    await env.SHILO_DATA.put(ADMIN_KEY, JSON.stringify(next));
    return reply({ ok: true, id }, 200, { 'Set-Cookie': sessionCookie(await signSession(env, next)) });
  }
  return fail('Not found', 404);
}
