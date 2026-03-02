// ==========================================
// 1. الإعدادات والاتصال بقاعدة البيانات
// ==========================================
let db = null;
let globalGroups = [];
let globalUsers = [];

const firebaseConfig = { 
    apiKey: "AIzaSyBZMnIJ_IOqeAfXqFt-m4tM1Lvo0tUDnk8", 
    projectId: "ramadan-87817", 
    appId: "1:343525703258:web:6776b4857425df8bcca263" 
};

// تشغيل عند التحميل
window.addEventListener('DOMContentLoaded', () => {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig); 
    db = firebase.firestore();
    
    const statusEl = document.getElementById('conn-status');
    if(statusEl) {
        statusEl.innerText = "متصل بنجاح 🟢";
        statusEl.classList.replace('text-yellow-500', 'text-green-500');
    }

    setupDays();
    setupQuestions();
    startListening();
});

// مراقبة البيانات لحظياً
function startListening() {
    // مراقبة المجموعات
    db.collection("config").doc("groups_data").onSnapshot(s => {
        globalGroups = s.exists ? (s.data().list || []) : []; 
        renderGroups(); 
    });

    // مراقبة المستخدمين
    db.collection("users").onSnapshot(s => {
        globalUsers = [];
        s.forEach(d => globalUsers.push({id: d.id, ...d.data()}));
        renderUsers();
        if(typeof renderFinalRound === 'function') renderFinalRound(); 
        calculateGlobalRanking();
    });
}

// ==========================================
// 2. وظائف الواجهة (Tabs & Setup)
// ==========================================
function showTab(t, btn) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const targetTab = document.getElementById('tab-'+t);
    if(targetTab) targetTab.style.display = 'block';
    if(btn) btn.classList.add('active');
}

function setupDays() {
    let html = "";
    for(let d=1; d<=30; d++) html += `<option value="${d}">اليوم ${d}</option>`;
    ['q-day', 'pub-day'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = html;
    });
}

function setupQuestions() {
    let html = "";
    for(let i=1; i<=15; i++) {
        html += `
        <div class="q-block glass-panel p-4 rounded-xl mb-4 border border-gray-700">
            <p class="text-yellow-500 text-[10px] font-bold mb-1">سؤال ${i}</p>
            <textarea class="qt w-full p-2 text-sm rounded-lg mb-2 h-12 bg-black/40 text-white" placeholder="اكتب السؤال..."></textarea>
            <div class="grid grid-cols-2 gap-2">
                <input class="o1 p-2 text-xs rounded bg-black/40 text-white" placeholder="خيار 1">
                <input class="o2 p-2 text-xs rounded bg-black/40 text-white" placeholder="خيار 2">
                <input class="o3 p-2 text-xs rounded bg-black/40 text-white" placeholder="خيار 3">
                <input class="o4 p-2 text-xs rounded bg-black/40 text-white" placeholder="خيار 4">
            </div>
            <select class="ca w-full p-2 mt-2 text-xs text-green-400 bg-black rounded">
                <option value="0">الإجابة الصحيحة: 1</option>
                <option value="1">الإجابة الصحيحة: 2</option>
                <option value="2">الإجابة الصحيحة: 3</option>
                <option value="3">الإجابة الصحيحة: 4</option>
            </select>
        </div>`;
    }
    const qArea = document.getElementById('q-area');
    if(qArea) qArea.innerHTML = html;
}

// ==========================================
// 3. إدارة المجموعات
// ==========================================
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
    db.collection("config").doc("groups_data").set({ list: globalGroups })
      .then(() => alert("تمت الإضافة ✅"));
}

