// --- 1. الأساسيات ---
let db = null;
let globalGroups = [];
let globalUsers = [];

const firebaseConfig = { 
    apiKey: "AIzaSyBZMnIJ_IOqeAfXqFt-m4tM1Lvo0tUDnk8", 
    projectId: "ramadan-87817", 
    appId: "1:343525703258:web:6776b4857425df8bcca263" 
};

// 🛡️ التعديل الجذري: تشغيل فوري بمجرد رسم الصفحة بدون انتظار الصور والملفات
document.addEventListener('DOMContentLoaded', () => {
    setupDays();
    setupQuestions();
    
    let status = document.getElementById('conn-status');
    if(status) {
        status.innerText = "جاري تهيئة النظام... ⏳";
    }
    
    waitForFirebase();
});

// مراقب ذكي للتأكد من تحميل الفايربيز
function waitForFirebase() {
    let maxWait = 30; // 15 ثانية كحد أقصى للانتظار
    let checks = 0;
    
    let interval = setInterval(() => {
        checks++;
        // لو الفايربيز حمل وبقى جاهز
        if (typeof firebase !== 'undefined' && typeof firebase.firestore !== 'undefined') {
            clearInterval(interval);
            initializeFirebase();
        } 
        // لو اتأخر جداً (مشكلة نت)
        else if (checks >= maxWait) {
            clearInterval(interval);
            let status = document.getElementById('conn-status');
            if(status) {
                status.innerText = "خطأ في تحميل قواعد البيانات 🔴 (تأكد من النت)";
                status.classList.replace('text-yellow-500', 'text-red-500');
            }
        }
    }, 500); // بيفحص كل نص ثانية
}

function initializeFirebase() {
    try {
        if (!firebase.apps.length) { 
            firebase.initializeApp(firebaseConfig); 
        }
        db = firebase.firestore();
        let status = document.getElementById('conn-status');
        if(status) {
            status.innerText = "متصل بنجاح 🟢";
            status.classList.replace('text-yellow-500', 'text-green-500');
        }
        startListening();
    } catch (e) {
        console.error("خطأ في الاتصال:", e);
        let status = document.getElementById('conn-status');
        if(status) {
            status.innerText = "خطأ داخلي 🔴";
            status.classList.replace('text-yellow-500', 'text-red-500');
        }
    }
}

function showTab(t, btn) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    let tab = document.getElementById('tab-'+t);
    if(tab) tab.style.display = 'block';
    if(btn) btn.classList.add('active');
}

function toggleGroupInputs() {
    let typeEl = document.getElementById('g-type');
    let areaEl = document.getElementById('teams-input-area');
    if(typeEl && areaEl) {
        areaEl.style.display = (typeEl.value === 'teams') ? 'grid' : 'none';
    }
}

function setupDays() {
    let html = "";
    for(let d=1; d<=30; d++) html += `<option value="${d}">اليوم ${d}</option>`;
    let qDay = document.getElementById('q-day');
    let pubDay = document.getElementById('pub-day');
    if(qDay) qDay.innerHTML = html;
    if(pubDay) pubDay.innerHTML = html;
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
    let qArea = document.getElementById('q-area');
    if(qArea) qArea.innerHTML = html;
}

function startListening() {
    db.collection("config").doc("groups_data").onSnapshot(s => {
        if(s.exists) { 
            globalGroups = s.data().list || []; 
        } else {
            globalGroups = [];
        }
        renderGroups(); 
    }, err => console.error(err));

    db.collection("users").onSnapshot(s => {
        globalUsers = [];
        s.forEach(d => globalUsers.push({id: d.id, ...d.data()}));
        renderUsers();
        calculateGlobalRanking();
    }, err => console.error(err));
}

