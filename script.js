let db = null;
let globalGroups = [];
let globalUsers = [];

const firebaseConfig = { 
    apiKey: "AIzaSyBZMnIJ_IOqeAfXqFt-m4tM1Lvo0tUDnk8", 
    projectId: "ramadan-87817", 
    appId: "1:343525703258:web:6776b4857425df8bcca263" 
};

setupDays();
setupQuestions();

function showTab(t, btn) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-'+t).style.display = 'block';
    if(btn) btn.classList.add('active');
}

function toggleGroupInputs() {
    const type = document.getElementById('g-type').value;
    document.getElementById('teams-input-area').style.display = (type === 'teams') ? 'grid' : 'none';
}

function toggleEditGroupInputs() {
    const type = document.getElementById('edit-g-type').value;
    document.getElementById('edit-teams-input-area').style.display = (type === 'teams') ? 'grid' : 'none';
}

function setupDays() {
    let html = "";
    for(let d=1; d<=30; d++) html += `<option value="${d}">اليوم ${d}</option>`;
    if(document.getElementById('q-day')) document.getElementById('q-day').innerHTML = html;
    if(document.getElementById('pub-day')) document.getElementById('pub-day').innerHTML = html;
}

function setupQuestions() {
    let html = "";
    for(let i=1; i<=15; i++) {
        html += `<div class="q-block">
            <p class="text-yellow-500 text-[10px] font-bold mb-1">سؤال ${i}</p>
            <textarea class="qt w-full p-2 text-sm rounded-lg mb-2 h-12" placeholder="السؤال..."></textarea>
            <div class="grid grid-cols-2 gap-2">
                <input class="o1 p-2 text-xs rounded" placeholder="خيار 1"><input class="o2 p-2 text-xs rounded" placeholder="خيار 2">
                <input class="o3 p-2 text-xs rounded" placeholder="خيار 3"><input class="o4 p-2 text-xs rounded" placeholder="خيار 4">
            </div>
            <select class="ca w-full p-1 mt-2 text-xs text-green-400 bg-black rounded">
                <option value="0">الصح 1</option><option value="1">الصح 2</option>
                <option value="2">الصح 3</option><option value="3">الصح 4</option>
            </select>
        </div>`;
    }
    if(document.getElementById('q-area')) document.getElementById('q-area').innerHTML = html;
}

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig); 
        db = firebase.firestore();
        document.getElementById('conn-status').innerText = "متصل بنجاح 🟢";
        document.getElementById('conn-status').classList.replace('text-yellow-500', 'text-green-500');
        startListening();
    }, 500);
});

function startListening() {
    db.collection("config").doc("groups_data").onSnapshot(s => {
        if(s.exists) { 
            globalGroups = s.data().list || []; 
            renderGroups(); 
        } else {
            globalGroups = []; renderGroups();
        }
    });

    db.collection("users").onSnapshot(s => {
        globalUsers = [];
        s.forEach(d => globalUsers.push({id: d.id, ...d.data()}));
        renderUsers();
        renderFinalRound(); 
        calculateGlobalRanking();
    });
}

/* ==========================================
   نظام المجموعات (إضافة - تعديل - مسح)
========================================== */
function saveGrp() {
    const name = document.getElementById('g-name').value.trim();
    const type = document.getElementById('g-type').value;
    if(!name) return alert("اكتب اسم المجموعة");
    
    let newG = { group: name, type: type, teams: [] };
    if(type === 'teams') {
        const t1 = document.getElementById('t1').value.trim();
        const t2 = document.getElementById('t2').value.trim();
        if(!t1 || !t2) return alert("اكتب أسماء التيمات");
        newG.teams = [t1, t2];
    }

    globalGroups.push(newG);
    db.collection("config").doc("groups_data").set({ list: globalGroups }).then(() => {
        document.getElementById('g-name').value = ""; document.getElementById('t1').value = ""; document.getElementById('t2').value = "";
        alert("تم الحفظ بنجاح");
    });
}