function renderGroups() {
    let list = document.getElementById('grp-list');
    let select = document.getElementById('u-group');
    if(!list) return;
    
    list.innerHTML = "";
    if(select) select.innerHTML = '<option value="">اختر المجموعة</option>';
    
    globalGroups.forEach((g, i) => {
        if(select) select.innerHTML += `<option value="${i}">${g.group}</option>`;
        list.innerHTML += `
        <div class="glass-panel p-3 rounded-xl flex justify-between items-center mb-2 border border-gray-700">
            <div><b class="text-yellow-500">${g.group}</b><small class="block text-gray-400 text-[10px]">${g.type === 'single' ? 'فردي' : g.teams.join(' vs ')}</small></div>
            <div class="flex gap-2">
                <button onclick="delGrp(${i})" class="bg-red-900 p-2 rounded-lg text-[10px]">حذف</button>
            </div>
        </div>`;
    });
}

// ==========================================
// 4. إدارة المتسابقين
// ==========================================
function addUsr() {
    let n = document.getElementById('u-name').value.trim();
    let gIdx = document.getElementById('u-group').value;
    let t = document.getElementById('u-team').value;
    if(!n || gIdx === "") return alert("كمل البيانات");

    let groupName = globalGroups[gIdx].group;
    let pass = Math.floor(100000 + Math.random() * 900000).toString();
    
    db.collection("users").add({
        name: n, password: pass, group: groupName, team: t || "فردي", 
        score: 0, isBanned: false, cheatCount: 0, isEliminated: false
    }).then(() => {
        const modal = document.getElementById('copy-modal');
        if(modal) modal.style.display = 'flex';
        const cpBtn = document.getElementById('cp-btn');
        if(cpBtn) {
            cpBtn.onclick = () => { 
                navigator.clipboard.writeText(`الاسم: ${n}\nالكود: ${pass}`); 
                alert("تم النسخ!"); 
            };
        }
    });
}

function renderUsers() {
    let uL = document.getElementById('usr-list');
    if(!uL) return;
    uL.innerHTML = "";
    [...globalUsers].sort((a,b) => (b.score || 0) - (a.score || 0)).forEach(u => {
        uL.innerHTML += `
        <tr class="border-b border-gray-800">
            <td class="p-4"><b>${u.name}</b><br><small class="text-gray-500">${u.password} | ${u.team}</small></td>
            <td class="text-center font-bold text-yellow-500">${u.score || 0}</td>
            <td class="p-4 flex gap-1 justify-center">
                <button onclick="edSc('${u.id}')" class="bg-blue-600 p-1 rounded text-[10px]">نقاط</button>
                <button onclick="openProfile('${u.id}')" class="bg-purple-600 p-1 rounded text-[10px]">بروفايل</button>
                <button onclick="delUsr('${u.id}')" class="bg-red-600 p-1 rounded text-[10px]">حذف</button>
            </td>
        </tr>`;
    });
}

// ==========================================
// 5. إدارة الكويز (الحفظ والاستدعاء المحدث)
// ==========================================
function loadQ() {
    const day = document.getElementById('q-day').value;
    const version = document.getElementById('q-var').value;
    
    db.collection("quizzes_pool").doc(`day_${day}`).get().then(doc => {
        setupQuestions(); 
        if (doc.exists && doc.data().variations && doc.data().variations[version]) {
            const data = doc.data().variations[version].questions;
            const blocks = document.querySelectorAll('.q-block');
            data.forEach((q, i) => {
                if (blocks[i]) {
                    blocks[i].querySelector('.qt').value = q.q; 
                    blocks[i].querySelector('.o1').value = q.options[0];
                    blocks[i].querySelector('.o2').value = q.options[1];
                    blocks[i].querySelector('.o3').value = q.options[2];
                    blocks[i].querySelector('.o4').value = q.options[3];
                    blocks[i].querySelector('.ca').value = q.correctIndex;
                }
            });
            alert("تم استدعاء الأسئلة بنجاح ✅");
        } else {
            alert("النسخة دي لسه ملهاش أسئلة، ابدأ اكتب!");
        }
    });
}

