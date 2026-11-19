const $ = id => document.getElementById(id);
const st = t => $('st').textContent = t;
const setBusy = (b, pct = 0) => { $('pill').textContent = b ? 'Loading' : 'Ready'; $('pill').classList.toggle('busy', b); $('prog').style.width = (b ? pct : 100) + '%'; };
$('logo').addEventListener('error', () => $('logo').remove());
let items = [], nid = 0, pages = [], dragId = null, boardName = 'board', status = '';

const S = () => ({layout:$('layout').value, land:$('land').checked, m:+$('m').value, gap:+$('gap').value, rowH:+$('rowH').value, cols:+$('cols').value});
const dims = s => { const w = s.land ? 297 : 210, h = s.land ? 210 : 297; return {pw:w, ph:h, W:w-2*s.m, H:h-2*s.m}; };

/* ---------- layout engines (mm, original aspect ratios kept) ---------- */
function layoutRows(list, s, W, H) {
  const out = []; let page = {rects:[]}, y = 0, row = [], sum = 0;
  const flush = last => {
    if (!row.length) return;
    let h = (W - (row.length-1)*s.gap) / sum;
    if (last && h > s.rowH*1.5) h = s.rowH;
    h = Math.min(h, H);
    if (y + h > H + 1e-6 && page.rects.length) { out.push(page); page = {rects:[]}; y = 0; }
    let x = 0;
    for (const r of row) { const w = r.ar*h; page.rects.push({item:r.item, x, y, w, h}); x += w + s.gap; }
    y += h + s.gap; row = []; sum = 0;
  };
  for (const it of list) {
    const ar = it.w/it.h; row.push({item:it, ar}); sum += ar;
    if (sum*s.rowH + (row.length-1)*s.gap >= W) flush(false);
  }
  flush(true);
  if (page.rects.length) out.push(page);
  return out;
}
function layoutMasonry(list, s, W, H) {
  const n = s.cols, cw = (W - (n-1)*s.gap) / n, out = [];
  let page = {rects:[]}, cols = Array(n).fill(0);
  for (const it of list) {
    let w = cw, h = cw*it.h/it.w;
    if (h > H) { h = H; w = H*it.w/it.h; }
    const order = [...cols.keys()].sort((a,b) => cols[a]-cols[b]);
    let c = order.find(i => cols[i] + h <= H + 1e-6);
    if (c === undefined) { if (page.rects.length) { out.push(page); page = {rects:[]}; cols.fill(0); } c = 0; }
    page.rects.push({item:it, x:c*(cw+s.gap), y:cols[c], w, h});
    cols[c] += h + s.gap;
  }
  if (page.rects.length) out.push(page);
  return out;
}
const engine = s => s.layout === 'rows' ? layoutRows : layoutMasonry;

/* ---------- preview ---------- */
const main = $('main');
function render() {
  const s = S(), d = dims(s), k = 1.6;
  pages = engine(s)(items, s, d.W, d.H);
  main.innerHTML = '';
  for (const p of pages) {
    const pg = document.createElement('div');
    pg.className = 'pg'; pg.style.width = d.pw*k+'px'; pg.style.height = d.ph*k+'px';
    for (const r of p.rects) {
      const im = document.createElement('img');
      im.src = r.item.src; im.draggable = true; im.dataset.id = r.item.id;
      Object.assign(im.style, {left:(s.m+r.x)*k+'px', top:(s.m+r.y)*k+'px', width:r.w*k+'px', height:r.h*k+'px'});
      const x = document.createElement('span');
      x.className = 'x'; x.textContent = '✕'; x.dataset.id = r.item.id;
      x.style.left = (s.m+r.x+r.w)*k - 20 + 'px'; x.style.top = (s.m+r.y)*k + 2 + 'px';
      pg.append(im, x);
    }
    main.appendChild(pg);
  }
  st(`${status ? status + ' · ' : ''}${items.length} images · ${pages.length} page(s)`);
}
['layout','land','m','gap','rowH','cols'].forEach(id => $(id).addEventListener('input', render));

