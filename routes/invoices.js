const express = require('express');
const router = express.Router();
const db = require('../db/database');

function generateInvoiceNumber() {
  const now = new Date();
  const timestamp = now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  return `INV-${timestamp}`;
}

router.get('/', (req, res) => {
  const type = req.query.type || '';
  const status = req.query.status || '';
  let query = `
    SELECT i.*, c.name as customer_name, w.name as warehouse_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    JOIN warehouses w ON i.warehouse_id = w.id
    WHERE 1=1
  `;
  const params = [];
  if (type) { query += ' AND i.type = ?'; params.push(type); }
  if (status) { query += ' AND i.status = ?'; params.push(status); }
  query += ' ORDER BY i.created_at DESC';
  const invoices = db.prepare(query).all(...params);
  res.render('invoices/index', { invoices, type, status, title: 'الفواتير' });
});

router.get('/new', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY name').all();
  const warehouses = db.prepare('SELECT * FROM warehouses').all();
  const products = db.prepare(`
    SELECT p.*, s.quantity as stock_qty, s.warehouse_id
    FROM products p
    LEFT JOIN stock s ON s.product_id = p.id
    ORDER BY p.name
  `).all();
  res.render('invoices/form', {
    customers, warehouses, products,
    invoice: null, title: 'فاتورة جديدة',
    invoiceNumber: generateInvoiceNumber()
  });
});

router.post('/', (req, res) => {
  const { type, customer_id, warehouse_id, paid, notes, items } = req.body;

  if (!items || items.length === 0) {
    return res.redirect('/invoices/new');
  }

  const parsedItems = Array.isArray(items) ? items : [items];
  let total = 0;

  // Validate stock
  for (const item of parsedItems) {
    if (!item.product_id || !item.quantity) continue;
    const stock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?')
      .get(item.product_id, warehouse_id);
    if (!stock || stock.quantity < parseInt(item.quantity)) {
      const product = db.prepare('SELECT name FROM products WHERE id = ?').get(item.product_id);
      const customers = db.prepare('SELECT * FROM customers ORDER BY name').all();
      const warehouses = db.prepare('SELECT * FROM warehouses').all();
      const products = db.prepare(`SELECT p.*, s.quantity as stock_qty, s.warehouse_id FROM products p LEFT JOIN stock s ON s.product_id = p.id ORDER BY p.name`).all();
      return res.render('invoices/form', {
        customers, warehouses, products, invoice: req.body,
        title: 'فاتورة جديدة', invoiceNumber: req.body.invoice_number,
        error: `الكمية غير كافية للمنتج: ${product?.name || 'غير معروف'}`
      });
    }
    total += parseFloat(item.price) * parseInt(item.quantity);
  }

  const paidAmount = parseFloat(paid) || 0;
  let status = 'unpaid';
  if (paidAmount >= total) status = 'paid';
  else if (paidAmount > 0) status = 'partial';

  const invoiceInsert = db.transaction(() => {
    const inv = db.prepare(`
      INSERT INTO invoices (invoice_number, type, customer_id, warehouse_id, total, paid, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.body.invoice_number || generateInvoiceNumber(),
      type,
      customer_id || null,
      warehouse_id,
      total, paidAmount, status, notes || ''
    );

    for (const item of parsedItems) {
      if (!item.product_id || !item.quantity) continue;
      db.prepare('INSERT INTO invoice_items (invoice_id, product_id, quantity, price) VALUES (?, ?, ?, ?)')
        .run(inv.lastInsertRowid, item.product_id, item.quantity, item.price);
      // Deduct stock
      db.prepare('UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?')
        .run(item.quantity, item.product_id, warehouse_id);
    }

    // Update customer balance if credit
    if (type === 'credit' && customer_id && paidAmount < total) {
      db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?')
        .run(total - paidAmount, customer_id);
    }

    return inv.lastInsertRowid;
  });

  const invoiceId = invoiceInsert();
  res.redirect(`/invoices/${invoiceId}`);
});

router.get('/:id', (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, c.name as customer_name, c.phone as customer_phone, w.name as warehouse_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    JOIN warehouses w ON i.warehouse_id = w.id
    WHERE i.id = ?
  `).get(req.params.id);
  if (!invoice) return res.redirect('/invoices');

  const items = db.prepare(`
    SELECT ii.*, p.name as product_name, p.code, p.unit
    FROM invoice_items ii
    JOIN products p ON ii.product_id = p.id
    WHERE ii.invoice_id = ?
  `).all(req.params.id);

  res.render('invoices/show', { invoice, items, title: `فاتورة ${invoice.invoice_number}` });
});

// Pay invoice
router.post('/:id/pay', (req, res) => {
  const { amount } = req.body;
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.redirect('/invoices');

  const newPaid = invoice.paid + parseFloat(amount);
  let status = 'partial';
  if (newPaid >= invoice.total) status = 'paid';

  db.prepare('UPDATE invoices SET paid = ?, status = ? WHERE id = ?').run(newPaid, status, req.params.id);

  if (invoice.customer_id) {
    db.prepare('UPDATE customers SET balance = balance - ? WHERE id = ?').run(parseFloat(amount), invoice.customer_id);
  }

  res.redirect(`/invoices/${req.params.id}`);
});

module.exports = router;
