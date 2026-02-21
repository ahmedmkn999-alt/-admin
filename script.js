// --- 1. الأساسيات ---
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
        try {
            if (typeof firebase === 'undefined') {
                let status = document.getElementById('conn-status');
                status.innerText = "خطأ في الاتصال بالانترنت 🔴";
                status.classList.replace('text-yellow-500', 'text-red-500');
                return;
            }
            if (!firebase.apps.length) { 
                firebase.initializeApp(firebaseConfig); 
            }
            db = firebase.firestore();
            let status = document.getElementById('conn-status');
            status.innerText = "متصل بنجاح 🟢";
            status.classList.replace('text-yellow-500', 'text-green-500');
            
            startListening();
        } catch (error) {
            console.error("خطأ:", error);
            document.getElementById('conn-status').innerText = "خطأ في الاتصال 🔴";
        }
    }, 500);
});

function startListening() {
    db.collection("config").doc("groups_data").onSnapshot(s => {
        if(s.exists) { 
            globalGroups = s.data().list || []; 
            renderGroups(); 
        } else {
            globalGroups = [];
            renderGroups();
        }
    }, err => console.error(err));

    db.collection("users").onSnapshot(s => {
        globalUsers = [];
        s.forEach(d => globalUsers.push({id: d.id, ...d.data()}));
        renderUsers();
        calculateGlobalRanking();
    }, err => console.error(err));
}

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
        document.getElementById('g-name').value = "";
        document.getElementById('t1').value = "";
        document.getElementById('t2').value = "";
        alert("تم الحفظ بنجاح");
    }).catch(err => alert("حدث خطأ أثناء الحفظ"));
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

        list.innerHTML += `<div class="glass-panel p-3 rounded-xl flex justify-between items-center mb-2">
            <div>
                <b class="text-yellow-500">${g.group || "بدون اسم"}</b>
                <small class="block text-gray-400">${teamStr}</small>
            </div>
            <button onclick="delGrp(${i})" class="text-red-500 text-xs font-bold">حذف</button>
        </div>`;
    });
}

function loadTeams() {
    let idx = document.getElementById('u-group').value;
    let teamSelect = document.getElementById('u-team');
    teamSelect.innerHTML = "";
    if(idx !== "" && globalGroups[idx]) {
        let g = globalGroups[idx];
        if(g.type === 'single') teamSelect.innerHTML = '<option value="فردي">فردي</option>';
        else if(g.teams && Array.isArray(g.teams)) g.teams.forEach(t => teamSelect.innerHTML += `<option value="${t}">${t}</option>`);
    }
}

function delGrp(i) {
    if(confirm("حذف المجموعة؟")) {
        globalGroups.splice(i, 1);
        db.collection("config").doc("groups_data").set({ list: globalGroups });
    }
}

function addUsr() {
    let n = document.getElementById('u-name').value.trim();
    let gIdx = document.getElementById('u-group').value;
    let t = document.getElementById('u-team').value;
    if(!n || gIdx === "") return alert("اكمل البيانات");

    let groupName = globalGroups[gIdx] ? globalGroups[gIdx].group : "غير معروف";
    let pass = Math.floor(100000 + Math.random() * 900000).toString();
    
    db.collection("users").add({
        name: n, password: pass, group: groupName, team: t || "", score: 0, isBanned: false, cheatCount: 0
    }).then(() => {
        document.getElementById('u-name').value = "";
        document.getElementById('copy-modal').style.display = 'flex';
        document.getElementById('cp-btn').onclick = () => {
            navigator.clipboard.writeText(`الاسم: ${n}\nالكود: ${pass}`);
            alert("تم النسخ!");
        };
    }).catch(err => alert("حدث خطأ أثناء الإنشاء"));
}

