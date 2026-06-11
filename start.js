const { download } = require('./sync');

async function init() {
    console.log("🔄 جاري الاتصال بالخزنة السحابية وجلب البيانات...");
    await download();
    console.log("🚀 جاري تشغيل سيرفر النظام الرئيسي...");
    require('./app.js'); // تشغيل تطبيقك الأصلي
}

init();