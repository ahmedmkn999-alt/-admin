// ==========================================
// 1. الإعدادات والاتصال
// ==========================================
let db = null;
let globalGroups = [];
let globalUsers = [];

const firebaseConfig = { 
    apiKey: "AIzaSyBZMnIJ_IOqeAfXqFt-m4tM1Lvo0tUDnk8", 
    projectId: "ramadan-87817", 
    appId: "1:343525703258:web:6776b4857425df8bcca263" 
};

window.addEventListener('DOMContentLoaded', () => {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig); 
    db = firebase.firestore();
    
    // تحديث حالة الاتصال في الهيدر
    const statusEl = document.getElementById('conn-status');
    if(statusEl) {
        statusEl.innerHTML = "متصل بنجاح 🟢";
        statusEl.style.color = "#10b981";
    }

    setupDays();
    setupQuestions();
    startListening();
    showTab('groups-section'); // إظهار أول قسم تلقائياً
});

// ==========================================
// 2. نظام التبويبات (حل مشكلة التعليق)
// ==========================================
function showTab(tabId) {
    // إخفاء كل السكاشن
    document.querySelectorAll('.tab-content').forEach(section => {
        section.style.display = 'none';
        section.classList.add('hidden');
    });
    
    // إظهار السكشن المطلوب
    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = 'block';
        target.classList.remove('hidden');
    }

    // تمييز الزرار النشط
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-yellow-500', 'text-yellow-500');
    });
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('border-yellow-500', 'text-yellow-500');
    }
}

// ==========================================
// 3. إدارة المجموعات والتيمات
// ==========================================
function saveGrp() {
    const name = document.getElementById('g-name').value.trim();
    const type = document.getElementById('g-type').value;
    if(!name) return alert("اكتب اسم المجموعة أولاً!");

    let newGroup = { group: name, type: type, teams: [] };
    if(type === 'teams') {
        const t1 = document.getElementById('t1').value.trim();
        const t2 = document.getElementById('t2').value.trim();
        if(!t1 || !t2) return alert("يجب كتابة أسماء التيمات");
        newGroup.teams = [t1, t2];
    }

    globalGroups.push(newGroup);
    db.collection("config").doc("groups_data").set({ list: globalGroups })
      .then(() => {
          alert("تمت إضافة المجموعة ✅");
          document.getElementById('g-name').value = "";
      });
}

function renderGroups() {
    const list = document.getElementById('grp-list');
    if(!list) return;
    list.innerHTML = "";
    globalGroups.forEach((g, i) => {
        list.innerHTML += `
        <div class="glass-panel p-4 rounded-2xl flex justify-between items-center mb-3 border border-gray-800">
            <div>
                <b class="text-yellow-500">${g.group}</b>
                <p class="text-[10px] text-gray-500">${g.type === 'teams' ? 'مباراة تيمات' : 'مجموعة عادية'}</p>
            </div>
            <button onclick="delGrp(${i})" class="bg-red-900/50 text-red-500 px-3 py-1 rounded-lg text-xs">حذف</button>
        </div>`;
    });
}

function delGrp(i) {
    if(confirm("هل أنت متأكد من حذف المجموعة؟")) {
        globalGroups.splice(i, 1);
        db.collection("config").doc("groups_data").set({ list: globalGroups });
    }
}

// ==========================================
// 4. إدارة الأسئلة (الجولة الأخيرة)
// ==========================================
function loadQ() {
    const day = document.getElementById('q-day').value;
    const version = document.getElementById('q-var').value;
    
    db.collection("quizzes_pool").doc(`day_${day}`).get().then(doc => {
        if (doc.exists) {
            const data = doc.data().variations?.[version]?.questions;
            if(data) {
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
            } else { alert("لا توجد بيانات لهذه النسخة"); }
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
                options: [b.querySelector('.o1').value, b.querySelector('.o2').value, b.querySelector('.o3').value, b.querySelector('.o4').value],
                correctIndex: parseInt(b.querySelector('.ca').value)
            });
        }
    });

    let updateData = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    updateData[`variations.${version}`] = { questions: allQuestions };
    updateData[`variations.0`] = { questions: allQuestions }; // نسخة افتراضية للموبايل

    db.collection("quizzes_pool").doc(`day_${day}`).set(updateData, { merge: true })
      .then(() => alert("🚀 تم الحفظ والنشر بنجاح!"));
}

