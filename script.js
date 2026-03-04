// ==========================================
// 1. الإعدادات والربط
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
    setupDays();
    setupQuestions();
    startListening();
});

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

// ==========================================
// 2. إدارة الأسئلة (الجولة 10 + الحفظ في مسار 0)
// ==========================================
function loadQ() {
    const day = document.getElementById('q-day').value;
    const day10Hard = [
        { q: "اللاعب الوحيد سجل في نهائي الأبطال مع فريقين مختلفين في القرن الـ21؟", options: ["رونالدو", "ماندزوكيتش", "سواريز", "رونالدو وماندزوكيتش"], correctIndex: 3 },
        { q: "صاحب الرقم القياسي لأكثر أسيست في موسم واحد بالأبطال (9 أسيست)؟", options: ["نيمار", "ميسي", "جيمس ميلنر", "دي بروين"], correctIndex: 2 },
        { q: "مين اللي عمل الأسيست لإنييستا في نهائي كأس العالم 2010؟", options: ["تشافي", "فابريجاس", "توريس", "فيا"], correctIndex: 1 },
        { q: "أول لاعب فاز بجائزة الفتى الذهبي (Golden Boy) عام 2003؟", options: ["ميسي", "روني", "فان دير فارت", "فابريجاس"], correctIndex: 2 },
        { q: "سجل في نهائي (الأبطال، الدوري الأوروبي، كأس إنجلترا، وكأس الرابطة)؟", options: ["روني", "جيرارد", "لامبارد", "دروجبا"], correctIndex: 1 },
        { q: "صاحب أول هدف في افتتاحية كأس العالم 2010؟", options: ["تشابالالا", "المكسيك", "أوروجواي", "فرنسا"], correctIndex: 0 },
        { q: "أفضل لاعب في يورو 2004 (المعجزة اليونانية)؟", options: ["رونالدو", "خاريستياس", "زاغوراكيس", "نيدفيد"], correctIndex: 2 },
        { q: "أكثر حارس حافظ على نظافة شباكه في موسم واحد بالبريميرليج (24 مباراة)؟", options: ["إيدرسون", "أليسون", "بيتر تشيك", "دي خيا"], correctIndex: 2 },
        { q: "مين سجل هدف البرازيل الوحيد في خسارة الـ 7-1 أمام ألمانيا؟", options: ["نيمار", "أوسكار", "تياجو سيلفا", "ديفيد لويز"], correctIndex: 1 },
        { q: "اللاعب الوحيد اللي حقق كاس العالم للأندية مع 3 أندية مختلفة؟", options: ["رونالدو", "كروس", "كوفاتشيتش", "ليفاندوفسكي"], correctIndex: 2 },
        { q: "وصيف شفتشينكو في سباق الكرة الذهبية لعام 2004؟", options: ["رونالدينيو", "ديكو", "هنري", "لامبارد"], correctIndex: 1 },
        { q: "هداف الدوري الأوروبي في نسخة واحدة برصيد 17 هدف؟", options: ["فالكاو", "لوكاكو", "أوباميانج", "مورينو"], correctIndex: 0 },
        { q: "فاز بالحذاء الذهبي الأوروبي وهو بيلعب خارج الدوريات الكبرى (2001/2002)؟", options: ["ماريو جاردل", "هنريك لارسون", "زلاتان", "جاردل ولارسون"], correctIndex: 3 },
        { q: "صاحب أسرع هاتريك في تاريخ الدوري الإنجليزي (دقيقتين و56 ثانية)؟", options: ["ماني", "أجويرو", "هالاند", "فاولر"], correctIndex: 0 },
        { q: "النادي الحاصل على الدوري الإيطالي (سيري آ) موسم 2000-2001؟", options: ["يوفنتوس", "ميلان", "روما", "لاتسيو"], correctIndex: 2 }
    ];

    if(day == "10") {
        const blocks = document.querySelectorAll('.q-block');
        day10Hard.forEach((q, i) => {
            if (blocks[i]) {
                blocks[i].querySelector('.qt').value = q.q; 
                blocks[i].querySelector('.o1').value = q.options[0];
                blocks[i].querySelector('.o2').value = q.options[1];
                blocks[i].querySelector('.o3').value = q.options[2];
                blocks[i].querySelector('.o4').value = q.options[3];
                blocks[i].querySelector('.ca').value = q.correctIndex;
            }
        });
        alert("✅ تم استدعاء أسئلة الجولة 10 بنجاح!");
    }
}

function saveQ() {
    const day = document.getElementById('q-day').value;
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

    // الحفظ في نسخة "0" عشان تشتغل فوراً في صفحة الكويز
    let finalData = {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        variations: { "0": { questions: allQuestions } }
    };

    db.collection("quizzes_pool").doc(`day_${day}`).set(finalData, { merge: true })
    .then(() => alert("🚀 تم الحفظ والنشر! الكويز جاهز الآن."));
}