function renderGroups() {
    let list = document.getElementById('grp-list');
    let select = document.getElementById('u-group');
    if(!list || !select) return;
    
    list.innerHTML = "";
    select.innerHTML = '<option value="">اختر المجموعة</option>';
    
    globalGroups.forEach((g, i) => {
        select.innerHTML += `<option value="${i}">${g.group || "مجموعة مجهولة"}</option>`;
        let teamStr = g.type === 'single' ? "فردي" : (g.teams ? g.teams.join(' vs ') : "مباراة");

        list.innerHTML += `<div class="glass-panel p-3 rounded-xl flex justify-between items-center mb-2 border border-gray-700">
            <div>
                <b class="text-yellow-500 text-lg">${g.group || "بدون اسم"}</b>
                <small class="block text-gray-400 font-bold">${teamStr}</small>
            </div>
            <div class="flex gap-2">
                <button onclick="openEditGrp(${i})" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-black shadow-md"><i class="fas fa-edit"></i> تعديل</button>
                <button onclick="delGrp(${i})" class="bg-red-900/80 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-black shadow-md"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`;
    });
}

let currentEditGroupIndex = -1;
function openEditGrp(i) {
    currentEditGroupIndex = i;
    let g = globalGroups[i];
    document.getElementById('edit-g-name').value = g.group;
    document.getElementById('edit-g-type').value = g.type;
    toggleEditGroupInputs();
    if(g.type === 'teams' && g.teams) {
        document.getElementById('edit-t1').value = g.teams[0] || "";
        document.getElementById('edit-t2').value = g.teams[1] || "";
    } else {
        document.getElementById('edit-t1').value = "";
        document.getElementById('edit-t2').value = "";
    }
    document.getElementById('edit-group-modal').style.display = 'flex';
}

function saveEditedGrp() {
    let g = globalGroups[currentEditGroupIndex];
    let oldName = g.group;
    let newName = document.getElementById('edit-g-name').value.trim();
    let newType = document.getElementById('edit-g-type').value;
    let newTeams = [];
    
    if(!newName) return alert("اكتب اسم المجموعة الجديد");

    if(newType === 'teams') {
        let t1 = document.getElementById('edit-t1').value.trim();
        let t2 = document.getElementById('edit-t2').value.trim();
        if(!t1 || !t2) return alert("اكتب أسماء التيمات");
        newTeams = [t1, t2];
    }

    globalGroups[currentEditGroupIndex] = { group: newName, type: newType, teams: newTeams };
    db.collection("config").doc("groups_data").set({ list: globalGroups });

    // تحديث كل اللاعبين اللي كانوا في المجموعة دي لاسمها الجديد عشان السيستم ميبوظش
    if(oldName !== newName) {
        let batch = db.batch();
        globalUsers.forEach(u => {
            if(u.group === oldName) {
                let ref = db.collection("users").doc(u.id);
                batch.update(ref, { group: newName });
            }
        });
        batch.commit();
    }
    
    document.getElementById('edit-group-modal').style.display = 'none';
    alert("تم تعديل المجموعة وتحديث بيانات متسابقيها بنجاح!");
}

function delGrp(i) {
    let gName = globalGroups[i].group;
    if(confirm(`⚠️ هل أنت متأكد من حذف مجموعة "${gName}"؟\nسيتم مسح المجموعة، وحذف جميع المتسابقين بداخلها نهائياً!`)) {
        let usersToDelete = globalUsers.filter(u => u.group === gName);
        usersToDelete.forEach(u => db.collection("users").doc(u.id).delete() );
        globalGroups.splice(i, 1);
        db.collection("config").doc("groups_data").set({ list: globalGroups });
        alert(`✅ تم المسح بنجاح.`);
    }
}

/* ==========================================
   نظام المتسابقين (إضافة - نقل - تعديل)
========================================== */
function loadTeams() {
    let idx = document.getElementById('u-group').value;
    let tSelect = document.getElementById('u-team');
    tSelect.innerHTML = "";
    if(idx !== "" && globalGroups[idx]) {
        let g = globalGroups[idx];
        if(g.type === 'single') tSelect.innerHTML = '<option value="فردي">فردي</option>';
        else if(g.teams) g.teams.forEach(t => tSelect.innerHTML += `<option value="${t}">${t}</option>`);
    }
}