/* ---------- loading ---------- */
const addItem = (src, meta = {}) => new Promise(res => {
  const img = new Image();
  img.onload = () => { items.push({id:nid++, src, img, w:img.naturalWidth, h:img.naturalHeight, ...meta}); res(); };
  img.onerror = () => res();
  img.src = src;
});
async function fetchRecord(r) {
  for (const u of r.candidates || []) {
    try {
      const res = await fetch(u);
      if (!res.ok) continue;
      const b = await res.blob();
      if (b.type.startsWith('image/') && b.size) return {src: URL.createObjectURL(b), blob: b};
    } catch {}
  }
  return null;
}
async function loadSession() {
  const { a4Session } = await chrome.storage.local.get('a4Session');
  if (!a4Session?.records?.length) { setBusy(false); return st('No board loaded. Click the extension icon on a Pinterest board.'); }
  boardName = a4Session.boardName || 'board';
  $('title').textContent = boardName;
  document.title = `A4 · ${boardName}`;
  const q = a4Session.records.map((r, i) => ({r, i})), total = q.length;
  const slots = new Array(total); let done = 0, failed = 0;
  setBusy(true, 0);
  await Promise.all(Array.from({length:6}, async () => {
    while (q.length) {
      const {r, i} = q.shift();
      const got = await fetchRecord(r);
      if (got) slots[i] = {...got, pinId: r.id, title: r.title, n: i}; else failed++;
      status = `Fetching ${++done}/${total}${failed ? ` (${failed} failed)` : ''}`;
      st(status); setBusy(true, done / total * 100);
    }
  }));
  for (const sl of slots) if (sl) await addItem(sl.src, {blob: sl.blob, pinId: sl.pinId, title: sl.title, n: sl.n});
  status = failed ? `${failed} failed to fetch` : '';
  setBusy(false); render();
  if (items.length) {
    $('cmsg').textContent = `${items.length} images captured from “${boardName}”.`;
    $('csub').textContent = failed ? `${failed} could not be fetched.` : 'What would you like to do?';
    $('choice').style.display = 'flex';
  }
}
async function addFiles(fileList) {
  const fs = [...fileList].filter(f => f.type.startsWith('image/'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric:true}));
  for (const f of fs) await addItem(URL.createObjectURL(f));
  render();
}
$('files').onchange = e => addFiles(e.target.files);
$('dir').onchange = e => addFiles(e.target.files);
$('clear').onclick = () => { items = []; status = ''; render(); };

/* ---------- realign ---------- */
const shuffled = a => { a = [...a]; for (let i = a.length-1; i > 0; i--) { const j = Math.random()*(i+1)|0; [a[i],a[j]] = [a[j],a[i]]; } return a; };
$('shuf').onclick = () => { items = shuffled(items); render(); };
$('best').onclick = () => {
  const s = S(), d = dims(s), fn = engine(s); let best = items, bs = -1;
  for (let i = 0; i < 300; i++) {
    const o = i ? shuffled(items) : items, p = fn(o, s, d.W, d.H);
    const area = p.reduce((a, pg) => a + pg.rects.reduce((b, r) => b + r.w*r.h, 0), 0);
    const sc = area / (p.length*d.W*d.H);
    if (sc > bs) { bs = sc; best = o; }
  }
  items = best; render();
};

/* drag to reorder (internal drag is checked first: a dragged <img> also carries a file in dataTransfer) */
let hover = null;
const clearHover = () => { hover?.classList.remove('over'); hover = null; };
main.addEventListener('dragstart', e => {
  const im = e.target.closest?.('img[data-id]'); if (!im) return;
  dragId = im.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId);
});
main.addEventListener('dragend', () => { dragId = null; clearHover(); });
main.addEventListener('dragover', e => {
  e.preventDefault();
  if (dragId == null) return;
  e.dataTransfer.dropEffect = 'move';
  const t = e.target.closest?.('img[data-id]');
  if (t !== hover) { clearHover(); if (t && t.dataset.id !== dragId) { hover = t; t.classList.add('over'); } }
});
main.addEventListener('drop', e => {
  e.preventDefault();
  if (dragId != null) {
    const t = e.target.closest?.('img[data-id]');
    if (t && t.dataset.id !== dragId) {
      const a = items.findIndex(i => i.id == dragId), b = items.findIndex(i => i.id == t.dataset.id);
      const [it] = items.splice(a, 1); items.splice(b, 0, it);
    }
    dragId = null; clearHover(); render(); return;
  }
  if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
});
main.addEventListener('click', e => {
  if (e.target.classList.contains('x')) { items = items.filter(i => i.id != e.target.dataset.id); render(); }
});

