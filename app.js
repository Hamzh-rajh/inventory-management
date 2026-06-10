const express = require('express');
const methodOverride = require('method-override');
const path = require('path');

const app = express();

// Init DB
require('./db/database');

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', require('./routes/dashboard'));
app.use('/products', require('./routes/products'));
app.use('/invoices', require('./routes/invoices'));
app.use('/returns', require('./routes/returns'));
app.use('/transfers', require('./routes/transfers'));
app.use('/reports', require('./routes/reports'));
app.use('/customers', require('./routes/customers'));
app.use('/warehouses', require('./routes/warehouses'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 النظام يعمل على http://localhost:${PORT}`);
});
