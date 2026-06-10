# 📦 نظام إدارة المخزون

نظام ويب بسيط لإدارة المخزون مبني بـ Node.js + Express + SQLite.

---

## 🚀 التشغيل المحلي

### المتطلبات
- Node.js v16 أو أحدث
- npm

### الخطوات

```bash
# 1. استنسخ المشروع أو فك الضغط
cd inventory-app

# 2. تثبيت المكتبات
npm install

# 3. تشغيل السيرفر
npm start

# 4. افتح المتصفح
# http://localhost:3000
```

---

## ☁️ النشر على Render (مجاني)

### الخطوة 1: رفع المشروع على GitHub
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/USERNAME/inventory-app.git
git push -u origin main
```

### الخطوة 2: إنشاء حساب على Render
- اذهب إلى https://render.com
- سجّل دخول بحساب GitHub

### الخطوة 3: إنشاء Web Service
1. اضغط **New +** ثم **Web Service**
2. اختر المستودع من GitHub
3. اضبط الإعدادات:

| الحقل | القيمة |
|-------|--------|
| Name | inventory-app |
| Environment | Node |
| Build Command | `npm install` |
| Start Command | `node app.js` |

### الخطوة 4: إضافة Persistent Disk (مهم!)
> بدون هذا ستُحذف قاعدة البيانات عند كل إعادة نشر

1. في صفحة الـ Service، اذهب إلى **Disks**
2. اضغط **Add Disk**
3. اضبط:
   - Name: `inventory-db`
   - Mount Path: `/opt/render/project/src`
   - Size: `1 GB`

### الخطوة 5: متغيرات البيئة
في قسم **Environment Variables** أضف:
```
DB_PATH = /opt/render/project/src/inventory.db
```

### الخطوة 6: النشر
- اضغط **Create Web Service**
- انتظر 2-3 دقائق
- الموقع سيكون على: `https://inventory-app-xxxx.onrender.com`

---

## 📋 المميزات

- ✅ إدارة المنتجات (إضافة/تعديل/حذف)
- ✅ تنبيه المخزون المنخفض
- ✅ فواتير نقدية وآجلة
- ✅ تسجيل العملاء ومتابعة الديون
- ✅ تسجيل المدفوعات
- ✅ المرتجعات مع تحديث المخزون
- ✅ التحويل بين المخزنين
- ✅ تقرير المخزون
- ✅ تقرير المبيعات مع فلتر التاريخ

---

## 📁 هيكل المشروع

```
inventory-app/
├── app.js              # نقطة الدخول
├── db/
│   └── database.js     # إعداد SQLite
├── routes/             # المسارات
│   ├── dashboard.js
│   ├── products.js
│   ├── invoices.js
│   ├── returns.js
│   ├── transfers.js
│   ├── reports.js
│   ├── customers.js
│   └── warehouses.js
├── views/              # واجهات EJS
│   ├── partials/
│   ├── products/
│   ├── invoices/
│   ├── returns/
│   ├── transfers/
│   ├── reports/
│   ├── customers/
│   └── warehouses/
├── public/
│   ├── css/style.css
│   └── js/main.js
├── render.yaml         # إعدادات Render
└── package.json
```

---

## ⚠️ ملاحظات

- **Render Free Tier**: السيرفر ينام بعد 15 دقيقة من عدم الاستخدام، أول طلب قد يأخذ 30 ثانية للاستيقاظ.
- قاعدة البيانات SQLite محفوظة على Persistent Disk بأمان.
- لا يحتاج أي إعداد إضافي بعد النشر.
