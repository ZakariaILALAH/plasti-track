const express = require('express');
const router = express.Router();
const { pool } = require('../database-pg');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ---------- AUTH ----------
router.post('/register', async (req, res) => {
  const { nom, email, password, role, telephone } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      `INSERT INTO users (nom, email, password, role, telephone) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nom, email, hashed, role || 'citoyen', telephone]
    );
    res.json({ success: true, userId: result.rows[0].id });
  } catch (err) {
    res.status(400).json({ error: "Email déjà utilisé" });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "Identifiants invalides" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Identifiants invalides" });
  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.nom = user.nom;
  res.json({ success: true, role: user.role });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// ---------- POINTS DE COLLECTE ----------
router.get('/points', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM collect_points WHERE statut = 'actif'`);
  res.json(rows);
});

// ---------- DÉPÔT ----------
router.post('/depot', async (req, res) => {
  const { user_id, point_id, poids_kg } = req.body;
  const points = poids_kg * 10;
  await pool.query(
    `INSERT INTO depots (user_id, point_id, poids_kg, points_credites) VALUES ($1, $2, $3, $4)`,
    [user_id, point_id, poids_kg, points]
  );
  await pool.query(`UPDATE users SET points = points + $1 WHERE id = $2`, [points, user_id]);
  res.json({ success: true, points_gagnes: points });
});

// ---------- QR CODE ----------
router.get('/generate-qr/:pointId', async (req, res) => {
  const pointId = req.params.pointId;
  const uniqueCode = `PLASTI-${Date.now()}-${pointId}`;
  await pool.query(`INSERT INTO qr_codes (point_id, code) VALUES ($1, $2)`, [pointId, uniqueCode]);
  const url = `https://plasti-track.onrender.com/scan?code=${uniqueCode}`;
  const qrImage = await QRCode.toDataURL(url);
  res.json({ qrImage, code: uniqueCode });
});

router.post('/validate-scan', async (req, res) => {
  const { code, poids_kg, userIdCollecteur } = req.body;
  const { rows } = await pool.query(`SELECT * FROM qr_codes WHERE code = $1 AND actif = 1`, [code]);
  const qr = rows[0];
  if (!qr) return res.status(404).json({ error: "QR code invalide" });
  const points = poids_kg * 10;
  await pool.query(`INSERT INTO depots (user_id, point_id, poids_kg, points_credites) VALUES ($1, $2, $3, $4)`, [userIdCollecteur, qr.point_id, poids_kg, points]);
  await pool.query(`UPDATE qr_codes SET actif = 0 WHERE code = $1`, [code]);
  res.json({ success: true, points });
});

// ---------- GALERIE ----------
router.post('/upload-galerie', upload.single('image'), async (req, res) => {
  const { userId, description } = req.body;
  const imagePath = `/uploads/${req.file.filename}`;
  await pool.query(`INSERT INTO galerie (user_id, image_path, description) VALUES ($1, $2, $3)`, [userId, imagePath, description]);
  res.json({ success: true, path: imagePath });
});

router.get('/galerie-images', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, u.nom as user_nom FROM galerie g JOIN users u ON g.user_id = u.id WHERE g.valide = 1 ORDER BY date_upload DESC`
  );
  res.json(rows);
});

// ---------- STATS ----------
router.get('/stats', async (req, res) => {
  const depots = await pool.query(`SELECT COUNT(*) as total_depots, SUM(poids_kg) as total_kg, SUM(points_credites) as total_points FROM depots`);
  const pointsCollecte = await pool.query(`SELECT COUNT(*) as total_points_collecte FROM collect_points`);
  res.json({
    depots: depots.rows[0],
    points_collecte: pointsCollecte.rows[0].total_points_collecte
  });
});

// ---------- CONTACT ----------
router.post('/contact', async (req, res) => {
  const { nom, email, sujet, message } = req.body;
  await pool.query(`INSERT INTO messages (nom, email, sujet, message) VALUES ($1, $2, $3, $4)`, [nom, email, sujet, message]);
  res.json({ success: true });
});

module.exports = router;