function renderUsers() {
    let uL = document.getElementById('usr-list');
    if(!uL) return;
    uL.innerHTML = "";
    
    let safeUsers = globalUsers.map(u => ({...u, score: u.score || 0}));
    safeUsers.sort((a,b) => b.score - a.score).forEach(u => {
        let cheatBadge = (u.cheatCount && u.cheatCount > 0) ? `<span class="bg-red-600/80 text-white px-2 py-0.5 rounded text-[10px] ml-1 border border-red-500 animate-pulse" title="سبب الغش الأخير: ${u.lastCheatReason || 'غير محدد'}"><i class="fas fa-flag"></i> غش (${u.cheatCount})</span>` : '';

        uL.innerHTML += `<tr class="border-b border-gray-800 hover:bg-gray-800/50 transition">
            <td class="p-4 leading-relaxed">
                <b class="${u.isBanned?'text-red-500 line-through':''}">${u.name || "مجهول"}</b> ${cheatBadge}
                <br><small class="text-yellow-500">${u.password || ""} | ${u.team || ""}</small>
            </td>
            <td class="text-center font-bold text-yellow-500 text-lg">${u.score}</td>
            <td class="p-4 flex flex-wrap gap-1 justify-center">
                <button onclick="openProfile('${u.id}')" class="bg-purple-700 hover:bg-purple-600 text-white p-2 rounded text-[10px] w-full mb-1"><i class="fas fa-user"></i> بروفايل</button>
                <button onclick="edSc('${u.id}',${u.score})" class="bg-blue-600 hover:bg-blue-500 p-2 rounded text-[10px] flex-1">نقط</button>
                <button onclick="banUsr('${u.id}',${u.isBanned || false})" class="bg-orange-600 hover:bg-orange-500 p-2 rounded text-[10px] flex-1">${u.isBanned?'فك':'حظر'}</button>
                <button onclick="delUsr('${u.id}')" class="bg-red-600 hover:bg-red-500 p-2 rounded text-[10px] flex-1">حذف</button>
            </td>
        </tr>`;
    });
}

// متغير عالمي لحفظ سجل اللاعب الحالي عشان نعرف نفلتره
let currentUserLogs = [];

function openProfile(userId) {
    let user = globalUsers.find(u => u.id === userId);
    if(!user) return;

    document.getElementById('prof-name').innerText = user.name || "مجهول";
    document.getElementById('prof-team').innerText = `${user.group || ""} | ${user.team || ""}`;
    document.getElementById('prof-score').innerText = user.score || 0;
    
    // تجهيز الفلتر والسجل في الواجهة
    let filterHtml = `
        <div class="mb-3">
            <select id="log-day-filter" onchange="renderFilteredLogs()" class="w-full p-2 rounded-xl bg-gray-900 border border-purple-500 text-purple-300 text-sm outline-none">
                <option value="all">عرض كل الأيام</option>
                ${Array.from({length: 30}, (_, i) => `<option value="${i+1}">اليوم ${i+1}</option>`).join('')}
            </select>
        </div>
        <div id="logs-container" class="space-y-2"></div>
    `;
    
    document.getElementById('prof-logs').innerHTML = '<p class="text-center text-gray-400 text-sm py-4">جاري تحميل السجل...</p>';
    document.getElementById('user-profile-modal').style.display = 'flex';

    db.collection("users").doc(userId).collection("game_logs").get().then(snap => {
        currentUserLogs = []; // تفريغ السجل القديم
        snap.forEach(doc => currentUserLogs.push(doc.data()));
        currentUserLogs.sort((a,b) => (b.day || 0) - (a.day || 0));

        if(currentUserLogs.length === 0) {
            document.getElementById('prof-logs').innerHTML = '<p class="text-center text-gray-500 text-sm py-4">لم يلعب أي جولة حتى الآن.</p>';
            return;
        }

        document.getElementById('prof-logs').innerHTML = filterHtml;
        renderFilteredLogs(); // عرض السجل كله كبداية
        
    }).catch(err => {
        document.getElementById('prof-logs').innerHTML = '<p class="text-center text-red-500 text-sm py-4">حدث خطأ في جلب السجل</p>';
    });
}

