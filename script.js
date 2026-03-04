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
// 3. إدارة الكويز (الاستدعاء السحري للجولة 10)
// ==========================================
function loadQ() {
    const day = document.getElementById('q-day').value;
    const version = document.getElementById('q-var').value;
    
    // أسئلة الجولة العاشرة الصعبة
    const day10HardQuestions = [
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

    db.collection("quizzes_pool").doc(`day_${day}`).get().then(doc => {
        setupQuestions(); 
        let dataToFill = null;

        // ميزة إضافية: لو اخترت يوم 10، نزل الأسئلة الصعبة فوراً
        if (day == "10") {
            dataToFill = day10HardQuestions;
            alert("✨ تم تجهيز الـ 15 سؤال بتوع الجولة 10! راجعهم ودوس 'حفظ' عشان تنشرهم.");
        } else if (doc.exists && doc.data().variations && doc.data().variations[version]) {
            dataToFill = doc.data().variations[version].questions;
            alert("تم استدعاء الأسئلة من الداتابيز ✅");
        } else {
            return alert("النسخة دي لسه ملهاش أسئلة، ابدأ اكتب!");
        }

        if (dataToFill) {
            const blocks = document.querySelectorAll('.q-block');
            dataToFill.forEach((q, i) => {
                if (blocks[i]) {
                    blocks[i].querySelector('.qt').value = q.q; 
                    blocks[i].querySelector('.o1').value = q.options[0];
                    blocks[i].querySelector('.o2').value = q.options[1];
                    blocks[i].querySelector('.o3').value = q.options[2];
                    blocks[i].querySelector('.o4').value = q.options[3];
                    blocks[i].querySelector('.ca').value = q.correctIndex || q.correct;
                }
            });
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
    
    let updateData = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    updateData[`variations.${version}`] = { questions: allQuestions };

    db.collection("quizzes_pool").doc(`day_${day}`).set(updateData, { merge: true })
      .then(() => alert("🚀 تم الحفظ والنشر بنجاح!"));
}

// ==========================================
// 4. إدارة المجموعات والمتسابقين (بقية دوالك الأصلية)
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
    db.collection("config").doc("groups_data").set({ list: globalGroups }).then(() => alert("تمت الإضافة ✅"));
}

function renderGroups() {
    let list = document.getElementById('grp-list');
    let select = document.getElementById('u-group');
    if(!list) return;
    list.innerHTML = "";
    if(select) select.innerHTML = '<option value="">اختر المجموعة</option>';
    globalGroups.forEach((g, i) => {
        if(select) select.innerHTML += `<option value="${i}">${g.group}</option>`;
        list.innerHTML += `<div class="glass-panel p-3 rounded-xl flex justify-between items-center mb-2 border border-gray-700"><div><b class="text-yellow-500">${g.group}</b></div><button onclick="delGrp(${i})" class="bg-red-900 p-2 rounded-lg text-[10px]">حذف</button></div>`;
    });
}

function addUsr() {
    let n = document.getElementById('u-name').value.trim();
    let gIdx = document.getElementById('u-group').value;
    let t = document.getElementById('u-team').value;
    if(!n || gIdx === "") return alert("كمل البيانات");
    let groupName = globalGroups[gIdx].group;
    let pass = Math.floor(100000 + Math.random() * 900000).toString();
    db.collection("users").add({ name: n, password: pass, group: groupName, team: t || "فردي", score: 0 }).then(() => alert("تم الإضافة وكود الدخول: " + pass));
}

function renderUsers() {
    let uL = document.getElementById('usr-list');
    if(!uL) return;
    uL.innerHTML = "";
    [...globalUsers].sort((a,b) => (b.score || 0) - (a.score || 0)).forEach(u => {
        uL.innerHTML += `<tr class="border-b border-gray-800"><td class="p-4"><b>${u.name}</b></td><td class="text-center font-bold text-yellow-500">${u.score || 0}</td><td class="p-4 flex gap-1 justify-center"><button onclick="edSc('${u.id}')" class="bg-blue-600 p-1 rounded text-[10px]">نقاط</button><button onclick="delUsr('${u.id}')" class="bg-red-600 p-1 rounded text-[10px]">حذف</button></td></tr>`;
    });
}

function setStatus(s) {
    const day = document.getElementById('pub-day').value;
    db.collection("settings").doc("global_status").set({ currentDay: parseInt(day), status: s }).then(() => alert(`تم التفعيل: ${s}`));
}

function edSc(id) {
    let val = prompt("أضف نقاط:", "0");
    if(val) db.collection("users").doc(id).update({ score: firebase.firestore.FieldValue.increment(parseInt(val)) });
}

function calculateGlobalRanking() {
    const container = document.getElementById('global-tables-container');
    if(!container) return;
    container.innerHTML = "";
    let groups = {};
    globalUsers.forEach(u => { if(!groups[u.group]) groups[u.group] = []; groups[u.group].push(u); });
    for(let gName in groups) {
        let sorted = groups[gName].sort((a,b) => (b.score||0)-(a.score||0));
        let table = `<div class="glass-panel rounded-2xl p-4 mb-4"><h3 class="text-yellow-500 mb-2 font-black">${gName}</h3><table class="w-full text-right text-[10px]">`;
        sorted.forEach((u, i) => { table += `<tr class="border-b border-gray-800"><td class="p-2">${i+1}</td><td class="p-2">${u.name}</td><td class="p-2 font-bold">${u.score}</td></tr>`; });
        table += "</table></div>";
        container.innerHTML += table;
    }
}
// الدوال الأخرى (openProfile, delGrp, loadTeams, saveMessage) تفضل كما هي في كودك..
                                                                                       
