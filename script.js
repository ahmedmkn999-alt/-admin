let db = null;
let globalGroups = [];
let globalUsers = [];

// إعدادات Firebase
const firebaseConfig = { 
    apiKey: "AIzaSyBZMnIJ_IOqeAfXqFt-m4tM1Lvo0tUDnk8", 
    projectId: "ramadan-87817", 
    appId: "1:343525703258:web:6776b4857425df8bcca263" 
};

// تشغيل الوظائف الأساسية عند الفتح
setupDays();
setupQuestions();

// --- وظائف الواجهة ---
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

// رسم الخانات الـ 15 للسؤال
function setupQuestions() {
    let html = "";
    for(let i=1; i<=15; i++) {
        html += `<div class="q-block glass-panel p-4 rounded-xl mb-4 border border-white/5">
            <p class="text-yellow-500 text-[10px] font-bold mb-1">سؤال ${i}</p>
            <textarea class="qt w-full p-2 text-sm rounded-lg mb-2 h-12 bg-black/20 text-white" placeholder="اكتب السؤال هنا..."></textarea>
            <div class="grid grid-cols-2 gap-2">
                <input class="o1 p-2 text-xs rounded bg-black/40 text-gray-200" placeholder="خيار 1">
                <input class="o2 p-2 text-xs rounded bg-black/40 text-gray-200" placeholder="خيار 2">
                <input class="o3 p-2 text-xs rounded bg-black/40 text-gray-200" placeholder="خيار 3">
                <input class="o4 p-2 text-xs rounded bg-black/40 text-gray-200" placeholder="خيار 4">
            </div>
            <select class="ca w-full p-2 mt-2 text-xs text-green-400 bg-black rounded border border-green-900/50">
                <option value="0">الإجابة الصحيحة: خيار 1</option>
                <option value="1">الإجابة الصحيحة: خيار 2</option>
                <option value="2">الإجابة الصحيحة: خيار 3</option>
                <option value="3">الإجابة الصحيحة: خيار 4</option>
            </select>
        </div>`;
    }
    if(document.getElementById('q-area')) document.getElementById('q-area').innerHTML = html;
}

// الاتصال بـ Firebase
window.addEventListener('DOMContentLoaded', () => {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig); 
    db = firebase.firestore();
    document.getElementById('conn-status').innerText = "متصل بنجاح 🟢";
    document.getElementById('conn-status').classList.replace('text-yellow-500', 'text-green-500');
    startListening();
});

function startListening() {
    db.collection("config").doc("groups_data").onSnapshot(s => {
        if(s.exists) { globalGroups = s.data().list || []; renderGroups(); }
    });

    db.collection("users").onSnapshot(s => {
        globalUsers = [];
        s.forEach(d => globalUsers.push({id: d.id, ...d.data()}));
        renderUsers();
        renderFinalRound(); 
        calculateGlobalRanking();
    });
}

// --- نظام الكويز (التعديل المطلوب) ---

function loadQ() {
    const day = document.getElementById('q-day').value;
    const version = document.getElementById('q-var').value;
    const qArea = document.getElementById('q-area');
    
    qArea.style.opacity = "0.5";
    
    db.collection("quizzes").doc(`day_${day}_v${version}`).get().then(doc => {
        setupQuestions(); // ريست للخانات
        if (doc.exists) {
            const data = doc.data().questions;
            const blocks = document.querySelectorAll('.q-block');
            data.forEach((q, i) => {
                if (blocks[i]) {
                    blocks[i].querySelector('.qt').value = q.text || "";
                    blocks[i].querySelector('.o1').value = q.options[0] || "";
                    blocks[i].querySelector('.o2').value = q.options[1] || "";
                    blocks[i].querySelector('.o3').value = q.options[2] || "";
                    blocks[i].querySelector('.o4').value = q.options[3] || "";
                    blocks[i].querySelector('.ca').value = q.answer || "0";
                }
            });
            alert("✅ تم استدعاء الأسئلة بنجاح.");
        } else {
            alert("ℹ️ لا توجد أسئلة محفوظة لهذه النسخة، يمكنك البدء في الكتابة.");
        }
        qArea.style.opacity = "1";
    });
}

