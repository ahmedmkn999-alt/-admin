// ==========================================
// script-init.js — Firebase + التبويبات + الإعداد
// ==========================================

var db = null;
var globalGroups = [];
var globalUsers = [];

const firebaseConfig = {
    apiKey: "AIzaSyBZMnIJ_IOqeAfXqFt-m4tM1Lvo0tUDnk8",
    projectId: "ramadan-87817",
    appId: "1:343525703258:web:6776b4857425df8bcca263"
};

window.addEventListener('DOMContentLoaded', () => {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();

    const statusEl = document.getElementById('conn-status');
    if (statusEl) {
        db.collection("settings").doc("global_status").get()
            .then(() => { statusEl.innerHTML = "متصل بنجاح 🟢"; statusEl.style.color = "#10b981"; })
            .catch(() => { statusEl.innerHTML = "خطأ في الاتصال 🔴"; statusEl.style.color = "#ef4444"; });
    }

    setupDays();
    setupQuestions();
    startListening();
    showTab('tab-room');
});

function showTab(tabId, btnEl) {
    document.querySelectorAll('.tab-content').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    const target = document.getElementById(tabId);
    if (target) { target.style.display = 'block'; target.classList.add('active'); }

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = btnEl || (event && event.currentTarget);
    if (activeBtn) activeBtn.classList.add('active');

    if (tabId === 'tab-global')      calculateGlobalRanking();
    if (tabId === 'tab-final')       renderFinalList();
    if (tabId === 'tab-manage-quiz') loadQuizList();
}

function setupDays() {
    let options = "";
    for (let i = 1; i <= 30; i++) options += `<option value="${i}">اليوم ${i}</option>`;
    ['q-day', 'pub-day', 'mq-day'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = options;
    });
}

function setupQuestions() {
    const area = document.getElementById('q-area');
    if (!area) return;
    let html = "";
    for (let i = 1; i <= 15; i++) {
        html += `
        <div class="q-block" style="background:rgba(255,255,255,0.03);border:1px solid #374151;border-radius:16px;padding:16px;margin-bottom:12px;">
            <span style="color:#eab308;font-size:11px;font-weight:900;">سؤال ${i}</span>
            <textarea class="qt" style="width:100%;padding:8px;background:transparent;border:none;border-bottom:1px solid #374151;margin-bottom:10px;color:white;font-size:13px;resize:none;height:40px;font-family:inherit;" placeholder="نص السؤال..."></textarea>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                <input class="o1" style="padding:8px;background:rgba(0,0,0,0.3);border:1px solid #374151;border-radius:8px;color:white;font-size:12px;" placeholder="خيار 1">
                <input class="o2" style="padding:8px;background:rgba(0,0,0,0.3);border:1px solid #374151;border-radius:8px;color:white;font-size:12px;" placeholder="خيار 2">
                <input class="o3" style="padding:8px;background:rgba(0,0,0,0.3);border:1px solid #374151;border-radius:8px;color:white;font-size:12px;" placeholder="خيار 3">
                <input class="o4" style="padding:8px;background:rgba(0,0,0,0.3);border:1px solid #374151;border-radius:8px;color:white;font-size:12px;" placeholder="خيار 4">
            </div>
            <select class="ca" style="width:100%;padding:8px;background:#111827;color:#4ade80;border:1px solid #374151;border-radius:8px;font-size:12px;">
                <option value="0">✅ الإجابة الصح: خيار 1</option>
                <option value="1">✅ الإجابة الصح: خيار 2</option>
                <option value="2">✅ الإجابة الصح: خيار 3</option>
                <option value="3">✅ الإجابة الصح: خيار 4</option>
            </select>
        </div>`;
    }
    area.innerHTML = html;
}
