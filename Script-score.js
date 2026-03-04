// ==========================================
// script-core.js
// الجزء الأول: الإعدادات، التبويبات، المجموعات، الأسئلة
// ==========================================

// ── المتغيرات العامة المشتركة بين الملفين ──
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

    // حالة الاتصال
    const statusEl = document.getElementById('conn-status');
    if (statusEl) {
        db.collection("settings").doc("global_status").get()
            .then(() => {
                statusEl.innerHTML = "متصل بنجاح 🟢";
                statusEl.style.color = "#10b981";
            })
            .catch(() => {
                statusEl.innerHTML = "خطأ في الاتصال 🔴";
                statusEl.style.color = "#ef4444";
            });
    }

    setupDays();
    setupQuestions();
    startListening();
    showTab('tab-room');
});

// ==========================================
// 1. نظام التبويبات
// ==========================================
function showTab(tabId, btnEl) {
    document.querySelectorAll('.tab-content').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });

    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = btnEl || (event && event.currentTarget);
    if (activeBtn) activeBtn.classList.add('active');

    if (tabId === 'tab-global') calculateGlobalRanking();
    if (tabId === 'tab-final') renderFinalList();
}

// ==========================================
// 2. إدارة المجموعات
// ==========================================
function toggleGroupInputs() {
    const type = document.getElementById('g-type').value;
    const area = document.getElementById('teams-input-area');
    if (area) area.style.display = (type === 'teams') ? 'grid' : 'none';
}

function toggleEditGroupInputs() {
    const type = document.getElementById('edit-g-type').value;
    const area = document.getElementById('edit-teams-input-area');
    if (area) area.style.display = (type === 'teams') ? 'grid' : 'none';
}

function saveGrp() {
    const name = document.getElementById('g-name').value.trim();
    const type = document.getElementById('g-type').value;
    if (!name) return alert("اكتب اسم المجموعة أولاً!");

    let newGroup = { group: name, type: type, teams: [] };
    if (type === 'teams') {
        const t1 = document.getElementById('t1').value.trim();
        const t2 = document.getElementById('t2').value.trim();
        if (!t1 || !t2) return alert("يجب كتابة أسماء التيمات");
        newGroup.teams = [t1, t2];
    }

    globalGroups.push(newGroup);
    db.collection("config").doc("groups_data").set({ list: globalGroups })
        .then(() => {
            alert("تمت إضافة المجموعة ✅");
            document.getElementById('g-name').value = "";
            if (document.getElementById('t1')) document.getElementById('t1').value = "";
            if (document.getElementById('t2')) document.getElementById('t2').value = "";
            renderGroups();
            populateGroupDropdown();
        })
        .catch(err => alert("خطأ في الحفظ: " + err.message));
}

function renderGroups() {
    const list = document.getElementById('grp-list');
    if (!list) return;
    list.innerHTML = "";
    if (globalGroups.length === 0) {
        list.innerHTML = `<p class="text-gray-500 text-center text-sm py-4">لا توجد مجموعات بعد</p>`;
        return;
    }
    globalGroups.forEach((g, i) => {
        list.innerHTML += `
        <div class="glass-panel p-4 rounded-2xl flex justify-between items-center mb-3 border border-gray-800">
            <div>
                <b class="text-yellow-500">${g.group}</b>
                <p class="text-[10px] text-gray-500">${g.type === 'teams' ? 'مباراة تيمات: ' + (g.teams?.join(' vs ') || '') : 'مجموعة فردية'}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="openEditGrp(${i})" class="bg-blue-900/50 text-blue-400 px-3 py-1 rounded-lg text-xs">تعديل</button>
                <button onclick="delGrp(${i})" class="bg-red-900/50 text-red-500 px-3 py-1 rounded-lg text-xs">حذف</button>
            </div>
        </div>`;
    });
}

function delGrp(i) {
    if (confirm("هل أنت متأكد من حذف المجموعة؟")) {
        globalGroups.splice(i, 1);
        db.collection("config").doc("groups_data").set({ list: globalGroups })
            .then(() => { renderGroups(); populateGroupDropdown(); });
    }
}

var editingGrpIndex = -1;

function openEditGrp(i) {
    editingGrpIndex = i;
    const g = globalGroups[i];
    document.getElementById('edit-g-name').value = g.group;
    document.getElementById('edit-g-type').value = g.type;
    if (g.type === 'teams' && g.teams?.length >= 2) {
        document.getElementById('edit-t1').value = g.teams[0];
        document.getElementById('edit-t2').value = g.teams[1];
        document.getElementById('edit-teams-input-area').style.display = 'grid';
    } else {
        document.getElementById('edit-teams-input-area').style.display = 'none';
    }
    document.getElementById('edit-group-modal').style.display = 'flex';
}

function saveEditedGrp() {
    if (editingGrpIndex < 0) return;
    const name = document.getElementById('edit-g-name').value.trim();
    const type = document.getElementById('edit-g-type').value;
    if (!name) return alert("اكتب اسم المجموعة!");
    globalGroups[editingGrpIndex] = { group: name, type: type, teams: [] };
    if (type === 'teams') {
        const t1 = document.getElementById('edit-t1').value.trim();
        const t2 = document.getElementById('edit-t2').value.trim();
        globalGroups[editingGrpIndex].teams = [t1, t2];
    }
    db.collection("config").doc("groups_data").set({ list: globalGroups }).then(() => {
        alert("تم التعديل ✅");
        document.getElementById('edit-group-modal').style.display = 'none';
        renderGroups();
        populateGroupDropdown();
    });
}

