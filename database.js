const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'plastitrack.db');

const db = new sqlite3.Database(dbPath);

// Initialisation des tables
db.serialize(() => {
  // Utilisateurs (citoyens, collecteurs, opérateurs)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
	password TEXT NOT NULL,
    role TEXT DEFAULT 'citoyen',
    points INTEGER DEFAULT 0,
	telephone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Points de collecte
  db.run(`CREATE TABLE IF NOT EXISTS collect_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    adresse TEXT,
    type TEXT DEFAULT 'poubelle',
    statut TEXT DEFAULT 'actif'
  )`);

  // Signalements / dépôts
  db.run(`CREATE TABLE IF NOT EXISTS depots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    point_id INTEGER,
    poids_kg REAL,
    points_credites INTEGER,
    date_depot DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(point_id) REFERENCES collect_points(id)
  )`);

  // Messages de contact
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    email TEXT,
    sujet TEXT,
    message TEXT,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insertion de quelques points de collecte par défaut (Niamey)
  const stmt = db.prepare(`INSERT OR IGNORE INTO collect_points (nom, latitude, longitude, adresse) VALUES (?, ?, ?, ?)`);
  stmt.run("Point de collecte Mairie Centrale", 13.5121, 2.1126, "Mairie de Niamey");
  stmt.run("École Danja", 13.5234, 2.1089, "Danja");
  stmt.run("Marché de Wadata", 13.5050, 2.1050, "Wadata");
  stmt.run("Université Abdou Moumouni", 13.5180, 2.1250, "Campus");
  stmt.finalize();
});

module.exports = db;
// À ajouter après les tables existantes

// Table users avec mot de passe (en clair pour démo, mais en production utiliser bcrypt)
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'citoyen', -- citoyen, collecteur, operateur
  points INTEGER DEFAULT 0,
  telephone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Table qr_codes (pour les collecteurs : chaque collecteur a un code unique)
db.run(`CREATE TABLE IF NOT EXISTS qr_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  code TEXT UNIQUE,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

// Table galerie (photos uploadées)
db.run(`CREATE TABLE IF NOT EXISTS galerie (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT,
  description TEXT,
  image_path TEXT,
  uploaded_by INTEGER,
  date_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(uploaded_by) REFERENCES users(id)
)`);

// Insertion d'un utilisateur collecteur de test (mot de passe: 1234)
const bcrypt = require('bcrypt'); // à installer si vous voulez hasher, sinon texte clair
// Pour l'exemple, je laisse en clair mais en production hasher.
db.run(`INSERT OR IGNORE INTO users (nom, email, password, role) VALUES (?, ?, ?, ?)`,
  ['Collecteur Test', 'collecteur@plastitrack.ne', '1234', 'collecteur']);