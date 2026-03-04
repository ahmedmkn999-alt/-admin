// ==========================================
// 1. الإعدادات والربط بـ Firebase
// ==========================================
let db = null;
let globalGroups = [];
let globalUsers = [];

const firebaseConfig = { 
    apiKey: "AIzaSyBZMnIJ_IOqeAfXqFt-m4tM1Lvo0tUDnk8", 
    projectId: "ramadan-87817", 
    appId: "1:343525703258:web:6776b4857425df8bcca263" 
};

// تشغيل عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    try {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig); 
        db = firebase.firestore();
        
        console.log("Firebase Connected ✅");
        
        // إعداد القوائم المنسدلة للأيام
        setupDays();
        // إعداد حقول الأسئلة الـ 15
        setupQuestions();
        // بدء الاستماع للتغييرات اللحظية
        startListening();
        
        // إظهار أول تبويب تلقائياً
        showTab('status-section');
    } catch (e) {
        console.error("Initialization Error:", e);
    }
});

// ==========================================
// 2. نظام التبديل بين الأقسام (Tabs) - حل مشكلة التعليق
// ==========================================
function showTab(tabId) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.add('hidden');
    });
    
    // إظهار القسم المطلوب
    const activeSection = document.getElementById(tabId);
    if (activeSection) {
        activeSection.classList.remove('hidden');
    }

    // تحديث شكل الأزرار (إضافة تحديد أصفر للزر النشط)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-yellow-500', 'text-yellow-500');
        btn.classList.add('border-transparent', 'text-gray-400');
    });

    // تمييز الزر الذي تم الضغط عليه
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('border-yellow-500', 'text-yellow-500');
        event.currentTarget.classList.remove('text-gray-400');
    }
}

// ==========================================
// 3. إدارة الأسئلة (تحميل وحفظ)
// ==========================================
async function loadQ() {
    const day = document.getElementById('q-day').value;
    const version = document.getElementById('q-var').value;
    
    try {
        const doc = await db.collection("quizzes_pool").doc(`day_${day}`).get();
        if (doc.exists) {
            const data = doc.data();
            const questionsToLoad = data.variations?.[version]?.questions || data[`variations.${version}`]?.questions;

            if (questionsToLoad) {
                const blocks = document.querySelectorAll('.q-block');
                questionsToLoad.forEach((q, i) => {
                    if (blocks[i]) {
                        blocks[i].querySelector('.qt').value = q.q || ""; 
                        blocks[i].querySelector('.o1').value = q.options[0] || "";
                        blocks[i].querySelector('.o2').value = q.options[1] || "";
                        blocks[i].querySelector('.o3').value = q.options[2] || "";
                        blocks[i].querySelector('.o4').value = q.options[3] || "";
                        blocks[i].querySelector('.ca').value = q.correctIndex || 0;
                    }
                });
                alert("تم استدعاء الأسئلة بنجاح ✅");
            } else { alert("لا توجد أسئلة لهذه النسخة."); }
        } else { alert("هذا اليوم فارغ حالياً."); }
    } catch (err) { alert("خطأ في الاتصال!"); }
}

async function saveQ() {
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

    try {
        await db.collection("quizzes_pool").doc(`day_${day}`).set({ 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            variations: { [version]: { questions: allQuestions } }
        }, { merge: true });
        alert("🚀 تم الحفظ والنشر بنجاح!");
    } catch (err) { alert("فشل الحفظ: " + err.message); }
}

// ==========================================
// 4. إدارة اللاعبين والمجموعات
// ==========================================
function startListening() {
    // تحديث المجموعات
    db.collection("config").doc("groups_data").onSnapshot(s => {
        globalGroups = s.exists ? (s.data().list || []) : []; 
        renderGroups(); 
    });

    // تحديث اللاعبين والترتيب العالمي
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
    uL.innerHTML = "";
    [...globalUsers].sort((a,b) => (b.score || 0) - (a.score || 0)).forEach(u => {
        uL.innerHTML += `
        <tr class="border-b border-gray-800">
            <td class="p-3 text-xs font-bold">${u.name}</td>
            <td class="text-center font-bold text-yellow-500">${u.score || 0}</td>
            <td class="p-3 flex gap-2 justify-center">
                <button onclick="edSc('${u.id}')" class="bg-blue-600 px-2 py-1 rounded text-[10px]">نقط</button>
                <button onclick="openProfile('${u.id}')" class="bg-purple-600 px-2 py-1 rounded text-[10px]">سجل</button>
                <button onclick="delUsr('${u.id}')" class="bg-red-600 px-2 py-1 rounded text-[10px]">حذف</button>
            </td>
        </tr>`;
    });
}

