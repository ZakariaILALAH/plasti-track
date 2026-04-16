const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'plastitrack.db');
const db = new sqlite3.Database(dbPath);

const points = [
  { nom: "Mairie de Niamey", lat: 13.5121, lng: 2.1126, adresse: "Centre-ville" },
  { nom: "Université Abdou Moumouni", lat: 13.5180, lng: 2.1250, adresse: "Campus" },
  { nom: "Marché de Wadata", lat: 13.5050, lng: 2.1050, adresse: "Wadata" },
  { nom: "École Danja", lat: 13.5234, lng: 2.1089, adresse: "Danja" }
];

db.serialize(() => {
  const stmt = db.prepare(`INSERT OR IGNORE INTO collect_points (nom, latitude, longitude, adresse, type, statut) VALUES (?, ?, ?, ?, 'poubelle', 'actif')`);
  points.forEach(p => {
    stmt.run(p.nom, p.lat, p.lng, p.adresse);
  });
  stmt.finalize();
  console.log(`${points.length} points de collecte insérés.`);
});

db.close();
```

Exécutez ce script :

Dans votre terminal (dans C:\Users\plastitrack), tapez :

```bash
node insert_points.js