// ==========================================
// 5. إدارة المتسابقين والترتيب
// ==========================================
function startListening() {
    db.collection("config").doc("groups_data").onSnapshot(s => {
        globalGroups = s.exists ? (s.data().list || []) : []; 
        renderGroups(); 
    });

    db.collection("users").onSnapshot(s => {
        globalUsers = [];
        s.forEach(d => globalUsers.push({id: d.id, ...d.data()}));
        renderUsers();
        calculateGlobalRanking();
    });
}

function renderUsers() {
    const uL = document.getElementById('usr-list');
    if(!uL) return;
    uL.innerHTML = globalUsers.sort((a,b) => (b.score||0)-(a.score||0)).map(u => `
        <tr class="border-b border-gray-800">
            <td class="p-4 text-xs font-bold">${u.name}</td>
            <td class="text-center font-bold text-yellow-500">${u.score || 0}</td>
            <td class="p-4 flex gap-1 justify-center">
                <button onclick="edSc('${u.id}')" class="bg-blue-600 p-1 rounded text-[10px]">نقاط</button>
                <button onclick="openProfile('${u.id}')" class="bg-purple-600 p-1 rounded text-[10px]">سجل</button>
                <button onclick="delUsr('${u.id}')" class="bg-red-600 p-1 rounded text-[10px]">حذف</button>
            </td>
        </tr>`).join('');
}

function calculateGlobalRanking() {
    const container = document.getElementById('global-tables-container');
    if(!container) return;
    container.innerHTML = "";
    
    let groupsMap = {};
    globalUsers.forEach(u => {
        if(!groupsMap[u.group]) groupsMap[u.group] = [];
        groupsMap[u.group].push(u);
    });

    for(let gName in groupsMap) {
        let sorted = groupsMap[gName].sort((a,b) => (b.score||0)-(a.score||0));
        container.innerHTML += `
        <div class="glass-panel p-4 rounded-3xl mb-6 border border-yellow-500/20">
            <h3 class="text-yellow-500 font-black mb-3 text-center">${gName}</h3>
            <table class="w-full text-[11px]">
                ${sorted.map((u, i) => `
                <tr class="border-b border-gray-800">
                    <td class="p-2 text-gray-500">${i+1}</td>
                    <td class="p-2">${u.name}</td>
                    <td class="p-2 text-yellow-500 font-bold">${u.score}</td>
                </tr>`).join('')}
            </table>
        </div>`;
    }
}

// ==========================================
// 6. وظائف مساعدة
// ==========================================
function setupQuestions() {
    const area = document.getElementById('q-area');
    if(!area) return;
    let html = "";
    for(let i=1; i<=15; i++) {
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
                <option value="0">الإجابة: 1</option><option value="1">الإجابة: 2</option>
                <option value="2">الإجابة: 3</option><option value="3">الإجابة: 4</option>
            </select>
        </div>`;
    }
    area.innerHTML = html;
}

function setupDays() {
    let options = "";
    for(let i=1; i<=30; i++) options += `<option value="${i}">اليوم ${i}</option>`;
    ['q-day', 'pub-day'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).innerHTML = options;
    });
}

function edSc(id) {
    let val = prompt("تعديل النقاط (أضف 10 أو -10):", "0");
    if(val) db.collection("users").doc(id).update({ score: firebase.firestore.FieldValue.increment(parseInt(val)) });
}

function delUsr(id) {
    if(confirm("حذف المتسابق نهائياً؟")) db.collection("users").doc(id).delete();
}
