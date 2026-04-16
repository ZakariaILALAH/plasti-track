module.exports = {
  isAuthenticated: (req, res, next) => {
    if (req.session && req.session.userId) return next();
    res.redirect('/login');
  },
  isCollecteur: (req, res, next) => {
    if (req.session && (req.session.role === 'collecteur' || req.session.role === 'admin')) return next();
    res.status(403).send("Accès réservé aux collecteurs");
  }
};