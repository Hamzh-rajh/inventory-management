const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const search = req.query.search || '';
  let products;
  if (search) {
    products = db.prepare(`
      SELECT p.*, 
        COALESCE(SUM(s.quantity),0) as total_qty
      FROM products p
      LEFT JOIN stock s ON s.product_id = p.id
      WHERE p.name LIKE ? OR p.code LIKE ?
      GROUP BY p.id ORDER BY p.name
    `).all(`%${search}%`, `%${search}%`);
  } else {
    products = db.prepare(`
      SELECT p.*, 
        COALESCE(SUM(s.quantity),0) as total_qty
      FROM products p
      LEFT JOIN stock s ON s.product_id = p.id
      GROUP BY p.id ORDER BY p.name
    `).all();
  }
  res.render('products/index', { products, search, title: 'المنتجات' });
});

router.get('/new', (req, res) => {
  res.render('products/form', { product: null, title: 'إضافة منتج' });
});

router.post('/', (req, res) => {
  const { code, name, description, unit, purchase_price, sell_price, min_quantity } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO products (code, name, description, unit, purchase_price, sell_price, min_quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(code, name, description || '', unit || 'قطعة', purchase_price || 0, sell_price || 0, min_quantity || 5);

    // Init stock for all warehouses
    const warehouses = db.prepare('SELECT id FROM warehouses').all();
    const initQty = parseInt(req.body.initial_qty) || 0;
    const initWarehouse = parseInt(req.body.initial_warehouse) || warehouses[0]?.id;
    warehouses.forEach(w => {
      const qty = w.id === initWarehouse ? initQty : 0;
      db.prepare('INSERT OR IGNORE INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)')
        .run(result.lastInsertRowid, w.id, qty);
    });

    res.redirect('/products');
  } catch (err) {
    res.render('products/form', { product: req.body, title: 'إضافة منتج', error: err.message });
  }
});

router.get('/:id/edit', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.redirect('/products');
  const stock = db.prepare(`
    SELECT s.*, w.name as warehouse_name 
    FROM stock s JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.product_id = ?
  `).all(req.params.id);
  res.render('products/form', { product, stock, title: 'تعديل منتج' });
});

router.put('/:id', (req, res) => {
  const { code, name, description, unit, purchase_price, sell_price, min_quantity } = req.body;
  db.prepare(`
    UPDATE products SET code=?, name=?, description=?, unit=?, purchase_price=?, sell_price=?, min_quantity=?
    WHERE id=?
  `).run(code, name, description || '', unit || 'قطعة', purchase_price || 0, sell_price || 0, min_quantity || 5, req.params.id);
  res.redirect('/products');
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/products');
});

// Adjust stock quantity
router.post('/:id/stock', (req, res) => {
  const { warehouse_id, quantity } = req.body;
  db.prepare('UPDATE stock SET quantity = ? WHERE product_id = ? AND warehouse_id = ?')
    .run(quantity, req.params.id, warehouse_id);
  res.redirect('/products');
});

module.exports = router;