/* ---------- output ---------- */
function jpeg(item, wmm) {
  const pw = Math.min(item.w, Math.round(wmm*300/25.4)), ph = Math.round(pw*item.h/item.w);
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0,0,pw,ph); g.drawImage(item.img, 0, 0, pw, ph);
  return c.toDataURL('image/jpeg', 0.92);
}
$('pdf').onclick = () => {
  const s = S();
  const doc = new jspdf.jsPDF({unit:'mm', format:'a4', orientation: s.land ? 'l' : 'p'});
  pages.forEach((p, i) => {
    if (i) doc.addPage();
    p.rects.forEach(r => doc.addImage(jpeg(r.item, r.w), 'JPEG', s.m+r.x, s.m+r.y, r.w, r.h));
  });
  doc.save('board.pdf');
};
$('png').onclick = async () => {
  const s = S(), d = dims(s), dpi = 150, px = mm => Math.round(mm*dpi/25.4), z = new JSZip();
  for (let i = 0; i < pages.length; i++) {
    const c = document.createElement('canvas'); c.width = px(d.pw); c.height = px(d.ph);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0,0,c.width,c.height); g.imageSmoothingQuality = 'high';
    pages[i].rects.forEach(r => g.drawImage(r.item.img, px(s.m+r.x), px(s.m+r.y), px(r.w), px(r.h)));
    z.file(`page_${i+1}.png`, await new Promise(res => c.toBlob(res, 'image/png')));
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await z.generateAsync({type:'blob'})); a.download = 'board_pages.zip'; a.click();
};
const safe = v => String(v || '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 48);
const extOf = t => ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'}[t] || (t.split('/')[1] || 'img'));
async function downloadZip() {
  const src = items.filter(i => i.blob).sort((a, b) => a.n - b.n);
  if (!src.length) return st('No captured images to zip.');
  st('Packing ZIP…');
  const z = new JSZip(), f = z.folder(safe(boardName) || 'board');
  src.forEach((it, i) => f.file(`${String(i+1).padStart(3,'0')}_${it.pinId || it.id}${it.title ? '_' + safe(it.title) : ''}.${extOf(it.blob.type)}`, it.blob));
  const blob = await z.generateAsync({type:'blob', compression:'STORE'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${safe(boardName) || 'board'}_localboard_${new Date().toISOString().slice(0,10)}.zip`;
  a.click(); render();
}
async function printPages() {
  const s = S(), d = dims(s), pa = $('print');
  $('pstyle').textContent = `@page{size:A4 ${s.land ? 'landscape' : 'portrait'};margin:0}`;
  pa.innerHTML = '';
  for (const p of pages) {
    const pg = document.createElement('div'); pg.className = 'pp';
    pg.style.width = d.pw + 'mm'; pg.style.height = d.ph + 'mm';
    for (const r of p.rects) {
      const im = document.createElement('img'); im.src = r.item.src;
      Object.assign(im.style, {left:(s.m+r.x)+'mm', top:(s.m+r.y)+'mm', width:r.w+'mm', height:r.h+'mm'});
      pg.appendChild(im);
    }
    pa.appendChild(pg);
  }
  await Promise.all([...pa.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
  window.print();
}
$('zip').onclick = downloadZip;
$('print-btn').onclick = printPages;
$('c-zip').onclick = () => { $('choice').style.display = 'none'; downloadZip(); };
$('c-print').onclick = () => { $('choice').style.display = 'none'; };

render();
loadSession();
