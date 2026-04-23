const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post('/register', async (req, res) => {
  const { nom, email, password, role, telephone } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    const stmt = db.prepare(`INSERT INTO users (nom, email, password, role, telephone) VALUES (?, ?, ?, ?, ?)`);
    const info = stmt.run(nom, email, hashed, role || 'citoyen', telephone);
    res.json({ success: true, userId: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: "Email déjà utilisé" });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
  if (!user) return res.status(401).json({ error: "Identifiants invalides" });
  bcrypt.compare(password, user.password, (err, match) => {
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

router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Non authentifié" });
  const user = db.prepare(`SELECT id, nom, email, role, points, telephone, created_at FROM users WHERE id = ?`).get(req.session.userId);
  res.json(user);
});

router.get('/me/depots', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Non authentifié" });
  const depots = db.prepare(`
    SELECT d.*, c.nom as point_nom, c.adresse
    FROM depots d
    JOIN collect_points c ON d.point_id = c.id
    WHERE d.user_id = ?
    ORDER BY d.date_depot DESC
  `).all(req.session.userId);
  res.json(depots);
});

router.get('/points', (req, res) => {
  const rows = db.prepare(`SELECT * FROM collect_points WHERE statut = 'actif'`).all();
  res.json(rows);
});

router.post('/depot', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Vous devez être connecté" });
  const user_id = req.session.userId;
  const { point_id, poids_kg } = req.body;
  if (!point_id || !poids_kg || poids_kg <= 0) {
    return res.status(400).json({ error: "Données invalides" });
  };
  const points = poids_kg * 10;
  const stmt = db.prepare(`INSERT INTO depots (user_id, point_id, poids_kg, points_credites) VALUES (?, ?, ?, ?)`);
  stmt.run(user_id, point_id, poids_kg, points);
  db.prepare(`UPDATE users SET points = points + ? WHERE id = ?`).run(points, user_id);
  res.json({ success: true, points_gagnes: points });
});

router.get('/generate-qr/:pointId', async (req, res) => {
  const pointId = req.params.pointId;
  const uniqueCode = `PLASTI-${Date.now()}-${pointId}`;
  db.prepare(`INSERT INTO qr_codes (point_id, code) VALUES (?, ?)`).run(pointId, uniqueCode);
  const url = `https://${req.get('host')}/scan?code=${uniqueCode}`;
  const qrImage = await QRCode.toDataURL(url);
  res.json({ qrImage, code: uniqueCode });
});

router.post('/validate-scan', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Non authentifié" });
  const collecteur_id = req.session.userId;
  const { code, poids_kg } = req.body;
  const qr = db.prepare(`SELECT * FROM qr_codes WHERE code = ? AND actif = 1`).get(code);
  if (!qr) return res.status(404).json({ error: "QR code invalide" });
  const points = poids_kg * 10;
  // Le dépôt est attribué à l'utilisateur pour lequel le QR a été généré ?
  // Ici, on enregistre le dépôt pour le collecteur (ou pour le citoyen si le QR contient l'user_id).
  // Pour simplifier, on attribue au collecteur, mais vous pouvez améliorer.
  db.prepare(`INSERT INTO depots (user_id, point_id, poids_kg, points_credites) VALUES (?, ?, ?, ?)`).run(collecteur_id, qr.point_id, poids_kg, points);
  db.prepare(`UPDATE users SET points = points + ? WHERE id = ?`).run(points, collecteur_id);
  db.prepare(`UPDATE qr_codes SET actif = 0 WHERE code = ?`).run(code);
  res.json({ success: true, points });
});


router.post('/upload-galerie', upload.single('image'), (req, res) => {
  const { userId, description } = req.body;
  const imagePath = `/uploads/${req.file.filename}`;
  db.prepare(`INSERT INTO galerie (user_id, image_path, description) VALUES (?, ?, ?)`).run(userId, imagePath, description);
  res.json({ success: true, path: imagePath });
});

router.get('/galerie-images', (req, res) => {
  const rows = db.prepare(`SELECT g.*, u.nom as user_nom FROM galerie g JOIN users u ON g.user_id = u.id WHERE g.valide = 1 ORDER BY date_upload DESC`).all();
  res.json(rows);
});

router.get('/stats', (req, res) => {
  const depots = db.prepare(`SELECT COUNT(*) as total_depots, SUM(poids_kg) as total_kg, SUM(points_credites) as total_points FROM depots`).get();
  const pointsCollecte = db.prepare(`SELECT COUNT(*) as total_points_collecte FROM collect_points`).get();
  res.json({ depots, points_collecte: pointsCollecte.total_points_collecte });
});

router.post('/contact', (req, res) => {
  const { nom, email, sujet, message } = req.body;
  db.prepare(`INSERT INTO messages (nom, email, sujet, message) VALUES (?, ?, ?, ?)`).run(nom, email, sujet, message);
  res.json({ success: true });
});

module.exports = router;
