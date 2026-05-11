const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = 3000;

/* ─── Dossiers ─────────────────────────────────────────────────────────────── */
const DATA_DIR   = path.join(__dirname, 'data');
const COVERS_DIR = path.join(__dirname, 'public', 'covers');
const DB_FILE    = path.join(DATA_DIR, 'library.json');

[DATA_DIR, COVERS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

/* ─── Base de données JSON ─────────────────────────────────────────────────── */
function readDB() {
  if (!fs.existsSync(DB_FILE)) return { media: [], stats: { totalWatchTime: 0 } };
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { media: [], stats: { totalWatchTime: 0 } }; }
}
function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

/* ─── Upload covers ────────────────────────────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, COVERS_DIR),
  filename:    (_, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/* ─── Middleware ────────────────────────────────────────────────────────────── */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ═══════════════════════════════════════════════════════════════════════════
   API ROUTES
═══════════════════════════════════════════════════════════════════════════ */

/* GET  /api/media  — liste (filtres: type, status, search) */
app.get('/api/media', (req, res) => {
  let { media } = readDB();
  const { type, status, search, sort } = req.query;

  if (type   && type   !== 'all') media = media.filter(m => m.type   === type);
  if (status && status !== 'all') media = media.filter(m => m.status === status);
  if (search) {
    const q = search.toLowerCase();
    media = media.filter(m => m.title.toLowerCase().includes(q) || (m.genre || '').toLowerCase().includes(q));
  }

  const sorts = {
    title_asc:   (a, b) => a.title.localeCompare(b.title),
    title_desc:  (a, b) => b.title.localeCompare(a.title),
    rating_desc: (a, b) => (b.rating || 0) - (a.rating || 0),
    date_desc:   (a, b) => new Date(b.addedAt) - new Date(a.addedAt),
    date_asc:    (a, b) => new Date(a.addedAt) - new Date(b.addedAt),
    progress:    (a, b) => (b.episodesWatched / (b.totalEpisodes || 1)) - (a.episodesWatched / (a.totalEpisodes || 1)),
  };
  if (sort && sorts[sort]) media.sort(sorts[sort]);
  else media.sort(sorts.date_desc);

  res.json(media);
});

