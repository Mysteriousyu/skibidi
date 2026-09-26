// Vercel serverless function that starts and stops Hyperbeam cloud browser
// sessions for the Safari app. The API key never leaves the server.
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   HYPERBEAM_API_KEY    required. Your Hyperbeam API key.
//   BROWSER_ACCESS_CODE  optional. When set, visitors must enter this code
//                        before a session starts, so strangers can't run up your bill.
//   BROWSER_MAX_MINUTES  optional. Hard limit per session (default 30, max 240).

const API = 'https://engine.hyperbeam.com/v0/vm';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const even = (n) => Math.floor(n / 2) * 2;

function safeUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.HYPERBEAM_API_KEY;
  const code = process.env.BROWSER_ACCESS_CODE;

  if (req.method === 'GET' && !(req.query && req.query.diagnose)) {
    return res.status(200).json({ available: Boolean(key), needsCode: Boolean(code) });
  }
  if (!key) {
    return res.status(501).json({ error: 'The cloud browser is not set up. Add HYPERBEAM_API_KEY to the Vercel project and redeploy.' });
  }
  if (code && req.headers['x-access-code'] !== code) {
    return res.status(401).json({ error: 'Access code required.', needsCode: true });
  }

  // GET ?diagnose=1 checks the key, active sessions and usage without starting a session.
  if (req.method === 'GET') {
    const auth = { headers: { Authorization: `Bearer ${key}` } };
    const read = async (url) => {
      try {
        const r = await fetch(url, auth);
        const text = await r.text();
        let body; try { body = JSON.parse(text); } catch { body = text.slice(0, 300); }
        return { status: r.status, body };
      } catch (e) {
        return { status: 0, body: String(e && e.message) };
      }
    };
    const [sessions, usage] = await Promise.all([read(API), read(`${API}/usage`)]);
    return res.status(200).json({
      keyAccepted: sessions.status === 200,
      activeSessions: Array.isArray(sessions.body && sessions.body.results) ? sessions.body.results.length : null,
      sessionsResponse: sessions.status === 200 ? undefined : sessions,
      usage: usage.status === 200 ? usage.body.usage : usage,
    });
  }

  if (req.method === 'POST') {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const minutes = clamp(Number(process.env.BROWSER_MAX_MINUTES) || 30, 1, 240);
    const width = even(clamp(Number(body.width) || 1280, 640, 1920));
    const height = even(clamp(Number(body.height) || 720, 360, 1080));
    const payload = {
      start_url: safeUrl(body.url) || 'https://www.google.com',
      kiosk: true,
      dark: Boolean(body.dark),
      adblock: true,
      search_engine: 'google',
      width,
      height,
      timeout: { absolute: minutes * 60, inactive: 10 * 60, offline: 60, warning: 60 },
    };
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        console.error('Hyperbeam start failed', r.status, JSON.stringify(data));
        return res.status(502).json({ error: data.message || data.error || `Hyperbeam returned status ${r.status}.` });
      }
      return res.status(200).json({
        session_id: data.session_id,
        embed_url: data.embed_url,
        admin_token: data.admin_token,
        max_minutes: minutes,
      });
    } catch (e) {
      console.error('Hyperbeam unreachable', e);
      return res.status(502).json({ error: 'Could not reach Hyperbeam. Try again in a moment.' });
    }
  }

  if (req.method === 'DELETE') {
    const id = String((req.query && req.query.id) || '');
    if (!/^[\w-]{6,128}$/.test(id)) return res.status(400).json({ error: 'Missing or invalid session id.' });
    await fetch(`${API}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${key}` },
    }).catch(() => {});
    return res.status(204).end();
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
};
