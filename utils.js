// utils.js
// ======= وحدة مشتركة - تحل مشاكل تكرار الكود =======
// هذا الملف يجب تحميله بعد script.js مباشرةً وقبل كل الملفات الأخرى

/**
 * انتظار تهيئة Firebase قبل تشغيل الكود
 * دالة مشتركة لجميع الملفات - تحل مشكلة التكرار
 */
window.waitForFirebase = function(callback, retries = 50) {
    if (window.db && window.dbRef) {
        callback();
    } else if (retries > 0) {
        setTimeout(() => window.waitForFirebase(callback, retries - 1), 100);
    } else {
        console.error('Firebase not initialized after timeout');
    }
};

// للتوافق مع الكود القديم
window._waitForFirebase = window.waitForFirebase;

/**
 * دالة escapeHTML مشتركة - تمنع تكرارها في كل ملف
 * موجودة في script.js لكن نتأكد من توفرها هنا أيضاً
 */
if (!window.escapeHTML) {
    window.escapeHTML = function(str) {
        if (str === null || str === undefined) return '';
        if (typeof str !== 'string') str = String(str);
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };
}

/**
 * Toast notification مشترك - يستخدم showToast من script.js إن وجد
 */
window.safeShowToast = function(message, type = 'success', duration = 3000) {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type, duration);
    } else {
        // fallback بسيط
        alert(message);
    }
};

/**
 * تنسيق التاريخ بالعربية
 */
window.formatDateAr = function(dateStr) {
    if (!dateStr) return 'غير محدد';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * تحقق من أن URL آمن (https/http فقط)
 */
window.isSafeUrl = function(url) {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch (e) {
        return false;
    }
};

/**
 * عرض مؤشر التحميل داخل container
 */
window.showContainerLoading = function(containerId, message = 'جاري التحميل...') {
    const el = document.getElementById(containerId);
    if (el) {
        el.innerHTML = `<div style="text-align:center; padding:40px; color:#888;">
            <i class="fas fa-spinner fa-spin fa-2x" style="color:var(--main);"></i>
            <p style="margin-top:10px;">${window.escapeHTML(message)}</p>
        </div>`;
    }
};

/**
 * عرض رسالة "لا توجد نتائج" داخل container
 */
window.showEmptyState = function(containerId, message = 'لا توجد بيانات', icon = 'fa-inbox') {
    const el = document.getElementById(containerId);
    if (el) {
        el.innerHTML = `<div class="empty-state" style="text-align:center; padding:40px; color:#888;">
            <i class="fas ${icon} fa-2x" style="margin-bottom:10px; display:block;"></i>
            ${window.escapeHTML(message)}
        </div>`;
    }
};

/**
 * تعطيل زر وإظهار حالة التحميل
 */
window.setButtonLoading = function(btn, loadingText = 'جاري التحميل...') {
    if (!btn) return;
    btn._originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
};

/**
 * استعادة زر من حالة التحميل
 */
window.resetButton = function(btn) {
    if (!btn) return;
    btn.disabled = false;
    if (btn._originalText) btn.innerHTML = btn._originalText;
};

console.log('✅ utils.js محملة بنجاح');
