onst { Pool } = require('pg');

const pool = new Pool({
  host: 'db.xxxxxx.supabase.co',     // à remplacer
  port: 5432,
  user: 'postgres',
  password: 'votre_mot_de_passe',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

// Initialisation des tables
const initTables = async () => {
  const queries = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'citoyen',
      points INTEGER DEFAULT 0,
      telephone TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS collect_points (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      adresse TEXT,
      type TEXT DEFAULT 'poubelle',
      statut TEXT DEFAULT 'actif'
    );

    CREATE TABLE IF NOT EXISTS depots (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      point_id INTEGER REFERENCES collect_points(id),
      poids_kg REAL,
      points_credites INTEGER,
      date_depot TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      nom TEXT,
      email TEXT,
      sujet TEXT,
      message TEXT,
      date_envoi TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS qr_codes (
      id SERIAL PRIMARY KEY,
      point_id INTEGER REFERENCES collect_points(id),
      code TEXT UNIQUE,
      actif INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS galerie (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      image_path TEXT,
      description TEXT,
      date_upload TIMESTAMP DEFAULT NOW(),
      valide INTEGER DEFAULT 0
    );

    -- Insertion des points de collecte par défaut (si vide)
    INSERT INTO collect_points (nom, latitude, longitude, adresse, type, statut)
    SELECT 'Mairie de Niamey', 13.5121, 2.1126, 'Centre-ville', 'poubelle', 'actif'
    WHERE NOT EXISTS (SELECT 1 FROM collect_points LIMIT 1);
    INSERT INTO collect_points (nom, latitude, longitude, adresse, type, statut)
    SELECT 'Université Abdou Moumouni', 13.5180, 2.1250, 'Campus', 'poubelle', 'actif'
    WHERE NOT EXISTS (SELECT 1 FROM collect_points WHERE nom = 'Université Abdou Moumouni');
    INSERT INTO collect_points (nom, latitude, longitude, adresse, type, statut)
    SELECT 'Marché de Wadata', 13.5050, 2.1050, 'Wadata', 'poubelle', 'actif'
    WHERE NOT EXISTS (SELECT 1 FROM collect_points WHERE nom = 'Marché de Wadata');
    INSERT INTO collect_points (nom, latitude, longitude, adresse, type, statut)
    SELECT 'École Danja', 13.5234, 2.1089, 'Danja', 'poubelle', 'actif'
    WHERE NOT EXISTS (SELECT 1 FROM collect_points WHERE nom = 'École Danja');
  `;
  await pool.query(queries);
  console.log('Tables PostgreSQL initialisées');
};

initTables().catch(console.error);

module.exports = { pool };