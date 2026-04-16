const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcrypt');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');

// Configuration multer pour les images
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ---------- AUTH ----------
router.post('/register', async (req, res) => {
  const { nom, email, password, role, telephone } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  db.run(`INSERT INTO users (nom, email, password, role, telephone) VALUES (?,?,?,?,?)`,
    [nom, email, hashed, role || 'citoyen', telephone], function(err) {
      if (err) return res.status(400).json({ error: "Email déjà utilisé" });
      res.json({ success: true, userId: this.lastID });
    });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (!user) return res.status(401).json({ error: "Identifiants invalides" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Identifiants invalides" });
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.nom = user.nom;
    res.json({ success: true, role: user.role });
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// ---------- POINTS DE COLLECTE ----------
router.get('/points', (req, res) => {
  db.all("SELECT * FROM collect_points WHERE statut = 'actif'", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ---------- DÉPÔT / RÉCOMPENSE ----------
router.post('/depot', (req, res) => {
  const { user_id, point_id, poids_kg } = req.body;
  const points = poids_kg * 10;
  db.run(`INSERT INTO depots (user_id, point_id, poids_kg, points_credites) VALUES (?, ?, ?, ?)`,
    [user_id, point_id, poids_kg, points], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.run(`UPDATE users SET points = points + ? WHERE id = ?`, [points, user_id]);
      res.json({ success: true, points_gagnes: points });
    });
});

// ---------- QR CODE ----------
router.get('/generate-qr/:pointId', async (req, res) => {
  const pointId = req.params.pointId;
  const uniqueCode = `PLASTI-${Date.now()}-${pointId}`;
  db.run(`INSERT INTO qr_codes (point_id, code) VALUES (?,?)`, [pointId, uniqueCode], async (err) => {
    if (err) return res.status(500).json({ error: err.message });
    const url = `http://localhost:3000/scan?code=${uniqueCode}`;
    const qrImage = await QRCode.toDataURL(url);
    res.json({ qrImage, code: uniqueCode });
  });
});

router.post('/validate-scan', (req, res) => {
  const { code, poids_kg, userIdCollecteur } = req.body;
  db.get(`SELECT * FROM qr_codes WHERE code = ? AND actif = 1`, [code], (err, qr) => {
    if (!qr) return res.status(404).json({ error: "QR code invalide" });
    const points = poids_kg * 10;
    db.run(`INSERT INTO depots (user_id, point_id, poids_kg, points_credites) VALUES (?, ?, ?, ?)`,
      [userIdCollecteur, qr.point_id, poids_kg, points], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        db.run(`UPDATE qr_codes SET actif = 0 WHERE code = ?`, [code]);
        res.json({ success: true, points });
      });
  });
});

// ---------- GALERIE ----------
router.post('/upload-galerie', upload.single('image'), (req, res) => {
  const { userId, description } = req.body;
  const imagePath = `/uploads/${req.file.filename}`;
  db.run(`INSERT INTO galerie (user_id, image_path, description) VALUES (?,?,?)`,
    [userId, imagePath, description], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, path: imagePath });
    });
});

router.get('/galerie-images', (req, res) => {
  db.all(`SELECT g.*, u.nom as user_nom FROM galerie g JOIN users u ON g.user_id = u.id WHERE g.valide = 1 ORDER BY date_upload DESC`, (err, rows) => {
    res.json(rows);
  });
});

// ---------- STATISTIQUES DASHBOARD ----------
router.get('/stats', (req, res) => {
  db.get(`SELECT COUNT(*) as total_depots, SUM(poids_kg) as total_kg, SUM(points_credites) as total_points FROM depots`, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get(`SELECT COUNT(*) as total_points_collecte FROM collect_points`, (err2, row2) => {
      res.json({ depots: row, points_collecte: row2.total_points_collecte });
    });
  });
});

// ---------- CONTACT ----------
router.post('/contact', (req, res) => {
  const { nom, email, sujet, message } = req.body;
  db.run(`INSERT INTO messages (nom, email, sujet, message) VALUES (?, ?, ?, ?)`,
    [nom, email, sujet, message], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
});

module.exports = router;