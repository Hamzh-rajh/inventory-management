const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// تحديد مسار قاعدة البيانات بناءً على بيئة التشغيل
const dbPath = process.env.DB_PATH || path.join(__dirname, 'db', 'inventory.db');

// التأكد من وجود المجلد db
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// الاتصال بخزنة Neon السحابية
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// وظيفة تحميل قاعدة البيانات من السحاب عند بدء التشغيل
async function download() {
    if (!process.env.DATABASE_URL) {
        console.log("⚠️ DATABASE_URL غير معرف. سيتم التشغيل محلياً بدون مزامنة.");
        return;
    }
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cloud_backup (
                id INT PRIMARY KEY,
                data BYTEA,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        const res = await pool.query('SELECT data FROM cloud_backup WHERE id = 1');
        if (res.rows.length > 0) {
            fs.writeFileSync(dbPath, res.rows[0].data);
            console.log(`✅ تم تحميل قاعدة البيانات بنجاح من السحابة إلى: ${dbPath}`);
        } else {
            console.log("ℹ️ لا يوجد نسخة احتياطية سحابية سابقة. سيتم بدء قاعدة بيانات جديدة.");
        }
    } catch (err) {
        console.error("❌ خطأ أثناء تحميل قاعدة البيانات:", err);
    } finally {
        await pool.end();
    }
}

// وظيفة رفع وحفظ قاعدة البيانات إلى السحاب
async function upload() {
    if (!process.env.DATABASE_URL) return;
    if (!fs.existsSync(dbPath)) {
        console.log("⚠️ ملف قاعدة البيانات المحلي غير موجود للرفع.");
        return;
    }
    
    const localPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const fileBuffer = fs.readFileSync(dbPath);
        await localPool.query(`
            CREATE TABLE IF NOT EXISTS cloud_backup (
                id INT PRIMARY KEY,
                data BYTEA,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await localPool.query(`
            INSERT INTO cloud_backup (id, data, updated_at)
            VALUES (1, $1, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE
            SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;
        `, [fileBuffer]);
        console.log("💾 تم حفظ ورفع قاعدة البيانات إلى الخزنة السحابية بنجاح.");
    } catch (err) {
        console.error("❌ خطأ أثناء رفع قاعدة البيانات:", err);
    } finally {
        await localPool.end();
    }
}

module.exports = { download, upload };