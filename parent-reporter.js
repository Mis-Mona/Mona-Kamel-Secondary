// parent-reporter.js
// نظام إرسال تقارير الطلاب عبر تليجرام

// دالة إرسال رسالة إلى تليجرام
async function sendTelegramMessage(chatId, message, token) {
    try {
        // إذا لم يُمرر التوكن، اجلبه من Firebase
        if (!token) {
            if (!window.db || !window.ref || !window.get) {
                console.error('❌ Firebase غير مهيأ');
                return false;
            }
            const tokenSnap = await window.get(window.ref(window.db, 'settings/telegramBotToken'));
            if (!tokenSnap.exists() || !tokenSnap.val()) {
                console.error('❌ Telegram token not found in Firebase at: settings/telegramBotToken');
                return false;
            }
            token = tokenSnap.val();
        }

        // التحقق من صحة chatId
        if (!chatId || isNaN(Number(chatId))) {
            console.error('❌ chatId غير صالح:', chatId);
            return false;
        }

        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: String(chatId),
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (!response.ok) {
            console.error('❌ Telegram API HTTP error:', response.status);
            return false;
        }

        const data = await response.json();
        if (!data.ok) {
            console.error('❌ Telegram API error:', data.description);
        }
        return data.ok === true;
    } catch (error) {
        console.error('Error sending telegram message:', error);
        return false;
    }
}

// ✅ دالة مشتركة لبناء بيانات التقرير من كائن الطالب مباشرة (بدون Firebase read إضافي)
function buildReportData(studentData) {
    const watchedCount = studentData.watchedVideos ? Object.keys(studentData.watchedVideos).length : 0;
    const examsCount   = studentData.examResults   ? Object.keys(studentData.examResults).length   : 0;

    let avgScore = 0;
    if (studentData.examResults) {
        const scores = Object.values(studentData.examResults).map(e => e.percentage || 0);
        if (scores.length > 0) {
            avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
    }

    return {
        studentName:    studentData.name           || 'طالب',
        telegramChatId: studentData.telegramChatId || null,
        videosCount:    watchedCount,
        examsCount:     examsCount,
        averageScore:   avgScore,
        points:         studentData.points || 0,
        grade:          studentData.grade  || 'غير محدد'
    };
}

// جلب بيانات تقدم الطالب من Firebase (للاستخدام الفردي)
async function getStudentReportData(userId) {
    try {
        if (!window.db || !window.ref || !window.get || !window.child || !window.dbRef) {
            console.error('❌ Firebase غير مهيأ في getStudentReportData');
            return null;
        }
        const studentSnap = await window.get(window.child(window.dbRef, `students/${userId}`));
        if (!studentSnap.exists()) return null;
        return buildReportData(studentSnap.val());
    } catch (error) {
        console.error('Error getting student data:', error);
        return null;
    }
}

// إنشاء نص التقرير - مع تأمين ضد HTML injection
function createReportMessage(data) {
    // ✅ safe() يُطبَّق على جميع القيم النصية
    const safe = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `📊 <b>تقرير تقدم الطالب</b>
------------------
👤 الاسم: ${safe(data.studentName)}
📅 التاريخ: ${safe(new Date().toLocaleDateString('ar-EG'))}
🎓 المرحلة: ${safe(data.grade)}

📹 الفيديوهات المشاهدة: ${parseInt(data.videosCount) || 0}
📝 الامتحانات التي تم حلها: ${parseInt(data.examsCount) || 0}
📊 متوسط الدرجات: ${parseInt(data.averageScore) || 0}%
⭐ النقاط: ${parseInt(data.points) || 0}

نتمنى لكم دوام التوفيق لأبنائنا 🌹`;
}

// ✅ مُصدَّرة على window للاستخدام من ملفات أخرى
const _showToast = (msg, type, dur) => {
    if (typeof window.showToast === 'function') window.showToast(msg, type, dur);
    else console.log('[Toast]', msg);
};
window.sendReportToParentSilent = async function(userId) {
    try {
        const data = await getStudentReportData(userId);
        if (!data || !data.telegramChatId) return false;
        const message = createReportMessage(data);
        return await sendTelegramMessage(data.telegramChatId, message);
    } catch (err) {
        console.error('Error in sendReportToParentSilent:', err);
        return false;
    }
};

// إرسال تقرير لولي أمر طالب محدد (مع إشعار للمستخدم)
window.sendReportToParent = async function(userId) {
    try {
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
            _showToast('❌ معرف الطالب غير صالح', 'error');
            return false;
        }
        const data = await getStudentReportData(userId.trim());
        if (!data) {
            _showToast('❌ لم يتم العثور على بيانات الطالب', 'error');
            return false;
        }
        if (!data.telegramChatId) {
            _showToast('❌ لا يوجد معرف تليجرام لولي الأمر', 'error');
            return false;
        }
        const message = createReportMessage(data);
        const success = await sendTelegramMessage(data.telegramChatId, message);
        if (success) {
            _showToast(`✅ تم إرسال التقرير إلى ولي أمر ${data.studentName}`, 'success');
            return true;
        } else {
            _showToast('❌ فشل إرسال التقرير - تحقق من توكن التيليجرام وصحة الـ chatId', 'error');
            return false;
        }
    } catch (err) {
        console.error('Error in sendReportToParent:', err);
        _showToast('❌ حدث خطأ غير متوقع أثناء إرسال التقرير', 'error');
        return false;
    }
};