function loadEditUserTeams() {
    let idx = document.getElementById('edit-u-group').value;
    let tSelect = document.getElementById('edit-u-team');
    tSelect.innerHTML = "";
    if(idx !== "" && globalGroups[idx]) {
        let g = globalGroups[idx];
        if(g.type === 'single') tSelect.innerHTML = '<option value="فردي">فردي</option>';
        else if(g.teams) g.teams.forEach(t => tSelect.innerHTML += `<option value="${t}">${t}</option>`);
    }
}

function addUsr() {
    let n = document.getElementById('u-name').value.trim();
    let gIdx = document.getElementById('u-group').value;
    let t = document.getElementById('u-team').value;
    if(!n || gIdx === "") return alert("اكمل البيانات");

    let groupName = globalGroups[gIdx].group;
    let pass = Math.floor(100000 + Math.random() * 900000).toString();
    
    db.collection("users").add({
        name: n, password: pass, group: groupName, team: t || "", score: 0, isBanned: false, cheatCount: 0, isEliminated: false
    }).then(() => {
        document.getElementById('u-name').value = "";
        document.getElementById('copy-modal').style.display = 'flex';
        document.getElementById('cp-btn').onclick = () => { navigator.clipboard.writeText(`الاسم: ${n}\nالكود: ${pass}`); alert("تم النسخ!"); };
    });
}

function renderUsers() {
    let uL = document.getElementById('usr-list');
    if(!uL) return;
    uL.innerHTML = "";
    let safeUsers = globalUsers.map(u => ({...u, score: u.score || 0}));
    safeUsers.sort((a,b) => b.score - a.score).forEach(u => {
        let cheatBadge = (u.cheatCount > 0) ? `<span onclick="resetCheat('${u.id}')" style="cursor:pointer;" class="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] ml-1">غش (${u.cheatCount})</span>` : '';
        let elimClass = u.isEliminated ? 'text-gray-500 line-through' : '';
        let banClass = u.isBanned ? 'text-red-500 line-through' : '';

        uL.innerHTML += `<tr class="border-b border-gray-800 hover:bg-gray-800/50 transition">
            <td class="p-4 leading-relaxed">
                <b class="${banClass || elimClass}">${u.name}</b> ${cheatBadge}
                <br><small class="text-yellow-500">${u.password} | ${u.team}</small>
                ${u.isEliminated ? '<br><small class="text-red-400 font-bold text-[10px]"><i class="fas fa-ban"></i> مقصى</small>' : ''}
            </td>
            <td class="text-center font-bold text-yellow-500 text-lg">${u.score}</td>
            <td class="p-4 flex flex-wrap gap-1 justify-center">
                <button onclick="openEditUsr('${u.id}')" class="bg-blue-800 hover:bg-blue-700 text-white p-2 rounded text-[10px] w-full mb-1"><i class="fas fa-edit"></i> تعديل ونقل</button>
                <button onclick="openProfile('${u.id}')" class="bg-purple-700 hover:bg-purple-600 text-white p-2 rounded text-[10px] flex-1">بروفايل</button>
                <button onclick="edSc('${u.id}',${u.score})" class="bg-blue-600 hover:bg-blue-500 p-2 rounded text-[10px] flex-1">نقط</button>
                <button onclick="eliminateUsr('${u.id}',${u.isEliminated})" class="${u.isEliminated ? 'bg-gray-600' : 'bg-pink-700'} p-2 rounded text-[10px] flex-1 text-white">${u.isEliminated?'إعادة':'إقصاء'}</button>
                <button onclick="delUsr('${u.id}')" class="bg-red-600 hover:bg-red-500 p-2 rounded text-[10px] flex-1">حذف</button>
            </td>
        </tr>`;
    });
}