function populateGroupDropdown() {
    const sel = document.getElementById('u-group');
    if (!sel) return;
    sel.innerHTML = `<option value="">اختر المجموعة</option>`;
    globalGroups.forEach(g => {
        sel.innerHTML += `<option value="${g.group}">${g.group}</option>`;
    });
    const editSel = document.getElementById('edit-u-group');
    if (editSel) {
        editSel.innerHTML = `<option value="">اختر المجموعة</option>`;
        globalGroups.forEach(g => {
            editSel.innerHTML += `<option value="${g.group}">${g.group}</option>`;
        });
    }
}

function loadTeams() {
    const groupName = document.getElementById('u-group').value;
    const teamSel = document.getElementById('u-team');
    if (!teamSel) return;
    teamSel.innerHTML = `<option value="">اختر التيم</option>`;
    const grp = globalGroups.find(g => g.group === groupName);
    if (grp && grp.type === 'teams' && grp.teams?.length) {
        grp.teams.forEach(t => { teamSel.innerHTML += `<option value="${t}">${t}</option>`; });
    }
}

function loadEditUserTeams() {
    const groupName = document.getElementById('edit-u-group').value;
    const teamSel = document.getElementById('edit-u-team');
    if (!teamSel) return;
    teamSel.innerHTML = `<option value="">اختر التيم</option>`;
    const grp = globalGroups.find(g => g.group === groupName);
    if (grp && grp.type === 'teams' && grp.teams?.length) {
        grp.teams.forEach(t => { teamSel.innerHTML += `<option value="${t}">${t}</option>`; });
    }
}

// ==========================================
// 3. إدارة الأسئلة
// ==========================================
function loadQ() {
    const day = document.getElementById('q-day').value;
    const version = document.getElementById('q-var').value;

    db.collection("quizzes_pool").doc(`day_${day}`).get().then(doc => {
        if (doc.exists) {
            const data = doc.data().variations?.[version]?.questions;
            if (data) {
                const blocks = document.querySelectorAll('.q-block');
                data.forEach((q, i) => {
                    if (blocks[i]) {
                        blocks[i].querySelector('.qt').value = q.q;
                        blocks[i].querySelector('.o1').value = q.options[0] || '';
                        blocks[i].querySelector('.o2').value = q.options[1] || '';
                        blocks[i].querySelector('.o3').value = q.options[2] || '';
                        blocks[i].querySelector('.o4').value = q.options[3] || '';
                        blocks[i].querySelector('.ca').value = q.correctIndex;
                    }
                });
                alert("تم استدعاء الأسئلة بنجاح ✅");
            } else { alert("لا توجد بيانات لهذه النسخة"); }
        } else { alert("لا يوجد يوم بهذا الرقم في قاعدة البيانات"); }
    }).catch(err => alert("خطأ: " + err.message));
}

function saveQ() {
    const day = document.getElementById('q-day').value;
    const version = document.getElementById('q-var').value;
    const blocks = document.querySelectorAll('.q-block');
    let allQuestions = [];

    blocks.forEach(b => {
        const text = b.querySelector('.qt').value.trim();
        if (text) {
            allQuestions.push({
                q: text,
                options: [
                    b.querySelector('.o1').value,
                    b.querySelector('.o2').value,
                    b.querySelector('.o3').value,
                    b.querySelector('.o4').value
                ],
                correctIndex: parseInt(b.querySelector('.ca').value)
            });
        }
    });

    if (allQuestions.length === 0) return alert("لا توجد أسئلة للحفظ!");

    let updateData = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    updateData[`variations.${version}`] = { questions: allQuestions };
    updateData[`variations.0`] = { questions: allQuestions };

    db.collection("quizzes_pool").doc(`day_${day}`).set(updateData, { merge: true })
        .then(() => alert("🚀 تم الحفظ والنشر بنجاح! اليوم " + day + " - نسخة " + (parseInt(version) + 1)))
        .catch(err => alert("خطأ في الحفظ: " + err.message));
}

// ==========================================
// 4. وظائف الإعداد المساعدة
// ==========================================
function setupQuestions() {
    const area = document.getElementById('q-area');
    if (!area) return;
    let html = "";
    for (let i = 1; i <= 15; i++) {
        html += `
        <div class="q-block glass-panel p-4 rounded-2xl mb-4 border border-gray-800">
            <span class="text-yellow-500 text-[10px] font-bold">سؤال ${i}</span>
            <textarea class="qt w-full p-2 bg-transparent border-b border-gray-700 mb-3 text-sm h-10" placeholder="نص السؤال..."></textarea>
            <div class="grid grid-cols-2 gap-2">
                <input class="o1 p-2 bg-black/30 rounded text-xs" placeholder="خيار 1">
                <input class="o2 p-2 bg-black/30 rounded text-xs" placeholder="خيار 2">
                <input class="o3 p-2 bg-black/30 rounded text-xs" placeholder="خيار 3">
                <input class="o4 p-2 bg-black/30 rounded text-xs" placeholder="خيار 4">
            </div>
            <select class="ca w-full p-2 mt-2 bg-gray-900 text-green-400 text-xs rounded-lg">
                <option value="0">الإجابة: 1</option>
                <option value="1">الإجابة: 2</option>
                <option value="2">الإجابة: 3</option>
                <option value="3">الإجابة: 4</option>
            </select>
        </div>`;
    }
    area.innerHTML = html;
}

function setupDays() {
    let options = "";
    for (let i = 1; i <= 30; i++) options += `<option value="${i}">اليوم ${i}</option>`;
    ['q-day', 'pub-day'].forEach(id => {
        if (document.getElementById(id)) document.getElementById(id).innerHTML = options;
    });
}
