const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('plastitrack.db');
db.all("SELECT * FROM collect_points", (err, rows) => {
    console.log(rows);
    db.close();