// إرسال تقارير لكل الطلاب
// ✅ إصلاح N+1 الكامل: جلب التوكن + الطلاب مرة واحدة، وبناء التقرير من الكائن الموجود
window.sendBulkReports = async function() {
    try {
        if (!window.db || !window.ref || !window.get || !window.child || !window.dbRef) {
            if (true) _showToast('❌ Firebase غير مهيأ، حاول مرة أخرى', 'error');
            return;
        }

        // جلب التوكن مرة واحدة
        const tokenSnap = await window.get(window.ref(window.db, 'settings/telegramBotToken'));
        if (!tokenSnap.exists() || !tokenSnap.val()) {
            if (true) _showToast('❌ توكن التيليجرام غير موجود', 'error');
            return;
        }
        const telegramToken = tokenSnap.val();

        // جلب كل الطلاب مرة واحدة
        const studentsSnap = await window.get(window.child(window.dbRef, 'students'));
        if (!studentsSnap.exists()) {
            if (true) _showToast('❌ لا يوجد طلاب', 'error');
            return;
        }

        let sentCount         = 0;
        let totalWithTelegram = 0;
        let failedCount       = 0;

        for (const [uid, student] of Object.entries(studentsSnap.val())) {
            if (student.telegramChatId) {
                totalWithTelegram++;
                try {
                    // ✅ buildReportData يستخدم الكائن الموجود - صفر Firebase reads إضافية
                    const reportData = buildReportData(student);
                    const message    = createReportMessage(reportData);
                    const success    = await sendTelegramMessage(student.telegramChatId, message, telegramToken);
                    if (success) sentCount++;
                    else failedCount++;
                } catch (err) {
                    console.error(`Error sending report for ${uid}:`, err);
                    failedCount++;
                }
                // تأخير بسيط لتجنب تجاوز حدود Telegram API
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (_showToast) {
            const msg = `✅ تم إرسال ${sentCount} تقرير من أصل ${totalWithTelegram}${failedCount > 0 ? ` (فشل ${failedCount})` : ''}`;
            _showToast(msg, sentCount > 0 ? 'success' : 'error', 6000);
        }
    } catch (err) {
        console.error('Error in sendBulkReports:', err);
        if (true) _showToast('❌ حدث خطأ أثناء إرسال التقارير', 'error');
    }
};
