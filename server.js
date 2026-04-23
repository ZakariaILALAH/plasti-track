const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const db = require('./database');
const apiRoutes = require('./routes/api');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'un-secret-fort-pour-plastitrack',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use('/api', apiRoutes);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/objectifs', (req, res) => res.sendFile(path.join(__dirname, 'views', 'objectifs.html')));
app.get('/fonctionnalites', (req, res) => res.sendFile(path.join(__dirname, 'views', 'fonctionnalites.html')));
app.get('/impact', (req, res) => res.sendFile(path.join(__dirname, 'views', 'impact.html')));
app.get('/carte', (req, res) => res.sendFile(path.join(__dirname, 'views', 'carte.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));
app.get('/galerie', (req, res) => res.sendFile(path.join(__dirname, 'views', 'galerie.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'views', 'contact.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/profile', authMiddleware.isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'views', 'profile.html')));
app.get('/qr-code', authMiddleware.isCollecteur, (req, res) => res.sendFile(path.join(__dirname, 'views', 'qr-code.html')));

app.listen(PORT, () => console.log(`Serveur PLASTI'TRACK lancé sur http://localhost:${PORT}`));
