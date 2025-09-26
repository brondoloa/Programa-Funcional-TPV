const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.restaurantName = process.env.RESTAURANT_NAME;
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/cash-register', require('./routes/cashRegister'));
app.use('/api/accounting', require('./routes/accounting'));

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.render('dashboard');
});

app.get('/pos', (req, res) => {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'cashier')) {
    return res.redirect('/');
  }
  res.render('pos');
});

app.get('/validator', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.render('validator');
});

app.get('/products', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/');
  res.render('products');
});

app.get('/users', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/');
  res.render('users');
});

app.get('/cash-register', (req, res) => {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'cashier')) {
    return res.redirect('/');
  }
  res.render('cash-register');
});

app.get('/accounting', (req, res) => {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'accountant')) {
    return res.redirect('/');
  }
  res.render('accounting');
});

app.get('/reports', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/');
  res.render('reports');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor' 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});