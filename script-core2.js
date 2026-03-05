// ==========================================
// script-groups.js — المجموعات + حفظ الأسئلة
// يعتمد على: db, globalGroups من script-init.js
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
            renderGroups(); populateGroupDropdown();
        }).catch(err => alert("خطأ: " + err.message));
}

function renderGroups() {
    const list = document.getElementById('grp-list');
    if (!list) return;
    if (globalGroups.length === 0) {
        list.innerHTML = '<p style="color:#6b7280;text-align:center;font-size:13px;padding:16px;">لا توجد مجموعات بعد</p>';
        return;
    }
    list.innerHTML = globalGroups.map((g, i) => `
        <div style="background:rgba(255,255,255,0.03);border:1px solid #374151;border-radius:16px;padding:16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div>
                <b style="color:#eab308;">${g.group}</b>
                <p style="font-size:10px;color:#6b7280;margin-top:2px;">${g.type === 'teams' ? 'تيمات: ' + (g.teams?.join(' vs ') || '') : 'فردي'}</p>
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="openEditGrp(${i})" style="background:rgba(30,58,138,0.5);color:#93c5fd;border:none;padding:4px 12px;border-radius:8px;font-size:12px;cursor:pointer;">تعديل</button>
                <button onclick="delGrp(${i})" style="background:rgba(127,29,29,0.5);color:#f87171;border:none;padding:4px 12px;border-radius:8px;font-size:12px;cursor:pointer;">حذف</button>
            </div>
        </div>`).join('');
}

function delGrp(i) {
    if (!confirm("حذف المجموعة؟")) return;
    globalGroups.splice(i, 1);
    db.collection("config").doc("groups_data").set({ list: globalGroups })
        .then(() => { renderGroups(); populateGroupDropdown(); });
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
        globalGroups[editingGrpIndex].teams = [
            document.getElementById('edit-t1').value.trim(),
            document.getElementById('edit-t2').value.trim()
        ];
    }
    db.collection("config").doc("groups_data").set({ list: globalGroups }).then(() => {
        alert("تم التعديل ✅");
        document.getElementById('edit-group-modal').style.display = 'none';
        renderGroups(); populateGroupDropdown();
    });
}

function populateGroupDropdown() {
    ['u-group', 'edit-u-group'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">اختر المجموعة</option>';
        globalGroups.forEach(g => sel.innerHTML += `<option value="${g.group}">${g.group}</option>`);
        sel.value = cur;
    });
}

function loadTeams() {
    const groupName = document.getElementById('u-group').value;
    const teamSel = document.getElementById('u-team');
    if (!teamSel) return;
    teamSel.innerHTML = '<option value="">اختر التيم</option>';
    const grp = globalGroups.find(g => g.group === groupName);
    if (grp?.type === 'teams') grp.teams?.forEach(t => teamSel.innerHTML += `<option value="${t}">${t}</option>`);
}

function loadEditUserTeams() {
    const groupName = document.getElementById('edit-u-group').value;
    const teamSel = document.getElementById('edit-u-team');
    if (!teamSel) return;
    teamSel.innerHTML = '<option value="">اختر التيم</option>';
    const grp = globalGroups.find(g => g.group === groupName);
    if (grp?.type === 'teams') grp.teams?.forEach(t => teamSel.innerHTML += `<option value="${t}">${t}</option>`);
}

// ── حفظ واستدعاء الأسئلة ──

function loadQ() {
    const day     = document.getElementById('q-day').value;
    const version = document.getElementById('q-var').value;

    db.collection("quizzes_pool").doc("day_" + day).get().then(doc => {
        if (!doc.exists) return alert("لا يوجد يوم بهذا الرقم في قاعدة البيانات");
        const raw = doc.data();
        let qs = null;
        if (raw.variations && raw.variations[version]) {
            qs = raw.variations[version].questions;
        }
        if (!qs) return alert("لا توجد بيانات لهذه النسخة");

        const blocks = document.querySelectorAll('.q-block');
        qs.forEach((q, i) => {
            if (!blocks[i]) return;
            blocks[i].querySelector('.qt').value = q.q || '';
            blocks[i].querySelector('.o1').value = q.options?.[0] || '';
            blocks[i].querySelector('.o2').value = q.options?.[1] || '';
            blocks[i].querySelector('.o3').value = q.options?.[2] || '';
            blocks[i].querySelector('.o4').value = q.options?.[3] || '';
            blocks[i].querySelector('.ca').value = q.correctIndex ?? 0;
        });
        alert("تم استدعاء " + qs.length + " سؤال ✅");
    }).catch(err => alert("خطأ: " + err.message));
}

function saveQ() {
    const day     = document.getElementById('q-day').value;
    const version = document.getElementById('q-var').value;
    const blocks  = document.querySelectorAll('.q-block');
    let allQuestions = [];

    blocks.forEach(b => {
        const text = b.querySelector('.qt').value.trim();
        if (!text) return;
        allQuestions.push({
            q: text,
            options: [
                b.querySelector('.o1').value.trim(),
                b.querySelector('.o2').value.trim(),
                b.querySelector('.o3').value.trim(),
                b.querySelector('.o4').value.trim()
            ],
            correctIndex: parseInt(b.querySelector('.ca').value)
        });
    });

    if (allQuestions.length === 0) return alert("لا توجد أسئلة للحفظ!");

    const btn = document.querySelector('[onclick="saveQ()"]');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...'; }

    const docRef = db.collection("quizzes_pool").doc("day_" + day);
    docRef.get().then(doc => {
        let variations = doc.exists ? (doc.data().variations || {}) : {};
        variations[version] = { questions: allQuestions };
        return docRef.set({
            variations: variations,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            dayNumber: parseInt(day)
        }, { merge: true });
    }).then(() => {
        if (btn) { btn.disabled = false; btn.innerHTML = '💾 حفظ نسخة الأسئلة'; }
        alert("🚀 تم الحفظ!\nاليوم " + day + " - نسخة " + (parseInt(version)+1) + " (" + allQuestions.length + " سؤال)");
    }).catch(err => {
        if (btn) { btn.disabled = false; btn.innerHTML = '💾 حفظ نسخة الأسئلة'; }
        alert("خطأ: " + err.message);
    });
}
