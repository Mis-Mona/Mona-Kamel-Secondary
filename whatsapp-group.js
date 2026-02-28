// whatsapp-group.js
// عرض رابط مجموعة الواتساب للكورس (للمشتركين فقط)
// ملاحظة: waitForFirebase موجودة في utils.js

window.displayWhatsappGroup = async function(courseId) {
    const container = document.getElementById('whatsappGroupContainer');
    if (!container) return;

    // التحقق من تسجيل الدخول أولاً
    if (!window.currentUser) {
        container.innerHTML = '';
        return;
    }

    try {
        // التحقق من الاشتراك في الكورس
        const subSnap = await window.get(window.child(window.dbRef, `students/${window.currentUser.uid}/subscriptions/${courseId}`));
        if (!subSnap.exists()) {
            container.innerHTML = '';
            return;
        }
        const snap = await window.get(window.child(window.dbRef, `folders/${courseId}/whatsappGroupLink`));
        if (snap.exists() && snap.val()) {
            const rawLink = snap.val();
            // التحقق من أن الرابط آمن (https أو http فقط)
            let safeLink = '';
            try {
                const parsed = new URL(rawLink);
                if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
                    safeLink = parsed.href;
                }
            } catch (e) {
                console.warn('Invalid WhatsApp group URL:', rawLink);
            }

            if (!safeLink) {
                container.innerHTML = '';
                return;
            }

            const linkEl = document.createElement('a');
            linkEl.href = safeLink;
            linkEl.target = '_blank';
            linkEl.rel = 'noopener noreferrer';
            linkEl.className = 'btn btn-success';
            linkEl.style.cssText = 'background: #25d366; color: white; padding: 10px 20px; border-radius: 50px; text-decoration: none; display: inline-block; margin-top: 10px;';
            linkEl.innerHTML = '<i class="fab fa-whatsapp"></i> انضمام للمجموعة';

            const card = document.createElement('div');
            card.className = 'whatsapp-group-card';
            card.innerHTML = '<i class="fab fa-whatsapp"></i><h3>📱 مجموعة واتساب الكورس</h3><p>انضم للمجموعة للمناقشة والاستفسار مع الزملاء</p>';
            card.appendChild(linkEl);

            container.innerHTML = '';
            container.appendChild(card);
        } else {
            container.innerHTML = ''; // لا يوجد رابط
        }
    } catch (error) {
        console.error('Error loading WhatsApp group link:', error);
        container.innerHTML = '';
    }
};