function setStatus(s) {
    const day = document.getElementById('pub-day').value;
    db.collection("settings").doc("global_status").set({
        currentDay: parseInt(day), status: s
    }).then(() => alert(`تم ${s === 'active' ? 'فتح' : 'إغلاق'} الملعب لليوم ${day}`));
}

// ==========================================
// 5. وظائف إضافية (سجلات وحذف وتعديل)
// ==========================================
function openProfile(id) {
    const u = globalUsers.find(x => x.id === id);
    if(!u) return;
    
    document.getElementById('prof-name').innerText = u.name;
    document.getElementById('user-profile-modal').style.display = 'flex';
    
    db.collection("users").doc(id).collection("game_logs").get().then(snap => {
        let html = "";
        snap.forEach(doc => {
            const data = doc.data();
            html += `
            <div class="bg-gray-800 p-3 rounded-xl flex justify-between items-center mb-2">
                <span class="text-xs">اليوم ${data.day}: ${data.score} نقطة</span>
                <button onclick="deleteLog('${id}', '${doc.id}')" class="text-red-500 text-[10px]">إعادة الجولة</button>
            </div>`;
        });
        document.getElementById('prof-logs').innerHTML = html || "لا يوجد سجلات";
    });
}

function deleteLog(userId, logId) {
    if(confirm("سيتمكن اللاعب من إعادة دخول الجولة، هل أنت متأكد؟")) {
        db.collection("users").doc(userId).collection("game_logs").doc(logId).delete()
        .then(() => { alert("تم حذف السجل!"); openProfile(userId); });
    }
}

function edSc(id) {
    let val = prompt("أضف أو اطرح نقاط (مثال: 10 أو -10):", "0");
    if(val) db.collection("users").doc(id).update({ score: firebase.firestore.FieldValue.increment(parseInt(val)) });
}

function delUsr(id) {
    if(confirm("هل تريد طرد هذا اللاعب نهائياً؟")) db.collection("users").doc(id).delete();
}

// المساعدة في بناء الواجهة
function setupDays() {
    let html = "";
    for(let d=1; d<=30; d++) html += `<option value="${d}">اليوم ${d}</option>`;
    ['q-day', 'pub-day'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = html;
    });
}

function setupQuestions() {
    const area = document.getElementById('q-area');
    if(!area) return;
    let html = "";
    for(let i=1; i<=15; i++) {
        html += `
        <div class="q-block bg-gray-900/50 p-4 rounded-2xl mb-4 border border-gray-800">
            <span class="text-yellow-500 text-[10px] font-bold">سؤال ${i}</span>
            <input class="qt w-full p-2 bg-transparent border-b border-gray-700 mb-3 text-sm" placeholder="نص السؤال...">
            <div class="grid grid-cols-2 gap-2">
                <input class="o1 p-2 bg-black/30 rounded text-xs" placeholder="خيار 1">
                <input class="o2 p-2 bg-black/30 rounded text-xs" placeholder="خيار 2">
                <input class="o3 p-2 bg-black/30 rounded text-xs" placeholder="خيار 3">
                <input class="o4 p-2 bg-black/30 rounded text-xs" placeholder="خيار 4">
            </div>
            <select class="ca w-full p-2 mt-2 bg-gray-800 text-green-400 text-xs rounded-lg">
                <option value="0">الإجابة الصحيحة: 1</option>
                <option value="1">الإجابة الصحيحة: 2</option>
                <option value="2">الإجابة الصحيحة: 3</option>
                <option value="3">الإجابة الصحيحة: 4</option>
            </select>
        </div>`;
    }
    area.innerHTML = html;
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
        let table = `
        <div class="bg-gray-900/80 p-4 rounded-3xl mb-6 border border-yellow-500/10">
            <h3 class="text-yellow-500 font-black mb-3 text-center">${gName}</h3>
            <table class="w-full text-[11px]">
                ${sorted.map((u, i) => `
                <tr class="border-b border-gray-800">
                    <td class="p-2 text-gray-500">${i+1}</td>
                    <td class="p-2 font-bold">${u.name}</td>
                    <td class="p-2 text-yellow-500 font-black">${u.score || 0}</td>
                </tr>`).join('')}
            </table>
        </div>`;
        container.innerHTML += table;
    }
            }
