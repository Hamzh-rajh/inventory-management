const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const warehouses = db.prepare('SELECT * FROM warehouses').all();
  res.render('warehouses/index', { warehouses, title: 'المخازن' });
});

router.get('/new', (req, res) => {
  res.render('warehouses/form', { warehouse: null, title: 'إضافة مخزن' });
});

router.post('/', (req, res) => {
  const { name, location } = req.body;
  db.prepare('INSERT INTO warehouses (name, location) VALUES (?,?)').run(name, location || '');
  res.redirect('/warehouses');
});

router.get('/:id/edit', (req, res) => {
  const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id);
  if (!warehouse) return res.redirect('/warehouses');
  res.render('warehouses/form', { warehouse, title: 'تعديل مخزن' });
});

router.put('/:id', (req, res) => {
  const { name, location } = req.body;
  db.prepare('UPDATE warehouses SET name=?, location=? WHERE id=?').run(name, location || '', req.params.id);
  res.redirect('/warehouses');
});

module.exports = router;