function saveQ() {
    const day = document.getElementById('q-day').value;
    const version = document.getElementById('q-var').value;
    const blocks = document.querySelectorAll('.q-block');
    let allQuestions = [];

    blocks.forEach(b => {
        const text = b.querySelector('.qt').value.trim();
        if(text) {
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

    if(allQuestions.length === 0) return alert("اكتب سؤال واحد على الأقل!");
    
    // التعديل المطلوب: حفظ كـ Map باستخدام Dot Notation لعدم مسح النسخ الأخرى
    let updateData = {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    updateData[`variations.${version}`] = { questions: allQuestions };

    db.collection("quizzes_pool").doc(`day_${day}`).set(updateData, { merge: true })
      .then(() => alert("🚀 تم حفظ ونشر الأسئلة بنجاح!"));
}

// ==========================================
// 6. التحكم في حالة الملعب (The Vault)
// ==========================================
function setStatus(s) {
    const day = document.getElementById('pub-day').value;
    db.collection("settings").doc("global_status").set({
        currentDay: parseInt(day),
        status: s
    }).then(() => alert(`تم تغيير حالة الملعب لـ: ${s}`));
}

// ==========================================
// 7. نقاط المستخدم والبروفايل
// ==========================================
function edSc(id) {
    let val = prompt("أضف نقاط (مثلاً 10 أو -5):", "0");
    if(val) {
        db.collection("users").doc(id).update({
            score: firebase.firestore.FieldValue.increment(parseInt(val))
        });
    }
}

function openProfile(id) {
    const u = globalUsers.find(x => x.id === id);
    if(!u) return;
    document.getElementById('prof-name').innerText = u.name;
    document.getElementById('prof-score').innerText = u.score || 0;
    document.getElementById('user-profile-modal').style.display = 'flex';
    
    db.collection("users").doc(id).collection("game_logs").get().then(snap => {
        let html = "";
        snap.forEach(doc => {
            const data = doc.data();
            html += `
            <div class="bg-gray-800 p-3 rounded-xl flex justify-between items-center mb-2">
                <span>الجولة ${data.day}</span>
                <span class="text-green-400 font-black">+${data.score}</span>
            </div>`;
        });
        document.getElementById('prof-logs').innerHTML = html || "<p class='text-center text-gray-500'>لا يوجد سجلات</p>";
    });
}

function delUsr(id) {
    if(confirm("سيتم حذف اللاعب وكل بياناته، متأكد؟")) {
        db.collection("users").doc(id).delete();
    }
}

function logOut() {
    localStorage.clear();
    location.reload();
}

function calculateGlobalRanking() {
    const container = document.getElementById('global-tables-container');
    if(!container) return;
    container.innerHTML = "";
    
    let groups = {};
    globalUsers.forEach(u => {
        if(!groups[u.group]) groups[u.group] = [];
        groups[u.group].push(u);
    });

    for(let gName in groups) {
        let sorted = groups[gName].sort((a,b) => (b.score||0)-(a.score||0));
        let table = `<div class="glass-panel rounded-2xl p-4 mb-4"><h3 class="text-yellow-500 mb-2 font-black">${gName}</h3><table class="w-full text-right text-[10px]">`;
        sorted.forEach((u, i) => {
            table += `<tr class="border-b border-gray-800"><td class="p-2">${i+1}</td><td class="p-2">${u.name}</td><td class="p-2 font-bold">${u.score}</td></tr>`;
        });
        table += "</table></div>";
        container.innerHTML += table;
    }
}

function loadTeams() {
    const idx = document.getElementById('u-group').value;
    const tSelect = document.getElementById('u-team');
    if(!tSelect) return;
    tSelect.innerHTML = "";
    if(idx !== "" && globalGroups[idx]) {
        const g = globalGroups[idx];
        if(g.type === 'single') tSelect.innerHTML = '<option value="فردي">فردي</option>';
        else g.teams.forEach(t => tSelect.innerHTML += `<option value="${t}">${t}</option>`);
    }
}

function saveMessage(doc) {
    const elId = doc === 'champData' ? 'msg-champ' : 'msg-daily';
    const val = document.getElementById(elId).value;
    db.collection("settings").doc(doc).set({ text: val, updatedAt: Date.now() })
      .then(() => alert("تم تحديث الرسالة ✅"));
}