// دالة جديدة لفلترة وعرض السجل بناءً على اليوم المختار
function renderFilteredLogs() {
    let filterVal = document.getElementById('log-day-filter').value;
    let container = document.getElementById('logs-container');
    container.innerHTML = "";

    let filteredLogs = currentUserLogs;
    if(filterVal !== "all") {
        filteredLogs = currentUserLogs.filter(log => log.day === parseInt(filterVal));
    }

    if(filteredLogs.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 text-sm py-4">لم يلعب في هذا اليوم.</p>`;
        return;
    }

    let html = "";
    filteredLogs.forEach(log => {
        let dateStr = 'غير معروف';
        if (log.timestamp && typeof log.timestamp.toDate === 'function') {
            dateStr = log.timestamp.toDate().toLocaleString('ar-EG', { hour12: true, month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' });
        }

        html += `<div class="bg-gray-800/80 p-3 rounded-xl flex justify-between items-center border border-gray-700 hover:border-purple-500/50 transition">
            <div>
                <p class="text-white font-bold text-sm">الجولة ${log.day || "?"}</p>
                <p class="text-[10px] text-gray-400"><i class="fas fa-clock mr-1"></i> ${dateStr}</p>
            </div>
            <div class="text-center">
                <span class="text-xl font-black text-green-400">${log.score || 0}</span>
                <span class="text-[10px] text-gray-400 block -mt-1">نقطة</span>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}

function calculateGlobalRanking() {
    try {
        let container = document.getElementById('global-tables-container');
        if(!container) return;
        container.innerHTML = "";
        let groups = {};
        
        globalUsers.forEach(u => {
            let g = u.group || "بدون مجموعة";
            if(!groups[g]) groups[g] = {};
            let key = u.team || "مجهول";
            if (u.team === "فردي" || !u.team) key = u.name || "مجهول";
            groups[g][key] = (groups[g][key] || 0) + (u.score || 0);
        });

        for (let gName in groups) {
            let sorted = Object.entries(groups[gName]).sort((a,b) => b[1] - a[1]);
            let html = `<div class="glass-panel rounded-2xl overflow-hidden border border-yellow-600/30 mb-4">
                <div class="bg-gray-900 p-3 text-yellow-500 font-bold text-center">🏆 ${gName}</div>
                <table class="w-full text-right text-xs">
                    <thead><tr class="bg-gray-800 text-gray-400"><th class="p-2">#</th><th class="p-2">الكيان</th><th class="p-2 text-center">النقاط</th></tr></thead>
                    <tbody>`;
            sorted.forEach((ent, i) => {
                html += `<tr class="border-b border-gray-800">
                    <td class="p-2">${i+1}</td><td class="p-2 font-bold">${ent[0]}</td><td class="p-2 text-center text-yellow-500">${ent[1]}</td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
            container.innerHTML += html;
        }
    } catch (err) { console.error("خطأ في الترتيب:", err); }
}

function loadQ() {
    let d = document.getElementById('q-day').value;
    let v = document.getElementById('q-var').value;
    
    db.collection("quizzes_pool").doc("day_"+d).get().then(doc => {
        if(doc.exists && doc.data().variations && doc.data().variations[v]) {
            let questions = doc.data().variations[v].questions || [];
            let blocks = document.querySelectorAll('.q-block');
            
            blocks.forEach((b, i) => {
                if(questions[i]) {
                    b.querySelector('.qt').value = questions[i].q || "";
                    b.querySelector('.o1').value = questions[i].options[0] || "";
                    b.querySelector('.o2').value = questions[i].options[1] || "";
                    b.querySelector('.o3').value = questions[i].options[2] || "";
                    b.querySelector('.o4').value = questions[i].options[3] || "";
                    b.querySelector('.ca').value = questions[i].correctIndex || "0";
                } else {
                    b.querySelector('.qt').value = "";
                    b.querySelector('.o1').value = "";
                    b.querySelector('.o2').value = "";
                    b.querySelector('.o3').value = "";
                    b.querySelector('.o4').value = "";
                    b.querySelector('.ca').value = "0";
                }
            });
            alert("✅ تم استدعاء الأسئلة بنجاح. يمكنك التعديل الآن.");
        } else {
            alert("⚠️ لا توجد أسئلة مسجلة لهذه النسخة في هذا اليوم.");
        }
    }).catch(err => alert("حدث خطأ أثناء الاستدعاء!"));
}

function saveQ() {
    let d = document.getElementById('q-day').value;
    let v = document.getElementById('q-var').value;
    let questions = [];
    document.querySelectorAll('.q-block').forEach(b => {
        let qText = b.querySelector('.qt').value.trim();
        if(qText !== "") { 
            questions.push({
                q: qText,
                options: [b.querySelector('.o1').value, b.querySelector('.o2').value, b.querySelector('.o3').value, b.querySelector('.o4').value],
                correctIndex: parseInt(b.querySelector('.ca').value || 0)
            });
        }
    });

    if(questions.length === 0) return alert("لا يمكن حفظ كويز فارغ!");

    db.collection("quizzes_pool").doc("day_"+d).set({
        variations: { [v]: { questions: questions } }
    }, {merge: true}).then(() => alert("✅ تم الحفظ بنجاح")).catch(err => alert("حدث خطأ"));
}

function setStatus(s) {
    let d = document.getElementById('pub-day').value;
    db.collection("settings").doc("global_status").set({ currentDay: parseInt(d), status: s }).then(() => alert("تم التحديث"));
}

function saveMessage(doc) {
    let val = (doc === 'champData') ? document.getElementById('msg-champ').value : document.getElementById('msg-daily').value;
    db.collection("settings").doc(doc).set({ message: val }).then(() => alert("تم النشر"));
}

function edSc(id, old) {
    let n = prompt("تعديل النقاط (أدخل القيمة لإضافتها أو خصمها بـ -):", "0");
    if(n && !isNaN(n)) db.collection("users").doc(id).update({ score: old + parseInt(n) });
}
function banUsr(id, s) { db.collection("users").doc(id).update({ isBanned: !s }); }
function delUsr(id) { if(confirm("هل أنت متأكد من حذف المتسابق نهائياً؟")) db.collection("users").doc(id).delete(); }
function logOut() { localStorage.removeItem('admin_access'); window.location.reload(); }
