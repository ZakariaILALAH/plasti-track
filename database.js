const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, 'plastitrack.db');
const db = new Database(dbPath);

// Création des tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'citoyen',
    points INTEGER DEFAULT 0,
    telephone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS collect_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    adresse TEXT,
    type TEXT DEFAULT 'poubelle',
    statut TEXT DEFAULT 'actif'
  );

  CREATE TABLE IF NOT EXISTS depots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    point_id INTEGER,
    poids_kg REAL,
    points_credites INTEGER,
    date_depot DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(point_id) REFERENCES collect_points(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    email TEXT,
    sujet TEXT,
    message TEXT,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS qr_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    point_id INTEGER,
    code TEXT UNIQUE,
    actif INTEGER DEFAULT 1,
    FOREIGN KEY(point_id) REFERENCES collect_points(id)
  );

  CREATE TABLE IF NOT EXISTS galerie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    image_path TEXT,
    description TEXT,
    date_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
    valide INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Insertion de quelques points de collecte par défaut (si la table est vide)
const stmt = db.prepare(`INSERT OR IGNORE INTO collect_points (nom, latitude, longitude, adresse, type, statut) VALUES (?, ?, ?, ?, ?, ?)`);
stmt.run('Mairie de Niamey', 13.5121, 2.1126, 'Centre-ville', 'poubelle', 'actif');
stmt.run('Université Abdou Moumouni', 13.5180, 2.1250, 'Campus', 'poubelle', 'actif');
stmt.run('Marché de Wadata', 13.5050, 2.1050, 'Wadata', 'poubelle', 'actif');
stmt.run('École Danja', 13.5234, 2.1089, 'Danja', 'poubelle', 'actif');

module.exports = db;