/* GET  /api/media/:id */
app.get('/api/media/:id', (req, res) => {
  const { media } = readDB();
  const item = media.find(m => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Introuvable' });
  res.json(item);
});

/* POST /api/media  — ajouter */
app.post('/api/media', upload.single('cover'), (req, res) => {
  const db   = readDB();
  const body = req.body;

  const item = {
    id:               uuidv4(),
    title:            body.title            || 'Sans titre',
    type:             body.type             || 'serie',   // serie | film | anime
    genre:            body.genre            || '',
    status:           body.status           || 'a_voir',  // a_voir | en_cours | termine | abandonne
    rating:           parseFloat(body.rating) || 0,
    totalEpisodes:    parseInt(body.totalEpisodes)  || 0,
    totalSeasons:     parseInt(body.totalSeasons)   || 1,
    episodesWatched:  parseInt(body.episodesWatched)|| 0,
    currentSeason:    parseInt(body.currentSeason)  || 1,
    year:             parseInt(body.year)            || null,
    studio:           body.studio           || '',
    synopsis:         body.synopsis         || '',
    cover:            req.file ? `/covers/${req.file.filename}` : null,
    coverUrl:         body.coverUrl         || null,
    localPath:        body.localPath        || '',
    tags:             body.tags ? body.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    notes:            body.notes            || '',
    addedAt:          new Date().toISOString(),
    updatedAt:        new Date().toISOString(),
    watchHistory:     [],
  };

  db.media.push(item);
  writeDB(db);
  res.status(201).json(item);
});

/* PUT  /api/media/:id  — modifier */
app.put('/api/media/:id', upload.single('cover'), (req, res) => {
  const db   = readDB();
  const idx  = db.media.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Introuvable' });

  const body    = req.body;
  const current = db.media[idx];

  // Supprimer l'ancien cover si nouveau upload
  if (req.file && current.cover && current.cover.startsWith('/covers/')) {
    const old = path.join(__dirname, 'public', current.cover);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }

  db.media[idx] = {
    ...current,
    title:           body.title            ?? current.title,
    type:            body.type             ?? current.type,
    genre:           body.genre            ?? current.genre,
    status:          body.status           ?? current.status,
    rating:          body.rating !== undefined ? parseFloat(body.rating) : current.rating,
    totalEpisodes:   body.totalEpisodes    !== undefined ? parseInt(body.totalEpisodes)   : current.totalEpisodes,
    totalSeasons:    body.totalSeasons     !== undefined ? parseInt(body.totalSeasons)    : current.totalSeasons,
    episodesWatched: body.episodesWatched  !== undefined ? parseInt(body.episodesWatched) : current.episodesWatched,
    currentSeason:   body.currentSeason    !== undefined ? parseInt(body.currentSeason)   : current.currentSeason,
    year:            body.year             !== undefined ? parseInt(body.year)             : current.year,
    studio:          body.studio           ?? current.studio,
    synopsis:        body.synopsis         ?? current.synopsis,
    cover:           req.file ? `/covers/${req.file.filename}` : current.cover,
    coverUrl:        body.coverUrl         ?? current.coverUrl,
    localPath:       body.localPath        ?? current.localPath,
    tags:            body.tags ? body.tags.split(',').map(t => t.trim()).filter(Boolean) : current.tags,
    notes:           body.notes            ?? current.notes,
    updatedAt:       new Date().toISOString(),
  };

  writeDB(db);
  res.json(db.media[idx]);
});

/* DELETE /api/media/:id */
app.delete('/api/media/:id', (req, res) => {
  const db  = readDB();
  const idx = db.media.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Introuvable' });

  const item = db.media[idx];
  if (item.cover && item.cover.startsWith('/covers/')) {
    const f = path.join(__dirname, 'public', item.cover);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  db.media.splice(idx, 1);
  writeDB(db);
  res.json({ ok: true });
});

/* PATCH /api/media/:id/progress  — épisode +1/-1 rapide */
app.patch('/api/media/:id/progress', (req, res) => {
  const db  = readDB();
  const idx = db.media.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Introuvable' });

  const { delta, episodesWatched, status } = req.body;
  const item = db.media[idx];

  if (delta !== undefined) {
    item.episodesWatched = Math.max(0, Math.min(item.totalEpisodes || 9999, item.episodesWatched + delta));
  }
  if (episodesWatched !== undefined) item.episodesWatched = parseInt(episodesWatched);
  if (status) item.status = status;

  // Auto-status
  if (item.totalEpisodes > 0 && item.episodesWatched >= item.totalEpisodes) item.status = 'termine';
  else if (item.episodesWatched > 0 && item.status === 'a_voir') item.status = 'en_cours';

  item.watchHistory.push({ date: new Date().toISOString(), ep: item.episodesWatched });
  item.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(item);
});

/* GET /api/stats */
app.get('/api/stats', (req, res) => {
  const { media } = readDB();
  const stats = {
    total:      media.length,
    series:     media.filter(m => m.type === 'serie').length,
    films:      media.filter(m => m.type === 'film').length,
    animes:     media.filter(m => m.type === 'anime').length,
    a_voir:     media.filter(m => m.status === 'a_voir').length,
    en_cours:   media.filter(m => m.status === 'en_cours').length,
    termine:    media.filter(m => m.status === 'termine').length,
    abandonne:  media.filter(m => m.status === 'abandonne').length,
    totalEpisodes: media.reduce((s, m) => s + (m.episodesWatched || 0), 0),
    avgRating:  media.filter(m => m.rating > 0).length
      ? (media.filter(m => m.rating > 0).reduce((s, m) => s + m.rating, 0) / media.filter(m => m.rating > 0).length).toFixed(1)
      : 0,
    topRated:   [...media].filter(m => m.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 5),
    recentlyAdded: [...media].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)).slice(0, 5),
    genres: media.reduce((acc, m) => {
      if (m.genre) { acc[m.genre] = (acc[m.genre] || 0) + 1; }
      return acc;
    }, {}),
  };
  res.json(stats);
});

/* POST /api/scan  — scanner un dossier local */
app.post('/api/scan', (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'Chemin requis' });

  const VIDEO_EXTS = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.m4v', '.ts', '.webm', '.flv'];

  function scanDir(dir, depth = 0) {
    if (depth > 3) return [];
    try {
      return fs.readdirSync(dir).flatMap(name => {
        const full = path.join(dir, name);
        try {
          const stat = fs.statSync(full);
          if (stat.isDirectory()) return scanDir(full, depth + 1);
          if (VIDEO_EXTS.includes(path.extname(name).toLowerCase())) {
            return [{ name: path.basename(name, path.extname(name)), path: full, size: stat.size, ext: path.extname(name) }];
          }
        } catch { /* skip */ }
        return [];
      });
    } catch { return []; }
  }

  if (!fs.existsSync(folderPath)) return res.status(404).json({ error: 'Dossier introuvable' });
  const files = scanDir(folderPath);
  res.json({ count: files.length, files: files.slice(0, 200) });
});

/* POST /api/import-cover-url  — télécharger une image depuis une URL */
app.post('/api/import-cover-url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL requise' });

  try {
    const https = url.startsWith('https') ? require('https') : require('http');
    const filename = uuidv4() + '.jpg';
    const dest = path.join(COVERS_DIR, filename);

    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, response => {
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', reject);
    });

    res.json({ cover: `/covers/${filename}` });
  } catch (e) {
    res.status(500).json({ error: 'Téléchargement échoué: ' + e.message });
  }
});

/* GET /api/export  — export JSON complet */
app.get('/api/export', (_, res) => {
  const db = readDB();
  res.setHeader('Content-Disposition', 'attachment; filename="mediatheque-export.json"');
  res.json(db);
});

/* ─── Start ─────────────────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🎬 Médiathèque lancée → http://localhost:${PORT}\n`);
  console.log(`📁 Données : ${DB_FILE}`);
  console.log(`🖼  Covers  : ${COVERS_DIR}\n`);
});
