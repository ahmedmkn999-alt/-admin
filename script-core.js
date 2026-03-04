// ==========================================
// script-users.js
// الجزء الثاني: المتسابقين، الدور الأخير، الترتيب، الخزنة، الرسائل، الخروج
// ملاحظة: يعتمد على المتغيرات db / globalGroups / globalUsers من script-core.js
// ==========================================

// ==========================================
// 1. الاستماع لقاعدة البيانات (Real-time)
// ==========================================
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

// ==========================================
// 2. إدارة المتسابقين
// ==========================================
var currentEditUserId = null;

function addUsr() {
    const name = document.getElementById('u-name').value.trim();
    const group = document.getElementById('u-group').value;
    const team = document.getElementById('u-team').value;
    if (!name) return alert("اكتب اسم اللاعب!");
    if (!group) return alert("اختر المجموعة!");

    const pass = Math.random().toString(36).slice(-6).toUpperCase();

    db.collection("users").add({
        name: name,
        group: group,
        team: team || '',
        score: 0,
        password: pass,
        powerups: { freeze: 0, fifty50: 0 },
        eliminated: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(docRef => {
        const userData = { id: docRef.id, name, group, team: team || '', password: pass };
        localStorage.setItem('lastCreatedUser', JSON.stringify(userData));
        document.getElementById('u-name').value = "";
        document.getElementById('u-group').value = "";
        document.getElementById('u-team').innerHTML = `<option value="">اختر التيم</option>`;

        const modal = document.getElementById('copy-modal');
        if (modal) {
            modal.style.display = 'flex';
            const cpBtn = document.getElementById('cp-btn');
            if (cpBtn) {
                cpBtn.onclick = () => {
                    navigator.clipboard.writeText(`الاسم: ${name}\nكود الدخول: ${pass}`)
                        .then(() => alert("تم النسخ ✅"))
                        .catch(() => alert(`كود الدخول: ${pass}`));
                };
            }
        } else {
            alert(`تم إنشاء الحساب!\nالاسم: ${name}\nكود الدخول: ${pass}`);
        }
    }).catch(err => alert("خطأ: " + err.message));
}

function renderUsers() {
    const uL = document.getElementById('usr-list');
    if (!uL) return;
    uL.innerHTML = globalUsers.sort((a, b) => (b.score || 0) - (a.score || 0)).map(u => `
        <tr class="border-b border-gray-800">
            <td class="p-4 text-xs font-bold">${u.name}<br>
                <span class="text-gray-500">${u.group || ''}${u.team ? ' / ' + u.team : ''}</span>
            </td>
            <td class="text-center font-bold text-yellow-500">${u.score || 0}</td>
            <td class="p-4 flex gap-1 justify-center flex-wrap">
                <button onclick="edSc('${u.id}')" class="bg-blue-600 p-1 rounded text-[10px]">نقاط</button>
                <button onclick="openEditUser('${u.id}')" class="bg-yellow-700 p-1 rounded text-[10px]">تعديل</button>
                <button onclick="openProfile('${u.id}')" class="bg-purple-600 p-1 rounded text-[10px]">سجل</button>
                <button onclick="delUsr('${u.id}')" class="bg-red-600 p-1 rounded text-[10px]">حذف</button>
            </td>
        </tr>`).join('');
}

function edSc(id) {
    let val = prompt("تعديل النقاط (أضف 10 أو -10):", "0");
    if (val !== null && !isNaN(parseInt(val))) {
        db.collection("users").doc(id).update({
            score: firebase.firestore.FieldValue.increment(parseInt(val))
        }).catch(err => alert("خطأ: " + err.message));
    }
}

function delUsr(id) {
    if (confirm("حذف المتسابق نهائياً؟")) {
        db.collection("users").doc(id).delete()
            .catch(err => alert("خطأ: " + err.message));
    }
}

function openProfile(id) {
    const u = globalUsers.find(x => x.id === id);
    if (!u) return;

    const modal = document.getElementById('user-profile-modal');
    if (!modal) return;

    document.getElementById('prof-name').innerText = u.name || '---';
    document.getElementById('prof-team').innerText = (u.group || '') + (u.team ? ' / ' + u.team : '');
    document.getElementById('prof-score').innerText = u.score || 0;

    const logsEl = document.getElementById('prof-logs');
    if (logsEl) {
        logsEl.innerHTML = `<p class="text-gray-500 text-xs text-center animate-pulse">جاري التحميل...</p>`;
        db.collection("users").doc(id).collection("game_logs").orderBy("day").get()
            .then(snap => {
                if (snap.empty) {
                    logsEl.innerHTML = `<p class="text-gray-500 text-xs text-center">لا يوجد سجل ألعاب بعد</p>`;
                    return;
                }
                logsEl.innerHTML = '';
                snap.forEach(d => {
                    const log = d.data();
                    logsEl.innerHTML += `
                    <div class="flex justify-between items-center bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                        <span class="text-gray-300 text-xs font-bold">الجولة ${log.day}</span>
                        <span class="text-yellow-400 font-black">${log.score} نقطة</span>
                    </div>`;
                });
            })
            .catch(() => {
                logsEl.innerHTML = `<p class="text-red-500 text-xs text-center">خطأ في تحميل السجل</p>`;
            });
    }
    modal.style.display = 'flex';
}

function openEditUser(id) {
    currentEditUserId = id;
    const u = globalUsers.find(x => x.id === id);
    if (!u) return;
    document.getElementById('edit-u-name').value = u.name || '';
    populateGroupDropdown();
    document.getElementById('edit-u-group').value = u.group || '';
    loadEditUserTeams();
    document.getElementById('edit-u-team').value = u.team || '';
    document.getElementById('edit-user-modal').style.display = 'flex';
}

function saveEditedUsr() {
    if (!currentEditUserId) return;
    const name = document.getElementById('edit-u-name').value.trim();
    const group = document.getElementById('edit-u-group').value;
    const team = document.getElementById('edit-u-team').value;
    if (!name) return alert("اكتب الاسم!");
    db.collection("users").doc(currentEditUserId).update({ name, group, team })
        .then(() => {
            alert("تم التحديث ✅");
            document.getElementById('edit-user-modal').style.display = 'none';
        }).catch(err => alert("خطأ: " + err.message));
}

// ==========================================
// 3. الدور الأخير
// ==========================================
function renderFinalList() {
    const tbody = document.getElementById('final-list');
    if (!tbody) return;
    tbody.innerHTML = globalUsers
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .map(u => `
        <tr class="border-b border-gray-800">
            <td class="p-3 text-xs font-bold">${u.name}</td>
            <td class="p-3 text-center">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold ${u.eliminated ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}">
                    ${u.eliminated ? 'مقصي ❌' : 'متأهل ✅'}
                </span>
            </td>
            <td class="p-3 text-center font-bold text-yellow-500">${u.score || 0}</td>
            <td class="p-3 flex gap-1 justify-center">
                <button onclick="toggleEliminate('${u.id}', ${u.eliminated})"
                    class="${u.eliminated ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'} px-2 py-1 rounded text-[10px] font-bold">
                    ${u.eliminated ? 'أعد ✅' : 'قصّي ❌'}
                </button>
            </td>
        </tr>`).join('');
}

function toggleEliminate(id, currentStatus) {
    db.collection("users").doc(id).update({ eliminated: !currentStatus })
        .catch(err => alert("خطأ: " + err.message));
}

// ==========================================
// 4. الترتيب العام
// ==========================================
function calculateGlobalRanking() {
    const container = document.getElementById('global-tables-container');
    if (!container) return;
    container.innerHTML = "";

    let groupsMap = {};
    globalUsers.forEach(u => {
        if (!groupsMap[u.group]) groupsMap[u.group] = [];
        groupsMap[u.group].push(u);
    });

    if (Object.keys(groupsMap).length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-center py-8">لا يوجد لاعبون بعد</p>`;
        return;
    }

    for (let gName in groupsMap) {
        let sorted = groupsMap[gName].sort((a, b) => (b.score || 0) - (a.score || 0));
        container.innerHTML += `
        <div class="glass-panel p-4 rounded-3xl mb-6 border border-yellow-500/20">
            <h3 class="text-yellow-500 font-black mb-3 text-center">${gName || 'بدون مجموعة'}</h3>
            <table class="w-full text-[11px]">
                ${sorted.map((u, i) => `
                <tr class="border-b border-gray-800">
                    <td class="p-2 text-gray-500">${i + 1}</td>
                    <td class="p-2">${u.name}</td>
                    <td class="p-2 text-yellow-500 font-bold">${u.score || 0}</td>
                </tr>`).join('')}
            </table>
        </div>`;
    }
}

// ==========================================
// 5. الخزنة والرسائل وإعدادات الملعب
// ==========================================
function setStatus(status) {
    const day = document.getElementById('pub-day').value;
    db.collection("settings").doc("global_status").set({
        currentDay: parseInt(day),
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        const labels = { soon: 'قريباً ⏳', active: 'مفعّل ▶️', closed: 'مغلق 🔒' };
        alert(`تم تعيين اليوم ${day} على حالة: ${labels[status] || status}`);
    }).catch(err => alert("خطأ: " + err.message));
}

function saveMessage(docId) {
    let content = '';
    if (docId === 'champData') {
        content = document.getElementById('msg-champ').value.trim();
    } else if (docId === 'dailyData') {
        content = document.getElementById('msg-daily').value.trim();
    }
    if (!content) return alert("اكتب الرسالة أولاً!");
    db.collection("messages").doc(docId).set({
        text: content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => alert("تم النشر ✅"))
    .catch(err => alert("خطأ: " + err.message));
}

// ==========================================
// 6. الخروج الآمن
// ==========================================
function logOut() {
    if (confirm("هل تريد الخروج من لوحة التحكم؟")) {
        localStorage.removeItem('__adm_s');
        localStorage.removeItem('lastCreatedUser');
        sessionStorage.clear();
        window.location.replace('index.html');
    }
}
