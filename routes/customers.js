const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY name').all();
  res.render('customers/index', { customers, title: 'العملاء' });
});

router.get('/new', (req, res) => {
  res.render('customers/form', { customer: null, title: 'إضافة عميل' });
});

router.post('/', (req, res) => {
  const { name, phone, address } = req.body;
  db.prepare('INSERT INTO customers (name, phone, address) VALUES (?,?,?)').run(name, phone || '', address || '');
  res.redirect('/customers');
});

router.get('/:id/edit', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.redirect('/customers');
  res.render('customers/form', { customer, title: 'تعديل عميل' });
});

router.put('/:id', (req, res) => {
  const { name, phone, address } = req.body;
  db.prepare('UPDATE customers SET name=?, phone=?, address=? WHERE id=?').run(name, phone || '', address || '', req.params.id);
  res.redirect('/customers');
});

router.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.redirect('/customers');
  const invoices = db.prepare('SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.render('customers/show', { customer, invoices, title: customer.name });
});

module.exports = router;
