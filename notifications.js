// ================ NOTIFICATIONS SYSTEM ================
// تنبيه: هذا الملف يعتمد على المتغيرات التالية من script.js:
// - db, dbRef, window.currentUser, ref, get, child, push, update, remove (Firebase)
// - escapeHTML (helper function)
// يجب التأكد من تحميل script.js قبل notifications.js

// أنواع الإشعارات
const NOTIFICATION_TYPES = {
    NEW_VIDEO: 'new_video',
    NEW_EXAM: 'new_exam',
    PERFECT_SCORE: 'perfect_score',
    BADGE_EARNED: 'badge_earned',
    COURSE_SUBSCRIBED: 'course_subscribed',
    REMINDER: 'reminder'
};

// إنشاء إشعار جديد
window.createNotification = async function(userId, type, data) {
    if (!userId || !type) return;
    
    try {
        const notificationData = {
            id: generateNotificationId(),
            type: type,
            title: getNotificationTitle(type, data),
            message: getNotificationMessage(type, data),
            data: data,
            createdAt: new Date().toISOString(),
            createdAtLocal: new Date().toLocaleString('ar-EG'),
            read: false,
            clicked: false
        };
        
        // حفظ الإشعار في قاعدة البيانات
        await window.push(window.ref(window.db, `notifications/${userId}`), notificationData);
        
        // إذا كان المستخدم متصل حالياً، أظهر إشعار toast
        if (window.currentUser && window.currentUser.uid === userId) {
            showNotificationToast(notificationData);
        }
        
        // تحديث عداد الإشعارات إذا كنا في نفس الصفحة
        await updateNotificationBadge(userId);
        
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

// توليد ID فريد للإشعار
function generateNotificationId() {
    return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// الحصول على عنوان الإشعار حسب النوع
function getNotificationTitle(type, data) {
    const titles = {
        [NOTIFICATION_TYPES.NEW_VIDEO]: '📺 فيديو جديد',
        [NOTIFICATION_TYPES.NEW_EXAM]: '📝 امتحان جديد',
        [NOTIFICATION_TYPES.PERFECT_SCORE]: '🏆 درجة كاملة',
        [NOTIFICATION_TYPES.BADGE_EARNED]: '🎖️ شارة جديدة',
        [NOTIFICATION_TYPES.COURSE_SUBSCRIBED]: '✅ اشتراك جديد',
        [NOTIFICATION_TYPES.REMINDER]: '⏰ تذكير'
    };
    return titles[type] || '🔔 إشعار جديد';
}

// الحصول على نص الإشعار حسب النوع
function safeText(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getNotificationMessage(type, data) {
    switch(type) {
        case NOTIFICATION_TYPES.NEW_VIDEO:
            return `تم إضافة فيديو جديد "${safeText(data.videoTitle)}" في كورس "${safeText(data.courseName)}"`;
        case NOTIFICATION_TYPES.NEW_EXAM:
            return `تم نشر امتحان جديد "${safeText(data.examName)}" في كورس "${safeText(data.courseName)}"`;
        case NOTIFICATION_TYPES.PERFECT_SCORE:
            return `تهانينا! حصلت على درجة كاملة في امتحان "${safeText(data.examName)}" 🎉`;
        case NOTIFICATION_TYPES.BADGE_EARNED:
            return `مبروك! حصلت على شارة "${safeText(data.badgeName)}" +${parseInt(data.points) || 0} نقطة`;
        case NOTIFICATION_TYPES.COURSE_SUBSCRIBED:
            return `تم اشتراكك في كورس "${safeText(data.courseName)}" بنجاح`;
        case NOTIFICATION_TYPES.REMINDER:
            return safeText(data.message) || 'عندك تحديات مستنية!';
        default:
            return 'لديك إشعار جديد';
    }
}

// عرض إشعار toast
function showNotificationToast(notification) {
    const toast = document.createElement('div');
    toast.className = `notification-toast ${notification.type}`;
    
    let icon = 'fa-bell';
    switch(notification.type) {
        case NOTIFICATION_TYPES.NEW_VIDEO: icon = 'fa-video'; break;
        case NOTIFICATION_TYPES.NEW_EXAM: icon = 'fa-file-alt'; break;
        case NOTIFICATION_TYPES.PERFECT_SCORE: icon = 'fa-trophy'; break;
        case NOTIFICATION_TYPES.BADGE_EARNED: icon = 'fa-medal'; break;
    }
    
    // ✅ إصلاح: استخدام DOM API بدلاً من innerHTML مع onclick inline
    const toastIcon = document.createElement('div');
    toastIcon.className = 'notification-toast-icon';
    const iEl = document.createElement('i');
    iEl.className = `fas ${icon}`;
    toastIcon.appendChild(iEl);

    const toastContent = document.createElement('div');
    toastContent.className = 'notification-toast-content';

    const titleEl = document.createElement('div');
    titleEl.className = 'notification-toast-title';
    titleEl.textContent = notification.title;

    const msgEl = document.createElement('div');
    msgEl.className = 'notification-toast-message';
    msgEl.textContent = notification.message;

    const timeEl = document.createElement('div');
    timeEl.className = 'notification-toast-time';
    timeEl.textContent = notification.createdAtLocal;

    toastContent.appendChild(titleEl);
    toastContent.appendChild(msgEl);
    toastContent.appendChild(timeEl);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-toast-close';
    const closeIcon = document.createElement('i');
    closeIcon.className = 'fas fa-times';
    closeBtn.appendChild(closeIcon);
    closeBtn.addEventListener('click', () => toast.remove());

    toast.appendChild(toastIcon);
    toast.appendChild(toastContent);
    toast.appendChild(closeBtn);
    
    // حط الـ toast في مكانه
    let container = document.getElementById('notificationToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationToastContainer';
        container.className = 'notification-toast-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(toast);
    
    // امسحه بعد 5 ثواني
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// تحديث عداد الإشعارات
async function updateNotificationBadge(userId) {
    if (!userId) return;
    
    try {
        const notifSnap = await window.get(window.child(window.dbRef, `notifications/${userId}`));
        let unreadCount = 0;
        
        if (notifSnap.exists()) {
            notifSnap.forEach(notif => {
                if (!notif.val().read) unreadCount++;
            });
        }
        
        // تحديث العداد في الهيدر
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
        
        return unreadCount;
        
    } catch (error) {
        console.error('Error updating notification badge:', error);
    }
}

// تحميل قائمة الإشعارات
window.loadNotifications = async function() {
    if (!window.currentUser) return;
    
    try {
        const notifSnap = await window.get(window.child(window.dbRef, `notifications/${window.currentUser.uid}`));
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        let html = '';
        let notifications = [];
        
        if (notifSnap.exists()) {
            notifSnap.forEach(notif => {
                notifications.push({
                    id: notif.key,
                    ...notif.val()
                });
            });
            
            // رتب حسب التاريخ (الأحدث أولاً)
            notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // ✅ إصلاح: استخدام DOM API بدلاً من innerHTML مع onclick inline
            notifications.forEach(notif => {
                let icon = 'fa-bell';
                let bgColor = 'var(--main)';
                switch(notif.type) {
                    case NOTIFICATION_TYPES.NEW_VIDEO:     icon = 'fa-video';    bgColor = 'var(--primary)';   break;
                    case NOTIFICATION_TYPES.NEW_EXAM:      icon = 'fa-file-alt'; bgColor = 'var(--warning)';   break;
                    case NOTIFICATION_TYPES.PERFECT_SCORE: icon = 'fa-trophy';   bgColor = 'var(--gold)';      break;
                    case NOTIFICATION_TYPES.BADGE_EARNED:  icon = 'fa-medal';    bgColor = 'var(--secondary)'; break;
                }

                const item = document.createElement('div');
                item.className = `notification-item ${notif.read ? '' : 'unread'}`;
                item.dataset.id = notif.id;
                item.addEventListener('click', () => window.markNotificationRead(notif.id));

                const iconDiv = document.createElement('div');
                iconDiv.className = 'notification-icon';
                iconDiv.style.background = bgColor;
                const iconEl = document.createElement('i');
                iconEl.className = `fas ${icon}`;
                iconDiv.appendChild(iconEl);

                const contentDiv = document.createElement('div');
                contentDiv.className = 'notification-content';
                const titleEl = document.createElement('div');
                titleEl.className = 'notification-title';
                titleEl.textContent = notif.title;
                const msgEl = document.createElement('div');
                msgEl.className = 'notification-message';
                msgEl.textContent = notif.message;
                const timeEl = document.createElement('div');
                timeEl.className = 'notification-time';
                timeEl.textContent = notif.createdAtLocal;
                contentDiv.appendChild(titleEl);
                contentDiv.appendChild(msgEl);
                contentDiv.appendChild(timeEl);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'notification-delete';
                const deleteIcon = document.createElement('i');
                deleteIcon.className = 'fas fa-times';
                deleteBtn.appendChild(deleteIcon);
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.deleteNotification(notif.id);
                });

                item.appendChild(iconDiv);
                item.appendChild(contentDiv);
                item.appendChild(deleteBtn);
                container.appendChild(item);
            });
        } else {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><br>لا توجد إشعارات</div>';
        }
        
        // تحديث العداد
        await updateNotificationBadge(window.currentUser.uid);
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
};

// تحديد قراءة الإشعار
window.markNotificationRead = async function(notificationId) {
    if (!window.currentUser) return;
    
    try {
        await window.update(window.ref(window.db, `notifications/${window.currentUser.uid}/${notificationId}`), {
            read: true
        });
        
        // حدث واجهة المستخدم
        const item = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (item) {
            item.classList.remove('unread');
        }
        
        await updateNotificationBadge(window.currentUser.uid);
        
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};

// حذف إشعار
window.deleteNotification = async function(notificationId) {
    if (!window.currentUser || !confirm('هل تريد حذف هذا الإشعار؟')) return;
    
    try {
        await window.remove(window.ref(window.db, `notifications/${window.currentUser.uid}/${notificationId}`));
        
        // حدث واجهة المستخدم
        const item = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (item) {
            item.style.animation = 'fadeOut 0.3s';
            setTimeout(() => item.remove(), 300);
        }
        
        await updateNotificationBadge(window.currentUser.uid);
        
        // لو مفيش إشعارات، اعرض رسالة empty
        const container = document.getElementById('notificationsList');
        if (container && container.children.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><br>لا توجد إشعارات</div>';
        }
        
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
};

// حذف كل الإشعارات
window.clearAllNotifications = async function() {
    if (!window.currentUser || !confirm('هل تريد حذف كل الإشعارات؟')) return;
    
    try {
        await window.remove(window.ref(window.db, `notifications/${window.currentUser.uid}`));
        
        const container = document.getElementById('notificationsList');
        if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><br>لا توجد إشعارات</div>';
        }
        
        await updateNotificationBadge(window.currentUser.uid);
        window.showToast('✅ تم حذف كل الإشعارات');
        
    } catch (error) {
        console.error('Error clearing notifications:', error);
    }
};

// فتح/غلق لوحة الإشعارات
window.toggleNotificationsPanel = function() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        if (panel.style.display === 'flex') {
            panel.style.display = 'none';
        } else {
            panel.style.display = 'flex';
            window.loadNotifications();
        }
    }
};

// إغلاق لوحة الإشعارات
window.closeNotificationsPanel = function() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        panel.style.display = 'none';
    }
};

// ================ دوال مساعدة للإشعارات التلقائية ================

// إشعار عند إضافة فيديو جديد
window.notifyNewVideo = async function(courseId, courseName, videoTitle, videoId) {
    try {
        // جلب كل المشتركين في هذا الكورس
        const studentsSnap = await window.get(window.child(window.dbRef, 'students'));
        if (!studentsSnap.exists()) return;
        
        studentsSnap.forEach(student => {
            const studentData = student.val();
            if (studentData.subscriptions && studentData.subscriptions[courseId]) {
                window.createNotification(student.key, NOTIFICATION_TYPES.NEW_VIDEO, {
                    courseId,
                    courseName,
                    videoTitle,
                    videoId
                });
            }
        });
        
    } catch (error) {
        console.error('Error sending new video notifications:', error);
    }
};

// إشعار عند إضافة امتحان جديد
window.notifyNewExam = async function(courseId, courseName, examName, examId) {
    try {
        const studentsSnap = await window.get(window.child(window.dbRef, 'students'));
        if (!studentsSnap.exists()) return;
        
        studentsSnap.forEach(student => {
            const studentData = student.val();
            if (studentData.subscriptions && studentData.subscriptions[courseId]) {
                window.createNotification(student.key, NOTIFICATION_TYPES.NEW_EXAM, {
                    courseId,
                    courseName,
                    examName,
                    examId
                });
            }
        });
        
    } catch (error) {
        console.error('Error sending new exam notifications:', error);
    }
};

// إشعار عند الحصول على درجة كاملة
window.notifyPerfectScore = async function(userId, examName, score, total) {
    await window.createNotification(userId, NOTIFICATION_TYPES.PERFECT_SCORE, {
        examName,
        score,
        total
    });
};

// إشعار عند الحصول على شارة
window.notifyBadgeEarned = async function(userId, badgeName, points) {
    await window.createNotification(userId, NOTIFICATION_TYPES.BADGE_EARNED, {
        badgeName,
        points
    });
};

// ================ إضافة أيقونة الإشعارات في الهيدر ================
function addNotificationIconToHeader() {
    const headerControls = document.querySelector('.header-controls');
    if (!headerControls || document.getElementById('notificationBell')) return;

    // ✅ إصلاح: DOM API بدلاً من insertAdjacentHTML مع onclick inline
    const bell = document.createElement('div');
    bell.className = 'notification-bell';
    bell.addEventListener('click', window.toggleNotificationsPanel);

    const bellIcon = document.createElement('i');
    bellIcon.className = 'fas fa-bell';

    const badge = document.createElement('span');
    badge.id = 'notificationBadge';
    badge.className = 'notification-badge';
    badge.style.display = 'none';
    badge.textContent = '0';

    bell.appendChild(bellIcon);
    bell.appendChild(badge);
    headerControls.prepend(bell);
}

// ================ إضافة لوحة الإشعارات ================
function addNotificationsPanel() {
    if (document.getElementById('notificationsPanel')) return;

    // ✅ إصلاح: DOM API بدلاً من insertAdjacentHTML مع onclick inline
    const panel = document.createElement('div');
    panel.id = 'notificationsPanel';
    panel.className = 'notifications-panel';

    const header = document.createElement('div');
    header.className = 'notifications-header';

    const title = document.createElement('h3');
    const titleIcon = document.createElement('i');
    titleIcon.className = 'fas fa-bell';
    title.appendChild(titleIcon);
    title.appendChild(document.createTextNode(' الإشعارات'));

    const btnsDiv = document.createElement('div');

    const clearBtn = document.createElement('button');
    clearBtn.className = 'notifications-clear-btn';
    clearBtn.title = 'حذف الكل';
    clearBtn.addEventListener('click', window.clearAllNotifications);
    const clearIcon = document.createElement('i');
    clearIcon.className = 'fas fa-trash';
    clearBtn.appendChild(clearIcon);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'notifications-close-btn';
    closeBtn.addEventListener('click', window.closeNotificationsPanel);
    const closeIcon = document.createElement('i');
    closeIcon.className = 'fas fa-times';
    closeBtn.appendChild(closeIcon);

    btnsDiv.appendChild(clearBtn);
    btnsDiv.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(btnsDiv);

    const list = document.createElement('div');
    list.className = 'notifications-list';
    list.id = 'notificationsList';
    list.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><br>جاري التحميل...</div>';

    panel.appendChild(header);
    panel.appendChild(list);
    document.body.appendChild(panel);
}
