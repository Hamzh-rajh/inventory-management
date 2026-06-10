const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const transfers = db.prepare(`
    SELECT t.*, p.name as product_name, p.code,
      w1.name as from_name, w2.name as to_name
    FROM transfers t
    JOIN products p ON t.product_id = p.id
    JOIN warehouses w1 ON t.from_warehouse_id = w1.id
    JOIN warehouses w2 ON t.to_warehouse_id = w2.id
    ORDER BY t.created_at DESC
  `).all();
  res.render('transfers/index', { transfers, title: 'التحويلات' });
});

router.get('/new', (req, res) => {
  const warehouses = db.prepare('SELECT * FROM warehouses').all();
  const products = db.prepare(`
    SELECT p.*, s.warehouse_id, s.quantity as stock_qty, w.name as warehouse_name
    FROM products p
    JOIN stock s ON s.product_id = p.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.quantity > 0
    ORDER BY p.name
  `).all();
  res.render('transfers/form', { warehouses, products, title: 'تحويل بين المخازن' });
});

router.post('/', (req, res) => {
  const { product_id, from_warehouse_id, to_warehouse_id, quantity, notes } = req.body;
  const qty = parseInt(quantity);

  if (from_warehouse_id === to_warehouse_id) {
    const warehouses = db.prepare('SELECT * FROM warehouses').all();
    const products = db.prepare(`SELECT p.*, s.warehouse_id, s.quantity as stock_qty, w.name as warehouse_name FROM products p JOIN stock s ON s.product_id = p.id JOIN warehouses w ON s.warehouse_id = w.id WHERE s.quantity > 0 ORDER BY p.name`).all();
    return res.render('transfers/form', { warehouses, products, title: 'تحويل بين المخازن', error: 'لا يمكن التحويل إلى نفس المخزن' });
  }

  const stock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?')
    .get(product_id, from_warehouse_id);

  if (!stock || stock.quantity < qty) {
    const warehouses = db.prepare('SELECT * FROM warehouses').all();
    const products = db.prepare(`SELECT p.*, s.warehouse_id, s.quantity as stock_qty, w.name as warehouse_name FROM products p JOIN stock s ON s.product_id = p.id JOIN warehouses w ON s.warehouse_id = w.id WHERE s.quantity > 0 ORDER BY p.name`).all();
    return res.render('transfers/form', { warehouses, products, title: 'تحويل بين المخازن', error: 'الكمية غير كافية في المخزن المصدر' });
  }

  db.transaction(() => {
    db.prepare('INSERT INTO transfers (product_id, from_warehouse_id, to_warehouse_id, quantity, notes) VALUES (?,?,?,?,?)')
      .run(product_id, from_warehouse_id, to_warehouse_id, qty, notes || '');
    db.prepare('UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?')
      .run(qty, product_id, from_warehouse_id);
    db.prepare('INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?,?,?) ON CONFLICT(product_id, warehouse_id) DO UPDATE SET quantity = quantity + ?')
      .run(product_id, to_warehouse_id, qty, qty);
  })();

  res.redirect('/transfers');
});

module.exports = router;
