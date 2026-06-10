const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const totalWarehouses = db.prepare('SELECT COUNT(*) as c FROM warehouses').get().c;
  const totalCustomers = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;

  const lowStock = db.prepare(`
    SELECT p.name, p.code, p.min_quantity, w.name as warehouse, s.quantity
    FROM stock s
    JOIN products p ON s.product_id = p.id
    JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.quantity <= p.min_quantity
    ORDER BY s.quantity ASC
    LIMIT 10
  `).all();

  const recentInvoices = db.prepare(`
    SELECT i.*, c.name as customer_name, w.name as warehouse_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    JOIN warehouses w ON i.warehouse_id = w.id
    ORDER BY i.created_at DESC LIMIT 5
  `).all();

  const totalSales = db.prepare("SELECT COALESCE(SUM(total),0) as t FROM invoices").get().t;
  const unpaidAmount = db.prepare("SELECT COALESCE(SUM(total-paid),0) as t FROM invoices WHERE status != 'paid'").get().t;

  res.render('dashboard', {
    totalProducts, totalWarehouses, totalCustomers,
    lowStock, recentInvoices, totalSales, unpaidAmount,
    title: 'لوحة التحكم'
  });
});

module.exports = router;