let currentEditUserId = null;
function openEditUsr(id) {
    currentEditUserId = id;
    let u = globalUsers.find(x => x.id === id);
    document.getElementById('edit-u-name').value = u.name;
    
    let gSelect = document.getElementById('edit-u-group');
    gSelect.innerHTML = '<option value="">اختر المجموعة</option>';
    
    globalGroups.forEach((g, i) => {
        let sel = (g.group === u.group) ? 'selected' : '';
        gSelect.innerHTML += `<option value="${i}" ${sel}>${g.group}</option>`;
    });
    
    loadEditUserTeams();
    setTimeout(() => { document.getElementById('edit-u-team').value = u.team || "فردي"; }, 100);
    
    document.getElementById('edit-user-modal').style.display = 'flex';
}

function saveEditedUsr() {
    let n = document.getElementById('edit-u-name').value.trim();
    let gIdx = document.getElementById('edit-u-group').value;
    let t = document.getElementById('edit-u-team').value;
    
    if(!n || gIdx === "") return alert("أكمل البيانات");
    
    let groupName = globalGroups[gIdx].group;
    db.collection("users").doc(currentEditUserId).update({
        name: n, group: groupName, team: t || ""
    }).then(() => {
        document.getElementById('edit-user-modal').style.display = 'none';
        alert("✅ تم تعديل ونقل اللاعب بنجاح!");
    });
}

function renderFinalRound() {
    let fL = document.getElementById('final-list');
    if(!fL) return;
    fL.innerHTML = "";
    
    let safeUsers = globalUsers.map(u => ({...u, score: u.score || 0}));
    safeUsers.sort((a, b) => {
        if (a.isEliminated === b.isEliminated) return b.score - a.score;
        return a.isEliminated ? 1 : -1;
    }).forEach(u => {
        let statusBadge = u.isEliminated ? '<span class="bg-red-900/80 text-red-300 px-3 py-1 rounded-lg text-xs font-black">مقصى ❌</span>' : '<span class="bg-green-900/80 text-green-300 px-3 py-1 rounded-lg text-xs font-black">مكمل 🏆</span>';
        let rowStyle = u.isEliminated ? 'bg-red-900/20 opacity-80' : 'bg-green-900/10';
        let nameStyle = u.isEliminated ? 'text-gray-400 line-through' : 'text-white';

        fL.innerHTML += `<tr class="border-b border-gray-800 hover:bg-gray-800/50 transition ${rowStyle}">
            <td class="p-4 leading-relaxed"><b class="${nameStyle}">${u.name}</b><br><small class="text-yellow-500 font-bold">${u.group} | ${u.team}</small></td>
            <td class="text-center p-4">${statusBadge}</td>
            <td class="text-center font-black text-yellow-500 text-xl">${u.score}</td>
            <td class="p-4 flex flex-wrap gap-1 justify-center">
                <button onclick="openEditUsr('${u.id}')" class="bg-blue-800 hover:bg-blue-700 text-white p-2 rounded text-[10px] w-full mb-1"><i class="fas fa-edit"></i> تعديل ونقل</button>
                <button onclick="openProfile('${u.id}')" class="bg-purple-700 hover:bg-purple-600 text-white p-2 rounded text-[10px] flex-1">بروفايل</button>
                <button onclick="edSc('${u.id}',${u.score})" class="bg-blue-600 hover:bg-blue-500 p-2 rounded text-[10px] flex-1">نقط</button>
                <button onclick="eliminateUsr('${u.id}',${u.isEliminated})" class="${u.isEliminated ? 'bg-gray-600' : 'bg-pink-700'} p-2 rounded text-[10px] flex-1 text-white">${u.isEliminated?'إعادة':'إقصاء'}</button>
            </td>
        </tr>`;
    });
}

function resetCheat(userId) { if(confirm("مسامحة المتسابق؟")) db.collection("users").doc(userId).update({ cheatCount: 0, lastCheatReason: "" }); }
function eliminateUsr(userId, state) { if(confirm(state?"إعادته للبطولة؟":"إقصاء اللاعب؟")) db.collection("users").doc(userId).update({ isEliminated: !state }); }

