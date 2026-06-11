const express = require('express');
const methodOverride = require('method-override');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();

// تحديد مسار قاعدة البيانات ومطابقته لإعدادات المشروع وريندر
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db', 'inventory.db');

// إعداد الاتصال بخزنة Neon السحابية الخارجية
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // مطلوب لتأمين الاتصال السحابي
  });
}

// 1. دالة جلب قاعدة البيانات من السحابة عند تشغيل السيرفر
async function downloadBackup() {
  if (!pool) {
    console.log("⚠️ لم يتم العثور على DATABASE_URL. سيتم التشغيل محلياً فقط بدون مزامنة.");
    return;
  }
  try {
    // التأكد من وجود مجلد قاعدة البيانات تلقائياً
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // إنشاء جدول الحفظ في قاعدة البيانات السحابية إن لم يكن موجوداً
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cloud_backup (
        id INT PRIMARY KEY,
        data BYTEA,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // جلب آخر نسخة محفوظة
    const res = await pool.query('SELECT data FROM cloud_backup WHERE id = 1');
    if (res.rows.length > 0) {
      fs.writeFileSync(DB_PATH, res.rows[0].data);
      console.log(`✅ تم جلب قاعدة البيانات بنجاح من السحابة وحفظها في: ${DB_PATH}`);
    } else {
      console.log("ℹ️ لا توجد نسخة احتياطية سحابية سابقة. سيتم إنشاء قاعدة بيانات جديدة تماماً.");
    }
  } catch (err) {
    console.error("❌ خطأ أثناء تحميل قاعدة البيانات من السحابة:", err);
  }
}

// 2. دالة رفع وحفظ قاعدة البيانات الحالية إلى السحابة
async function uploadBackup() {
  if (!pool) return;
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.log("⚠️ ملف قاعدة البيانات المحلي غير موجود للرفع حالياً.");
      return;
    }

    const fileBuffer = fs.readFileSync(DB_PATH);
    await pool.query(`
      INSERT INTO cloud_backup (id, data, updated_at)
      VALUES (1, $1, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;
    `, [fileBuffer]);
    console.log("💾 تم حفظ ورفع نسخة احتياطية سحابية آمنة بنجاح.");
  } catch (err) {
    console.error("❌ خطأ أثناء رفع وحفظ قاعدة البيانات سحابياً:", err);
  }
}

// دالة التشغيل الرئيسية للنظام بالترتيب الصحيح
async function startServer() {
  // أولاً: جلب البيانات من السحاب وتجهيز الملف محلياً
  await downloadBackup();

  // ثانياً: تشغيل ملف قاعدة البيانات الأصلي ليفتح الملف المستورد بنجاح
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
    console.log(`🚀 النظام يعمل بنجاح على http://localhost:${PORT}`);
  });

  // ثالثاً: جدول الحفظ التلقائي الدوري (يتم الرفع تلقائياً كل دقيقتين كمثال للأمان)
  setInterval(() => {
    uploadBackup().catch(err => console.error("Interval upload error:", err));
  }, 2 * 60 * 1000);

  // رابعاً: حفظ البيانات فوراً عند إغلاق السيرفر أو نومه في Render (إشارة SIGTERM)
  process.on('SIGTERM', async () => {
    console.log('⚠️ إشارة إغلاق السيرفر وصلت! جاري تأمين البيانات ورفعها للسحاب قبل النوم...');
    try {
      await uploadBackup();
      console.log('✅ تم تأمين وحفظ البيانات بنجاح في السحاب. السيرفر مستعد للنوم الآن.');
      process.exit(0);
    } catch (err) {
      console.error('Failed to save data on shutdown:', err);
      process.exit(1);
    }
  });
}

// إطلاق النظام
startServer().catch(err => {
  console.error("❌ فشل بدء تشغيل السيرفر الرئيسي:", err);
});