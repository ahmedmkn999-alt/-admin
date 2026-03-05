// ==========================================
// script-quiz-mgr.js — عرض وإدارة الكويزات
// يعتمد على: db من script-init.js
// ==========================================

function loadQuizList() {
    const dayEl = document.getElementById('mq-day');
    if (dayEl) loadQuizDay();
}

function loadQuizDay() {
    const day      = document.getElementById('mq-day').value;
    const loading  = document.getElementById('mq-loading');
    const empty    = document.getElementById('mq-empty');
    const versions = document.getElementById('mq-versions');

    loading.style.display = 'block';
    empty.style.display   = 'none';
    versions.innerHTML    = '';

    db.collection("quizzes_pool").doc("day_" + day).get().then(doc => {
        loading.style.display = 'none';

        if (!doc.exists) { empty.style.display = 'block'; return; }

        const raw        = doc.data();
        const variations = raw.variations;
        if (!variations || Object.keys(variations).length === 0) {
            empty.style.display = 'block'; return;
        }

        const vLabels = ['نسخة 1','نسخة 2','نسخة 3','نسخة 4'];
        const vColors = ['#eab308','#3b82f6','#22c55e','#a855f7'];
        const vBg     = ['rgba(234,179,8,0.1)','rgba(59,130,246,0.1)','rgba(34,197,94,0.1)','rgba(168,85,247,0.1)'];
        const vBorder = ['rgba(234,179,8,0.3)','rgba(59,130,246,0.3)','rgba(34,197,94,0.3)','rgba(168,85,247,0.3)'];

        Object.keys(variations).sort().forEach(k => {
            const qs     = variations[k]?.questions || [];
            const idx    = parseInt(k);
            const color  = vColors[idx]  || '#6b7280';
            const bg     = vBg[idx]      || 'rgba(107,114,128,0.1)';
            const border = vBorder[idx]  || 'rgba(107,114,128,0.3)';
            const label  = vLabels[idx]  || ('نسخة '+(idx+1));

            const preview = qs.slice(0,2).map((q,i) => `
                <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:8px 12px;font-size:11px;color:#9ca3af;margin-top:6px;border:1px solid #1f2937;">
                    <span style="color:#4b5563;">${i+1}. </span>${q.q||'---'}
                </div>`).join('');
            const more = qs.length > 2
                ? `<p style="font-size:10px;color:#4b5563;text-align:center;margin-top:6px;">... و ${qs.length-2} سؤال آخر</p>`
                : '';

            versions.innerHTML += `
            <div style="background:${bg};border:1px solid ${border};border-radius:16px;padding:16px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="background:rgba(0,0,0,0.4);color:${color};border:1px solid ${border};padding:3px 12px;border-radius:99px;font-size:12px;font-weight:900;">${label}</span>
                        <span style="color:#6b7280;font-size:11px;font-weight:bold;">${qs.length} سؤال</span>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button onclick="viewQuizVersion(${day},'${k}')" style="background:rgba(30,58,138,0.6);color:#93c5fd;border:1px solid rgba(59,130,246,0.4);padding:5px 10px;border-radius:8px;font-size:11px;cursor:pointer;font-weight:bold;">👁 عرض</button>
                        <button onclick="editQuizVersion(${day},'${k}')" style="background:rgba(120,53,15,0.6);color:#fbbf24;border:1px solid rgba(234,179,8,0.4);padding:5px 10px;border-radius:8px;font-size:11px;cursor:pointer;font-weight:bold;">✏️ تعديل</button>
                        <button onclick="deleteQuizVersion(${day},'${k}')" style="background:rgba(127,29,29,0.6);color:#f87171;border:1px solid rgba(239,68,68,0.4);padding:5px 10px;border-radius:8px;font-size:11px;cursor:pointer;font-weight:bold;">🗑</button>
                    </div>
                </div>
                ${preview}${more}
            </div>`;
        });

        if (raw.updatedAt) {
            try {
                const d = raw.updatedAt.toDate();
                versions.innerHTML += `<p style="font-size:10px;color:#374151;text-align:center;margin-top:8px;">🕐 آخر تحديث: ${d.toLocaleDateString('ar-EG')} ${d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}</p>`;
            } catch(e) {}
        }

    }).catch(err => {
        loading.style.display = 'none';
        alert("خطأ في التحميل: " + err.message);
    });
}

function viewQuizVersion(day, versionKey) {
    const labels = ['نسخة 1','نسخة 2','نسخة 3','نسخة 4'];
    document.getElementById('vq-title').textContent = `اليوم ${day} — ${labels[parseInt(versionKey)]||'نسخة'}`;
    document.getElementById('vq-content').innerHTML = '<div style="text-align:center;padding:30px;font-size:24px;">⏳</div>';
    document.getElementById('view-quiz-modal').style.display = 'flex';

    db.collection("quizzes_pool").doc("day_" + day).get().then(doc => {
        if (!doc.exists) return;
        const qs  = doc.data()?.variations?.[versionKey]?.questions || [];
        const abc = ['أ','ب','ج','د'];

        document.getElementById('vq-content').innerHTML = qs.length === 0
            ? '<p style="color:#6b7280;text-align:center;">لا توجد أسئلة</p>'
            : qs.map((q,i) => `
            <div style="background:rgba(0,0,0,0.4);border-radius:12px;padding:14px;border:1px solid #374151;margin-bottom:10px;">
                <p style="color:white;font-weight:900;font-size:13px;margin-bottom:10px;">
                    <span style="color:#eab308;margin-left:6px;">${i+1}.</span>${q.q}
                </p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                    ${(q.options||[]).map((opt,oi) => `
                    <div style="padding:7px 10px;border-radius:8px;font-size:11px;font-weight:bold;
                        background:${oi===q.correctIndex?'rgba(34,197,94,0.2)':'rgba(31,41,55,0.6)'};
                        border:1px solid ${oi===q.correctIndex?'rgba(34,197,94,0.5)':'#374151'};
                        color:${oi===q.correctIndex?'#4ade80':'#9ca3af'};">
                        ${abc[oi]}. ${opt}${oi===q.correctIndex?' ✓':''}
                    </div>`).join('')}
                </div>
            </div>`).join('');
    });
}

function editQuizVersion(day, versionKey) {
    document.getElementById('q-day').value = day;
    document.getElementById('q-var').value = versionKey;
    const btn = document.querySelector('[onclick*="tab-quizzes"]');
    showTab('tab-quizzes', btn);
    setTimeout(() => loadQ(), 300);
}

function deleteQuizVersion(day, versionKey) {
    const labels = ['نسخة 1','نسخة 2','نسخة 3','نسخة 4'];
    if (!confirm(`حذف ${labels[parseInt(versionKey)]||'النسخة'} من اليوم ${day}؟`)) return;
    const docRef = db.collection("quizzes_pool").doc("day_" + day);
    docRef.get().then(doc => {
        if (!doc.exists) return;
        let variations = doc.data().variations || {};
        delete variations[versionKey];
        return docRef.set({ variations: variations }, { merge: true });
    }).then(() => { alert("تم الحذف ✅"); loadQuizDay(); })
    .catch(err => alert("خطأ: " + err.message));
}

function deleteQuizDay() {
    const day = document.getElementById('mq-day').value;
    if (!confirm(`حذف كويز اليوم ${day} بالكامل؟`)) return;
    db.collection("quizzes_pool").doc("day_" + day).delete()
        .then(() => { alert(`تم حذف اليوم ${day} ✅`); loadQuizDay(); })
        .catch(err => alert("خطأ: " + err.message));
}