function saveGrp() {
    let nameEl = document.getElementById('g-name');
    let typeEl = document.getElementById('g-type');
    if(!nameEl || !typeEl) return;
    
    const name = nameEl.value.trim();
    const type = typeEl.value;
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
        nameEl.value = "";
        let t1El = document.getElementById('t1');
        let t2El = document.getElementById('t2');
        if(t1El) t1El.value = "";
        if(t2El) t2El.value = "";
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
    if(!teamSelect) return;
    
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
        name: n, password: pass, group: groupName, team: t || "", score: 0, isBanned: false, isEliminated: false, cheatCount: 0
    }).then(() => {
        document.getElementById('u-name').value = "";
        let copyModal = document.getElementById('copy-modal');
        if(copyModal) copyModal.style.display = 'flex';
        let cpBtn = document.getElementById('cp-btn');
        if(cpBtn) {
            cpBtn.onclick = () => {
                navigator.clipboard.writeText(`الاسم: ${n}\nالكود: ${pass}`);
                alert("تم النسخ!");
            };
        }
    }).catch(err => alert("حدث خطأ أثناء الإنشاء"));
}

function renderUsers() {
    let uL = document.getElementById('usr-list');
    if(!uL) return;
    uL.innerHTML = "";
    
    let safeUsers = globalUsers.map(u => ({...u, score: u.score || 0}));
    safeUsers.sort((a,b) => b.score - a.score).forEach(u => {
        let cheatBadge = (u.cheatCount && u.cheatCount > 0) ? `<span onclick="resetCheat('${u.id}')" class="cursor-pointer bg-red-600/80 text-white px-2 py-0.5 rounded text-[10px] ml-1 border border-red-500 animate-pulse hover:bg-red-500" title="سبب الغش الأخير: ${u.lastCheatReason || 'غير محدد'} | اضغط لتصفير الغش"><i class="fas fa-flag"></i> غش (${u.cheatCount})</span>` : '';
        let elimClass = u.isEliminated ? 'text-gray-500 line-through' : '';
        let banClass = u.isBanned ? 'text-red-500 line-through' : '';

        uL.innerHTML += `<tr class="border-b border-gray-800 hover:bg-gray-800/50 transition">
            <td class="p-4 leading-relaxed">
                <b class="${banClass || elimClass}">${u.name || "مجهول"}</b> ${cheatBadge}
                <br><small class="text-yellow-500">${u.password || ""} | ${u.team || ""}</small>
                ${u.isEliminated ? '<br><small class="text-red-400 font-bold text-[10px]"><i class="fas fa-ban"></i> مقصى (لعب ودي)</small>' : ''}
            </td>
            <td class="text-center font-bold text-yellow-500 text-lg">${u.score}</td>
            <td class="p-4 flex flex-wrap gap-1 justify-center">
                <button onclick="openProfile('${u.id}')" class="bg-purple-700 hover:bg-purple-600 text-white p-2 rounded text-[10px] w-full mb-1"><i class="fas fa-user"></i> بروفايل</button>
                <button onclick="edSc('${u.id}',${u.score})" class="bg-blue-600 hover:bg-blue-500 p-2 rounded text-[10px] flex-1">نقط</button>
                <button onclick="eliminateUsr('${u.id}',${u.isEliminated || false})" class="${u.isEliminated ? 'bg-gray-600 hover:bg-gray-500' : 'bg-pink-700 hover:bg-pink-600'} p-2 rounded text-[10px] flex-1">${u.isEliminated?'فك الإقصاء':'خسر/إقصاء'}</button>
                <button onclick="banUsr('${u.id}',${u.isBanned || false})" class="bg-orange-600 hover:bg-orange-500 p-2 rounded text-[10px] flex-1">${u.isBanned?'فك حظر':'حظر'}</button>
                <button onclick="delUsr('${u.id}')" class="bg-red-600 hover:bg-red-500 p-2 rounded text-[10px] flex-1">حذف</button>
            </td>
        </tr>`;
    });
}

function resetCheat(userId) {
    if(confirm("هل تريد مسامحة اللاعب وتصفير عداد الغش الخاص به؟")) {
        db.collection("users").doc(userId).update({ cheatCount: 0, lastCheatReason: "" })
        .then(() => alert("تم تصفير الغش بنجاح!"))
        .catch(err => alert("حدث خطأ!"));
    }
}

