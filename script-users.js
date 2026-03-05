// ==========================================
// script-users.js — الجزء الثاني
// المتسابقين، الدور الأخير، الترتيب، الخزنة، الرسائل، الخروج
// + فيتشر إعادة اللعب (Reset جولة أو كل النقاط)
// ==========================================

// ══════════════════════════════════════════
// 1. الاستماع لقاعدة البيانات
// ══════════════════════════════════════════
function startListening() {
    db.collection("config").doc("groups_data").onSnapshot(s => {
        globalGroups = s.exists ? (s.data().list || []) : [];
        renderGroups();
        populateGroupDropdown();
    });

    db.collection("users").onSnapshot(s => {
        globalUsers = [];
        s.forEach(d => globalUsers.push({ id: d.id, ...d.data() }));
        renderUsers();
        calculateGlobalRanking();
    });
}

// ══════════════════════════════════════════
// 2. المتسابقين
// ══════════════════════════════════════════
var currentEditUserId = null;

function addUsr() {
    const name  = document.getElementById('u-name').value.trim();
    const group = document.getElementById('u-group').value;
    const team  = document.getElementById('u-team').value;
    if (!name)  return alert("اكتب اسم اللاعب!");
    if (!group) return alert("اختر المجموعة!");

    const pass = Math.random().toString(36).slice(-6).toUpperCase();

    db.collection("users").add({
        name, group, team: team || '',
        score: 0, password: pass,
        powerups: { freeze: 0, fifty50: 0 },
        eliminated: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(docRef => {
        localStorage.setItem('lastCreatedUser', JSON.stringify({ id: docRef.id, name, group, team: team||'', password: pass }));
        document.getElementById('u-name').value = '';
        document.getElementById('u-group').value = '';
        document.getElementById('u-team').innerHTML = `<option value="">اختر التيم</option>`;

        const modal = document.getElementById('copy-modal');
        if (modal) {
            modal.style.display = 'flex';
            const cpBtn = document.getElementById('cp-btn');
            if (cpBtn) cpBtn.onclick = () => {
                navigator.clipboard.writeText(`الاسم: ${name}\nكود الدخول: ${pass}`)
                    .then(() => alert("تم النسخ ✅"))
                    .catch(() => alert(`كود الدخول: ${pass}`));
            };
        } else {
            alert(`تم إنشاء الحساب!\nالاسم: ${name}\nكود الدخول: ${pass}`);
        }
    }).catch(err => alert("خطأ: " + err.message));
}

function renderUsers() {
    const uL = document.getElementById('usr-list');
    if (!uL) return;
    const sorted = [...globalUsers].sort((a,b) => (b.score||0)-(a.score||0));
    uL.innerHTML = sorted.map(u => `
        <tr style="border-bottom:1px solid #1f2937;">
            <td style="padding:12px;font-size:12px;font-weight:bold;">
                ${u.name}<br>
                <span style="color:#6b7280;font-size:10px;">${u.group||''}${u.team?' / '+u.team:''}</span>
            </td>
            <td style="text-align:center;font-weight:900;color:#eab308;">${u.score||0}</td>
            <td style="padding:8px;">
                <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;">
                    <button onclick="edSc('${u.id}')" style="background:#1d4ed8;color:white;border:none;padding:4px 8px;border-radius:6px;font-size:10px;cursor:pointer;">نقاط</button>
                    <button onclick="openEditUser('${u.id}')" style="background:#92400e;color:#fbbf24;border:none;padding:4px 8px;border-radius:6px;font-size:10px;cursor:pointer;">تعديل</button>
                    <button onclick="openProfile('${u.id}')" style="background:#4c1d95;color:#c4b5fd;border:none;padding:4px 8px;border-radius:6px;font-size:10px;cursor:pointer;">سجل</button>
                    <button onclick="openReplay('${u.id}')" style="background:#065f46;color:#34d399;border:none;padding:4px 8px;border-radius:6px;font-size:10px;cursor:pointer;">🔄 إعادة</button>
                    <button onclick="delUsr('${u.id}')" style="background:#7f1d1d;color:#f87171;border:none;padding:4px 8px;border-radius:6px;font-size:10px;cursor:pointer;">حذف</button>
                </div>
            </td>
        </tr>`).join('');
}

function edSc(id) {
    const val = prompt("تعديل النقاط (مثال: 10 أو -10):", "0");
    if (val !== null && !isNaN(parseInt(val))) {
        db.collection("users").doc(id).update({
            score: firebase.firestore.FieldValue.increment(parseInt(val))
        }).catch(err => alert("خطأ: " + err.message));
    }
}

function delUsr(id) {
    if (!confirm("حذف المتسابق نهائياً؟")) return;
    db.collection("users").doc(id).delete().catch(err => alert("خطأ: " + err.message));
}

function openProfile(id) {
    const u = globalUsers.find(x => x.id === id);
    if (!u) return;
    const modal = document.getElementById('user-profile-modal');
    if (!modal) return;

    document.getElementById('prof-name').innerText  = u.name  || '---';
    document.getElementById('prof-team').innerText  = (u.group||'') + (u.team?' / '+u.team:'');
    document.getElementById('prof-score').innerText = u.score || 0;

    const logsEl = document.getElementById('prof-logs');
    logsEl.innerHTML = `<p style="color:#6b7280;text-align:center;font-size:12px;">جاري التحميل...</p>`;
    modal.style.display = 'flex';

    db.collection("users").doc(id).collection("game_logs").orderBy("day").get()
        .then(snap => {
            if (snap.empty) { logsEl.innerHTML = `<p style="color:#6b7280;text-align:center;font-size:12px;">لا يوجد سجل بعد</p>`; return; }
            logsEl.innerHTML = '';
            snap.forEach(d => {
                const log = d.data();
                logsEl.innerHTML += `
                <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(31,41,55,0.5);border-radius:10px;padding:10px 14px;border:1px solid #374151;margin-bottom:6px;">
                    <span style="color:#d1d5db;font-size:12px;font-weight:bold;">الجولة ${log.day}</span>
                    <span style="color:#fbbf24;font-weight:900;">${log.score} نقطة</span>
                </div>`;
            });
        }).catch(() => { logsEl.innerHTML = `<p style="color:#ef4444;text-align:center;font-size:12px;">خطأ في التحميل</p>`; });
}

function openEditUser(id) {
    currentEditUserId = id;
    const u = globalUsers.find(x => x.id === id);
    if (!u) return;
    document.getElementById('edit-u-name').value  = u.name  || '';
    populateGroupDropdown();
    document.getElementById('edit-u-group').value = u.group || '';
    loadEditUserTeams();
    document.getElementById('edit-u-team').value  = u.team  || '';
    document.getElementById('edit-user-modal').style.display = 'flex';
}

function saveEditedUsr() {
    if (!currentEditUserId) return;
    const name  = document.getElementById('edit-u-name').value.trim();
    const group = document.getElementById('edit-u-group').value;
    const team  = document.getElementById('edit-u-team').value;
    if (!name) return alert("اكتب الاسم!");
    db.collection("users").doc(currentEditUserId).update({ name, group, team })
        .then(() => { alert("تم التحديث ✅"); document.getElementById('edit-user-modal').style.display = 'none'; })
        .catch(err => alert("خطأ: " + err.message));
}

// ══════════════════════════════════════════
// 3. فيتشر إعادة اللعب ✅ جديد
// ══════════════════════════════════════════
function openReplay(id) {
    const u = globalUsers.find(x => x.id === id);
    if (!u) return;
    const modal = document.getElementById('replay-modal');
    if (!modal) return;
    document.getElementById('replay-name').innerText = u.name;
    document.getElementById('replay-userid').value = id;

    // جيب الجولات اللي لعبها
    db.collection("users").doc(id).collection("game_logs").orderBy("day").get()
        .then(snap => {
            const sel = document.getElementById('replay-day-select');
            sel.innerHTML = `<option value="">اختر الجولة...</option>`;
            snap.forEach(d => {
                const log = d.data();
                sel.innerHTML += `<option value="${log.day}">الجولة ${log.day} (${log.score} نقطة)</option>`;
            });
        });
    modal.style.display = 'flex';
}

function replayRound() {
    const id  = document.getElementById('replay-userid').value;
    const day = document.getElementById('replay-day-select').value;
    if (!day) return alert("اختر الجولة أولاً!");
    if (!confirm(`هل تريد السماح للاعب بإعادة لعب الجولة ${day}؟\n(سيتم حذف سجل الجولة ونقاطها منه)`)) return;

    const u = globalUsers.find(x => x.id === id);
    if (!u) return;

    // نجيب نقاط الجولة دي من السجل
    db.collection("users").doc(id).collection("game_logs").doc("day_" + day).get()
        .then(logDoc => {
            const oldScore = logDoc.exists ? (logDoc.data().score || 0) : 0;

            // حذف سجل الجولة + خصم نقاطها من الإجمالي
            const batch = db.batch();
            batch.delete(db.collection("users").doc(id).collection("game_logs").doc("day_" + day));
            batch.update(db.collection("users").doc(id), {
                score: firebase.firestore.FieldValue.increment(-oldScore)
            });
            return batch.commit().then(() => oldScore);
        })
        .then(oldScore => {
            alert(`✅ تم!\nتم حذف سجل الجولة ${day} وخصم ${oldScore} نقطة.\nاللاعب يقدر يلعب الجولة دي تاني دلوقتي.`);
            document.getElementById('replay-modal').style.display = 'none';
        })
        .catch(err => alert("خطأ: " + err.message));
}

function resetAllScore(override = false) {
    const id = document.getElementById('replay-userid').value;
    const u  = globalUsers.find(x => x.id === id);
    if (!u)  return;
    if (!override && !confirm(`تصفير كل نقاط ${u.name} وإلغاء كل جولاته؟\nهيقدر يلعب كل الجولات من الأول!`)) return;

    // حذف كل game_logs + تصفير النقاط
    db.collection("users").doc(id).collection("game_logs").get()
        .then(snap => {
            const batch = db.batch();
            snap.forEach(d => batch.delete(d.ref));
            batch.update(db.collection("users").doc(id), { score: 0 });
            return batch.commit();
        })
        .then(() => {
            alert(`✅ تم تصفير ${u.name} بنجاح!\nيقدر دلوقتي يلعب كل الجولات من الأول.`);
            document.getElementById('replay-modal').style.display = 'none';
        })
        .catch(err => alert("خطأ: " + err.message));
}

// ══════════════════════════════════════════
// 4. الدور الأخير
// ══════════════════════════════════════════
function renderFinalList() {
    const tbody = document.getElementById('final-list');
    if (!tbody) return;
    const sorted = [...globalUsers].sort((a,b) => (b.score||0)-(a.score||0));
    tbody.innerHTML = sorted.map(u => `
        <tr style="border-bottom:1px solid #1f2937;">
            <td style="padding:10px;font-size:12px;font-weight:bold;">${u.name}</td>
            <td style="padding:10px;text-align:center;">
                <span style="padding:3px 10px;border-radius:99px;font-size:10px;font-weight:900;
                    background:${u.eliminated?'rgba(127,29,29,0.5)':'rgba(6,78,59,0.5)'};
                    color:${u.eliminated?'#f87171':'#4ade80'};">
                    ${u.eliminated ? 'مقصي ❌' : 'متأهل ✅'}
                </span>
            </td>
            <td style="padding:10px;text-align:center;font-weight:900;color:#eab308;">${u.score||0}</td>
            <td style="padding:10px;text-align:center;">
                <button onclick="toggleEliminate('${u.id}',${u.eliminated})"
                    style="background:${u.eliminated?'rgba(6,78,59,0.6)':'rgba(127,29,29,0.6)'};
                    color:${u.eliminated?'#4ade80':'#f87171'};
                    border:none;padding:4px 10px;border-radius:6px;font-size:10px;cursor:pointer;font-weight:bold;">
                    ${u.eliminated ? 'أعد ✅' : 'قصّي ❌'}
                </button>
            </td>
        </tr>`).join('');
}

function toggleEliminate(id, currentStatus) {
    db.collection("users").doc(id).update({ eliminated: !currentStatus })
        .catch(err => alert("خطأ: " + err.message));
}

// ══════════════════════════════════════════
// 5. الترتيب العام
// ══════════════════════════════════════════
function calculateGlobalRanking() {
    const container = document.getElementById('global-tables-container');
    if (!container) return;

    let groupsMap = {};
    globalUsers.forEach(u => {
        const g = u.group || 'بدون مجموعة';
        if (!groupsMap[g]) groupsMap[g] = [];
        groupsMap[g].push(u);
    });

    if (Object.keys(groupsMap).length === 0) {
        container.innerHTML = `<p style="color:#6b7280;text-align:center;padding:32px;">لا يوجد لاعبون بعد</p>`;
        return;
    }

    container.innerHTML = Object.entries(groupsMap).map(([gName, users]) => {
        const sorted = [...users].sort((a,b) => (b.score||0)-(a.score||0));
        const rows = sorted.map((u,i) => `
            <tr style="border-bottom:1px solid #1f2937;">
                <td style="padding:8px;color:#6b7280;font-size:11px;">${i+1}</td>
                <td style="padding:8px;font-size:11px;">${u.name}</td>
                <td style="padding:8px;color:#eab308;font-weight:bold;font-size:11px;">${u.score||0}</td>
            </tr>`).join('');
        return `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(234,179,8,0.2);border-radius:16px;padding:16px;margin-bottom:20px;">
            <h3 style="color:#eab308;font-weight:900;text-align:center;margin-bottom:12px;">${gName}</h3>
            <table style="width:100%;font-size:11px;border-collapse:collapse;">${rows}</table>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════════
// 6. الخزنة والرسائل
// ══════════════════════════════════════════
function setStatus(status) {
    const day = document.getElementById('pub-day').value;
    db.collection("settings").doc("global_status").set({
        currentDay: parseInt(day), status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        const labels = { soon:'قريباً ⏳', active:'مفعّل ▶️', closed:'مغلق 🔒' };
        alert(`تم تعيين اليوم ${day} على: ${labels[status]||status}`);
    }).catch(err => alert("خطأ: " + err.message));
}

function saveMessage(docId) {
    const content = document.getElementById(docId === 'champData' ? 'msg-champ' : 'msg-daily').value.trim();
    if (!content) return alert("اكتب الرسالة أولاً!");
    db.collection("messages").doc(docId).set({ text: content, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => alert("تم النشر ✅"))
        .catch(err => alert("خطأ: " + err.message));
}

// ══════════════════════════════════════════
// 7. الخروج
// ══════════════════════════════════════════
function logOut() {
    if (!confirm("هل تريد الخروج؟")) return;
    localStorage.removeItem('__adm_s');
    localStorage.removeItem('lastCreatedUser');
    sessionStorage.clear();
    window.location.replace('index.html');
}