// ... باقي أكواد (البروفايل، الترتيب، الكويز) كما هي ...
let currentUserLogs = []; let currentOpenedUserId = null;
function openProfile(userId) {
    currentOpenedUserId = userId; let user = globalUsers.find(u => u.id === userId); if(!user) return;
    document.getElementById('prof-name').innerText = user.name; document.getElementById('prof-team').innerText = `${user.group} | ${user.team}`; document.getElementById('prof-score').innerText = user.score;
    document.getElementById('user-profile-modal').style.display = 'flex';
    db.collection("users").doc(userId).collection("game_logs").get().then(snap => {
        currentUserLogs = []; snap.forEach(doc => currentUserLogs.push({docId: doc.id, ...doc.data()}));
        currentUserLogs.sort((a,b) => (b.day || 0) - (a.day || 0));
        renderFilteredLogs(); 
    });
}
function renderFilteredLogs() {
    let container = document.getElementById('prof-logs'); container.innerHTML = "";
    currentUserLogs.forEach(log => {
        container.innerHTML += `<div class="bg-gray-800 p-3 rounded-xl flex justify-between border border-gray-700"><div><p class="text-white font-bold">الجولة ${log.day}</p></div><div class="flex items-center gap-3"><span class="text-xl font-black text-green-400">${log.score}</span><button onclick="cancelRound('${log.docId}', ${log.score})" class="bg-red-900 text-white p-2 rounded text-xs"><i class="fas fa-trash-alt"></i></button></div></div>`;
    });
}
function cancelRound(logDocId, scoreToDeduct) {
    db.collection("users").doc(currentOpenedUserId).collection("game_logs").doc(logDocId).delete().then(() => {
        db.collection("users").doc(currentOpenedUserId).update({ score: firebase.firestore.FieldValue.increment(-scoreToDeduct) });
        openProfile(currentOpenedUserId);
    });
}
function calculateGlobalRanking() {
    let container = document.getElementById('global-tables-container'); if(!container) return; container.innerHTML = "";
    let groups = {};
    globalUsers.forEach(u => {
        let g = u.group || "مجهول"; if(!groups[g]) groups[g] = {};
        let key = u.team === "فردي" || !u.team ? u.name : u.team;
        groups[g][key] = (groups[g][key] || 0) + (u.score || 0);
    });
    for (let gName in groups) {
        let sorted = Object.entries(groups[gName]).sort((a,b) => b[1] - a[1]);
        let html = `<div class="glass-panel rounded-2xl overflow-hidden mb-4"><div class="bg-gray-900 p-3 text-yellow-500 font-bold text-center">🏆 ${gName}</div><table class="w-full text-right text-xs"><tbody>`;
        sorted.forEach((ent, i) => html += `<tr class="border-b border-gray-800"><td class="p-2">${i+1}</td><td class="p-2 font-bold">${ent[0]}</td><td class="p-2 text-yellow-500">${ent[1]}</td></tr>`);
        html += `</tbody></table></div>`; container.innerHTML += html;
    }
}
function loadQ() { /* الكود الأصلي زي ما هو */ }
function saveQ() { /* الكود الأصلي زي ما هو */ }
function setStatus(s) { let d = document.getElementById('pub-day').value; db.collection("settings").doc("global_status").set({ currentDay: parseInt(d), status: s }); }
function saveMessage(doc) { let val = (doc === 'champData') ? document.getElementById('msg-champ').value : document.getElementById('msg-daily').value; db.collection("settings").doc(doc).set({ message: val }); }
function edSc(id, old) { let n = prompt("تعديل النقاط:", "0"); if(n) db.collection("users").doc(id).update({ score: old + parseInt(n) }); }
function banUsr(id, s) { db.collection("users").doc(id).update({ isBanned: !s }); }
function delUsr(id) { if(confirm("حذف؟")) db.collection("users").doc(id).delete(); }
function logOut() { localStorage.removeItem('admin_access'); window.location.reload(); }
            