function eliminateUsr(userId, currentState) {
    let msg = currentState ? "هل تريد فك الإقصاء عن هذا اللاعب؟" : "هل أنت متأكد من إقصاء اللاعب؟ (لن يتم احتساب نقاطه القادمة)";
    if(confirm(msg)) {
        db.collection("users").doc(userId).update({ isEliminated: !currentState })
        .then(() => alert("تم تحديث الحالة بنجاح!"))
        .catch(err => alert("حدث خطأ!"));
    }
}

let currentUserLogs = [];
let currentOpenedUserId = null; 

function openProfile(userId) {
    currentOpenedUserId = userId; 
    let user = globalUsers.find(u => u.id === userId);
    if(!user) return;

    let profName = document.getElementById('prof-name');
    let profTeam = document.getElementById('prof-team');
    let profScore = document.getElementById('prof-score');
    
    if(profName) profName.innerText = user.name || "مجهول";
    if(profTeam) profTeam.innerText = `${user.group || ""} | ${user.team || ""}`;
    if(profScore) profScore.innerText = user.score || 0;
    
    let filterHtml = `
        <div class="mb-3">
            <select id="log-day-filter" onchange="renderFilteredLogs()" class="w-full p-2 rounded-xl bg-gray-900 border border-purple-500 text-purple-300 text-sm outline-none">
                <option value="all">عرض كل الأيام</option>
                ${Array.from({length: 30}, (_, i) => `<option value="${i+1}">اليوم ${i+1}</option>`).join('')}
            </select>
        </div>
        <div id="logs-container" class="space-y-2"></div>
    `;
    
    let profLogs = document.getElementById('prof-logs');
    if(profLogs) profLogs.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">جاري تحميل السجل...</p>';
    
    let modal = document.getElementById('user-profile-modal');
    if(modal) modal.style.display = 'flex';

    db.collection("users").doc(userId).collection("game_logs").get().then(snap => {
        currentUserLogs = []; 
        snap.forEach(doc => currentUserLogs.push({docId: doc.id, ...doc.data()})); 
        currentUserLogs.sort((a,b) => (b.day || 0) - (a.day || 0));

        if(currentUserLogs.length === 0) {
            if(profLogs) profLogs.innerHTML = '<p class="text-center text-gray-500 text-sm py-4">لم يلعب أي جولة حتى الآن.</p>';
            return;
        }

        if(profLogs) profLogs.innerHTML = filterHtml;
        renderFilteredLogs(); 
        
    }).catch(err => {
        if(profLogs) profLogs.innerHTML = '<p class="text-center text-red-500 text-sm py-4">حدث خطأ في جلب السجل</p>';
    });
}

function renderFilteredLogs() {
    let filterSelect = document.getElementById('log-day-filter');
    let container = document.getElementById('logs-container');
    if(!container) return;
    
    let filterVal = filterSelect ? filterSelect.value : "all";
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
            <div class="flex items-center gap-3">
                <div class="text-center">
                    <span class="text-xl font-black text-green-400">${log.score || 0}</span>
                    <span class="text-[10px] text-gray-400 block -mt-1">نقطة</span>
                </div>
                <button onclick="cancelRound('${log.docId}', ${log.score})" class="bg-red-900/50 hover:bg-red-600 border border-red-500 text-red-100 p-1.5 rounded-lg text-xs transition-all shadow-md" title="إلغاء وخصم النقط ليلعبها مجدداً">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}

function cancelRound(logDocId, scoreToDeduct) {
    if(confirm(`هل أنت متأكد من إلغاء هذه الجولة؟\n- سيتم مسح الجولة ليتمكن من لعبها مجدداً.\n- سيتم خصم ${scoreToDeduct} نقطة من حسابه أوتوماتيكياً.`)) {
        
        db.collection("users").doc(currentOpenedUserId).collection("game_logs").doc(logDocId).delete()
        .then(() => {
            return db.collection("users").doc(currentOpenedUserId).update({
                score: firebase.firestore.FieldValue.increment(-scoreToDeduct)
            });
        })
        .then(() => {
            alert("✅ تم إلغاء الجولة وخصم النقاط بنجاح!");
            openProfile(currentOpenedUserId);
        })
        .catch(err => {
            alert("حدث خطأ أثناء الإلغاء!");
            console.error(err);
        });
    }
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

    if(questions.lengt