function saveQ() {
    const day = document.getElementById('q-day').value;
    const version = document.getElementById('q-var').value;
    const blocks = document.querySelectorAll('.q-block');
    let allQuestions = [];

    blocks.forEach(block => {
        const text = block.querySelector('.qt').value.trim();
        if (text !== "") {
            allQuestions.push({
                text: text,
                options: [
                    block.querySelector('.o1').value.trim(),
                    block.querySelector('.o2').value.trim(),
                    block.querySelector('.o3').value.trim(),
                    block.querySelector('.o4').value.trim()
                ],
                answer: block.querySelector('.ca').value
            });
        }
    });

    if (allQuestions.length === 0) return alert("❌ اكتب سؤالاً واحداً على الأقل قبل الحفظ.");

    db.collection("quizzes").doc(`day_${day}_v${version}`).set({
        questions: allQuestions,
        lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => alert(`✅ تم حفظ ${allQuestions.length} سؤال بنجاح.`));
}

function setStatus(s) {
    let d = document.getElementById('pub-day').value;
    db.collection("settings").doc("global_status").set({ 
        currentDay: parseInt(d), 
        status: s 
    }).then(() => alert("🚀 تم تحديث حالة الملعب بنجاح!"));
}

// --- إدارة المجموعات واللاعبين ---

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
        alert("تم الحفظ");
        document.getElementById('g-name').value = "";
    });
}

function renderGroups() {
    let list = document.getElementById('grp-list');
    let select = document.getElementById('u-group');
    if(!list) return;
    list.innerHTML = "";
    select.innerHTML = '<option value="">اختر المجموعة</option>';
    globalGroups.forEach((g, i) => {
        select.innerHTML += `<option value="${i}">${g.group}</option>`;
        list.innerHTML += `<div class="glass-panel p-3 rounded-xl flex justify-between items-center mb-2 border border-gray-700">
            <div><b class="text-yellow-500">${g.group}</b><br><small class="text-gray-400">${g.type}</small></div>
            <button onclick="delGrp(${i})" class="text-red-500"><i class="fas fa-trash"></i></button>
        </div>`;
    });
}

function delGrp(i) {
    if(confirm("سيتم حذف المجموعة وكل لاعبيها! هل أنت متأكد؟")) {
        globalGroups.splice(i, 1);
        db.collection("config").doc("groups_data").set({ list: globalGroups });
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
        name: n, password: pass, group: groupName, team: t || "فردي", score: 0, isBanned: false, cheatCount: 0, isEliminated: false
    }).then(() => {
        document.getElementById('copy-modal').style.display = 'flex';
        document.getElementById('cp-btn').onclick = () => { 
            navigator.clipboard.writeText(`الاسم: ${n}\nالكود: ${pass}`); 
            alert("تم النسخ!"); 
        };
    });
}

function renderUsers() {
    let uL = document.getElementById('usr-list');
    if(!uL) return;
    uL.innerHTML = "";
    globalUsers.sort((a,b) => b.score - a.score).forEach(u => {
        uL.innerHTML += `<tr class="border-b border-gray-800">
            <td class="p-4"><b>${u.name}</b><br><small class="text-yellow-500">${u.password}</small></td>
            <td class="text-center font-bold text-yellow-500">${u.score}</td>
            <td class="p-4 flex gap-1 justify-center">
                <button onclick="edSc('${u.id}',${u.score})" class="bg-blue-600 p-2 rounded text-[10px]">نقاط</button>
                <button onclick="delUsr('${u.id}')" class="bg-red-600 p-2 rounded text-[10px]">حذف</button>
            </td>
        </tr>`;
    });
}

function edSc(id, old) {
    let n = prompt("إضافة نقاط (استخدم - للخصم):", "0");
    if(n) db.collection("users").doc(id).update({ score: old + parseInt(n) });
}

function delUsr(id) {
    if(confirm("حذف اللاعب نهائياً؟")) db.collection("users").doc(id).delete();
}

function saveMessage(doc) {
    let val = (doc === 'champData') ? document.getElementById('msg-champ').value : document.getElementById('msg-daily').value;
    db.collection("settings").doc(doc).set({ message: val }).then(() => alert("تم التحديث بنجاح."));
}

function logOut() {
    localStorage.removeItem('admin_access');
    window.location.reload();
}

// دوال إضافية لتشغيل التيمات والبروفايلات كما هي في كودك الأصلي
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
