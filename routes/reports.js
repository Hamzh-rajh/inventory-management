const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  res.render('reports/index', { title: 'التقارير' });
});

router.get('/stock', (req, res) => {
  const warehouse_id = req.query.warehouse_id || '';
  const warehouses = db.prepare('SELECT * FROM warehouses').all();

  let stockQuery = `
    SELECT p.code, p.name, p.unit, p.sell_price, p.min_quantity,
      w.name as warehouse_name, s.quantity,
      (p.sell_price * s.quantity) as total_value,
      CASE WHEN s.quantity <= p.min_quantity THEN 1 ELSE 0 END as low_stock
    FROM stock s
    JOIN products p ON s.product_id = p.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE 1=1
  `;
  const params = [];
  if (warehouse_id) { stockQuery += ' AND s.warehouse_id = ?'; params.push(warehouse_id); }
  stockQuery += ' ORDER BY low_stock DESC, p.name';

  const stock = db.prepare(stockQuery).all(...params);
  const totalValue = stock.reduce((sum, s) => sum + s.total_value, 0);

  res.render('reports/stock', { stock, warehouses, warehouse_id, totalValue, title: 'تقرير المخزون' });
});

router.get('/sales', (req, res) => {
  const from = req.query.from || '';
  const to = req.query.to || '';

  let query = `
    SELECT i.invoice_number, i.type, i.created_at, i.total, i.paid,
      i.status, c.name as customer_name, w.name as warehouse_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    JOIN warehouses w ON i.warehouse_id = w.id
    WHERE 1=1
  `;
  const params = [];
  if (from) { query += ' AND DATE(i.created_at) >= ?'; params.push(from); }
  if (to) { query += ' AND DATE(i.created_at) <= ?'; params.push(to); }
  query += ' ORDER BY i.created_at DESC';

  const invoices = db.prepare(query).all(...params);
  const totalSales = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paid, 0);
  const totalUnpaid = totalSales - totalPaid;

  // Top products
  let topQuery = `
    SELECT p.name, p.code, SUM(ii.quantity) as total_sold, SUM(ii.quantity * ii.price) as revenue
    FROM invoice_items ii
    JOIN products p ON ii.product_id = p.id
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE 1=1
  `;
  const topParams = [];
  if (from) { topQuery += ' AND DATE(i.created_at) >= ?'; topParams.push(from); }
  if (to) { topQuery += ' AND DATE(i.created_at) <= ?'; topParams.push(to); }
  topQuery += ' GROUP BY p.id ORDER BY revenue DESC LIMIT 10';
  const topProducts = db.prepare(topQuery).all(...topParams);

  res.render('reports/sales', {
    invoices, from, to, totalSales, totalPaid, totalUnpaid, topProducts,
    title: 'تقرير المبيعات'
  });
});

module.exports = router;
