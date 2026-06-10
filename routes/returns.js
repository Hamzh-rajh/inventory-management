const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const returns = db.prepare(`
    SELECT r.*, p.name as product_name, p.code, w.name as warehouse_name,
      i.invoice_number
    FROM returns r
    JOIN products p ON r.product_id = p.id
    JOIN warehouses w ON r.warehouse_id = w.id
    LEFT JOIN invoices i ON r.invoice_id = i.id
    ORDER BY r.created_at DESC
  `).all();
  res.render('returns/index', { returns, title: 'المرتجعات' });
});

router.get('/new', (req, res) => {
  const invoices = db.prepare(`
    SELECT i.*, c.name as customer_name FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    ORDER BY i.created_at DESC LIMIT 100
  `).all();
  const warehouses = db.prepare('SELECT * FROM warehouses').all();
  const products = db.prepare('SELECT * FROM products ORDER BY name').all();
  res.render('returns/form', { invoices, warehouses, products, title: 'إرجاع منتج' });
});

router.post('/', (req, res) => {
  const { invoice_id, product_id, warehouse_id, quantity, reason } = req.body;

  db.transaction(() => {
    db.prepare('INSERT INTO returns (invoice_id, product_id, warehouse_id, quantity, reason) VALUES (?, ?, ?, ?, ?)')
      .run(invoice_id || null, product_id, warehouse_id, quantity, reason || '');
    // Add back to stock
    db.prepare('UPDATE stock SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?')
      .run(quantity, product_id, warehouse_id);
  })();

  res.redirect('/returns');
});

module.exports = router;