// ==========================================
// 3. إدارة المستخدمين (البروفايل + حذف السجل)
// ==========================================
function renderUsers() {
    let uL = document.getElementById('usr-list');
    if(!uL) return;
    uL.innerHTML = "";
    [...globalUsers].sort((a,b) => (b.score || 0) - (a.score || 0)).forEach(u => {
        uL.innerHTML += `
        <tr class="border-b border-gray-800">
            <td class="p-3"><b>${u.name}</b><br><small class="text-gray-500">${u.password}</small></td>
            <td class="text-center font-bold text-yellow-500">${u.score || 0}</td>
            <td class="p-3 flex gap-1 justify-center">
                <button onclick="openProfile('${u.id}')" class="bg-purple-600 p-2 rounded text-[10px]">البروفايل</button>
                <button onclick="edSc('${u.id}')" class="bg-blue-600 p-2 rounded text-[10px]">نقاط</button>
            </td>
        </tr>`;
    });
}

function openProfile(uid) {
    const user = globalUsers.find(u => u.id === uid);
    if(!user) return;
    
    // نافذة بسيطة لعرض السجلات وحذفها
    let logDay = prompt(`بروفايل: ${user.name}\nادخل رقم الجولة اللي عاوز تحذفها عشان يلعبها تاني (مثلاً 10):`);
    if(logDay) {
        if(confirm(`هل متأكد انك عاوز تحذف سجل الجولة ${logDay} للاعب؟`)) {
            db.collection("users").doc(uid).collection("game_logs").doc(`day_${logDay}`).delete()
            .then(() => alert("✅ تم حذف السجل، اللاعب يقدر يعيد الجولة الآن."));
        }
    }
}

function edSc(id) {
    let val = prompt("أضف نقاط (بالموجب للزيادة وبالسالب للنقص):", "0");
    if(val) db.collection("users").doc(id).update({ score: firebase.firestore.FieldValue.increment(parseInt(val)) });
}

// ==========================================
// 4. التحكم في الملعب (تعديل الحالة والدور)
// ==========================================
function setStatus(s) {
    const day = document.getElementById('pub-day').value;
    db.collection("settings").doc("global_status").set({
        currentDay: parseInt(day),
        status: s
    }).then(() => alert(`تم التفعيل: الجولة ${day} الآن ${s}`));
}

// ==========================================
// 5. المجموعات والترتيب (الدور الأخير)
// ==========================================
function setupDays() {
    let html = "";
    for(let d=1; d<=30; d++) html += `<option value="${d}">اليوم ${d}</option>`;
    ['q-day', 'pub-day'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = html; });
}

function setupQuestions() {
    let html = "";
    for(let i=1; i<=15; i++) {
        html += `
        <div class="q-block glass-panel p-4 rounded-xl mb-4 border border-gray-700 bg-gray-900">
            <textarea class="qt w-full p-2 text-sm rounded bg-black text-white mb-2" placeholder="السؤال ${i}"></textarea>
            <div class="grid grid-cols-2 gap-2">
                <input class="o1 p-2 text-xs rounded bg-black text-white" placeholder="خيار 1">
                <input class="o2 p-2 text-xs rounded bg-black text-white" placeholder="خيار 2">
                <input class="o3 p-2 text-xs rounded bg-black text-white" placeholder="خيار 3">
                <input class="o4 p-2 text-xs rounded bg-black text-white" placeholder="خيار 4">
            </div>
            <select class="ca w-full p-2 mt-2 text-xs text-green-400 bg-black rounded">
                <option value="0">الإجابة: 1</option><option value="1">الإجابة: 2</option><option value="2">الإجابة: 3</option><option value="3">الإجابة: 4</option>
            </select>
        </div>`;
    }
    if(document.getElementById('q-area')) document.getElementById('q-area').innerHTML = html;
}

function calculateGlobalRanking() {
    const container = document.getElementById('global-tables-container');
    if(!container) return;
    container.innerHTML = "";
    let groups = {};
    globalUsers.forEach(u => { if(!groups[u.group]) groups[u.group] = []; groups[u.group].push(u); });
    for(let gName in groups) {
        let sorted = groups[gName].sort((a,b) => (b.score||0)-(a.score||0));
        let table = `<div class="glass-panel p-4 mb-4"><h3>${gName}</h3><table class="w-full text-xs">`;
        sorted.forEach((u, i) => { table += `<tr class="border-b border-gray-800"><td class="p-2">${i+1}</td><td>${u.name}</td><td>${u.score}</td></tr>`; });
        table += "</table></div>";
        container.innerHTML += table;
    }
         }
         
