// Test-only stand-in for Supabase's REST API, used by the automated tests (tests/e2e).
// Just enough PostgREST for the app to read the course from tests/fixtures/db.json. Nothing is saved.
const http = require('http');
const fs = require('fs');
const FILE = process.env.MOCK_DB || require('path').join(__dirname, 'fixtures', 'db.json');
let db = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { vocabulary: [], sentences: [], word_sentences: [], seq: 1 };
const save = () => {}; // in memory only: every test run starts from the same fixture

function filt(rows, q) {
  return rows.filter((r) => [...q.entries()].every(([k, v]) => {
    if (['select', 'order', 'offset', 'limit', 'on_conflict', 'columns'].includes(k)) return true;
    const [op, ...rest] = v.split('.'); const val = rest.join('.');
    if (op === 'eq') return String(r[k]) === val;
    if (op === 'neq') return String(r[k]) !== val;
    if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')).includes(String(r[k]));
    return true;
  }));
}
const cmp = (a, b) => (a == null) - (b == null) || (a < b ? -1 : a > b ? 1 : 0);

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const u = new URL(req.url, 'http://x');
    const m = u.pathname.match(/^\/rest\/v1\/(\w+)/);
    const send = (code, data) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(data === undefined ? '' : JSON.stringify(data)); };
    if (!m) return send(404, { message: 'not found' });
    const t = m[1];
    if (!db[t]) db[t] = [];
    const q = u.searchParams;
    if (req.method === 'POST') {
      const rows = [].concat(JSON.parse(body || '[]'));
      const out = rows.map((r) => {
        const key = q.get('on_conflict');
        let ex = key && db[t].find((x) => x[key] === r[key]);
        if (ex) Object.assign(ex, r); else { ex = { id: db.seq++, ...r }; db[t].push(ex); }
        return ex;
      });
      save(); return send(201, out);
    }
    if (req.method === 'PATCH') { const patch = JSON.parse(body || '{}'); filt(db[t], q).forEach((r) => Object.assign(r, patch)); save(); return send(204); }
    if (req.method === 'DELETE') { const kill = new Set(filt(db[t], q)); db[t] = db[t].filter((r) => !kill.has(r)); save(); return send(204); }
    // GET
    let rows = filt(db[t], q);
    if (t === 'vocabulary') {
      rows = [...rows].sort((a, b) => cmp(a.course_order, b.course_order) || cmp(a.frequency_rank, b.frequency_rank) || a.id - b.id);
      if ((q.get('select') || '').includes('word_sentences')) {
        const sById = new Map(db.sentences.map((s) => [s.id, s]));
        const links = new Map();
        for (const l of db.word_sentences) { if (!links.has(l.word_id)) links.set(l.word_id, []); links.get(l.word_id).push({ is_sample: l.is_sample, sentences: sById.get(l.sentence_id) || null }); }
        rows = rows.map((r) => ({ ...r, word_sentences: links.get(r.id) || [] }));
      }
    }
    const off = Number(q.get('offset') || 0), lim = q.get('limit') ? Number(q.get('limit')) : rows.length;
    return send(200, rows.slice(off, off + lim));
  });
}).listen(Number(process.env.MOCK_PORT || 54321), () => console.log('mock supabase ready'));
