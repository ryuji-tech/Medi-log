// === Firebase 接続 ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

// 接続できたか確認（あとで消す）
console.log("Firebase初期化:", app.name, app.options.projectId);

// ==========================================================================
// 1. データベース初期土台 ＆ localStorage 同期ロジック
// ==========================================================================

// 現実の時間にリンク（実行時の今日の日付を取得）
const today = new Date();
const SYSTEM_TODAY_STR = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

let currentYear = today.getFullYear();
let currentMonth = today.getMonth() + 1;

let activeTargetMasterIdForStop = null; // 服用終了処理中のお薬IDを一時保持
let currentOpenedDayStr = null;         // 💡 現在アコーディオンが開いている「年-月-日」を保持するステート

// --- 初期データ（localStorage が空のときに入るサンプル） ---
const DEFAULT_MEDICINE_MASTER = [
  {
    id: "master_001",
    name: "メディログ錠 10mg",
    status: "active",
    periodType: "daily", targetDays: [], intervalDays: 0, frequency: "2", detailUsageText: "朝・夕食後",
    dosages: { morning: "1", noon: "0", evening: "1", bedtime: "0" },
    categories: { morning: true, noon: false, evening: true, bedtime: false },
    tonyoRecords: []
  },
  {
    id: "master_002",
    name: "メディログカプセル 20mg",
    status: "active",
    periodType: "daily", targetDays: [], intervalDays: 0, frequency: "1", detailUsageText: "朝食後",
    dosages: { morning: "1", noon: "0", evening: "0", bedtime: "0" },
    categories: { morning: true, noon: false, evening: false, bedtime: false },
    tonyoRecords: []
  }
];

const DEFAULT_REGISTERED_MEDICINES = [
  { masterId: "master_001", startDate: "2026-05-15", endDate: "" },
  { masterId: "master_002", startDate: "2026-05-20", endDate: "" }
];

let medicineMaster = [];
let registeredMedicines = [];
let executionRecords = []; // 💡 定期薬の服薬チェック実績を保持する配列を追加

// 📥 localStorage からデータをロード
function loadDataFromStorage() {
  const storedMaster = localStorage.getItem("med_medicineMaster");
  const storedRegistered = localStorage.getItem("med_registeredMedicines");
  const storedExecution = localStorage.getItem("med_executionRecords"); // 💡 追加

  if (storedMaster && storedRegistered) {
    medicineMaster = JSON.parse(storedMaster);
    registeredMedicines = JSON.parse(storedRegistered);
    executionRecords = storedExecution ? JSON.parse(storedExecution) : []; // 💡 追加
  } else {
    medicineMaster = DEFAULT_MEDICINE_MASTER;
    registeredMedicines = DEFAULT_REGISTERED_MEDICINES;
    executionRecords = []; // 💡 追加
    saveDataToStorage();
  }
}

// 💾 localStorage に現在のステートを保存
function saveDataToStorage() {
  localStorage.setItem("med_medicineMaster", JSON.stringify(medicineMaster));
  localStorage.setItem("med_registeredMedicines", JSON.stringify(registeredMedicines));
  localStorage.setItem("med_executionRecords", JSON.stringify(executionRecords)); // 💡 追加
}

// ==========================================================================
// 2. 厳密な服薬スケジュール判定エンジン
// ==========================================================================
function getFirstDayOfWeek(year, month) { return new Date(year, month - 1, 1).getDay(); }
function getDaysInMonth(year, month) { return new Date(year, month, 0).getDate(); }

function getMedicinesForDay(year, month, day) {
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0,0,0,0);
  const targetDayOfWeek = targetDate.getDay(); 
  let todaysMeds = [];

  registeredMedicines.forEach(reg => {
    const med = medicineMaster.find(m => m.id === reg.masterId);
    if (!med || med.status !== "active") return; 

    const startDate = new Date(reg.startDate);
    startDate.setHours(0,0,0,0);
    if (targetDate < startDate) return;

    if (reg.endDate) {
      const endDate = new Date(reg.endDate);
      endDate.setHours(0,0,0,0);
      if (targetDate > endDate) return; 
    }

    if (med.periodType === "weekly" && med.targetDays.includes(targetDayOfWeek)) {
      todaysMeds.push({ info: med, type: "schedule", timeLog: null });
    } else if (med.periodType === "interval") {
      const diffDays = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && (diffDays % med.intervalDays === 0)) {
        todaysMeds.push({ info: med, type: "schedule", timeLog: null });
      }
    } else if (med.periodType === "daily" && med.frequency !== "tonyo") {
      todaysMeds.push({ info: med, type: "schedule", timeLog: null });
    }
  });

  medicineMaster.forEach(med => {
    if (med.status !== "active" || !med.tonyoRecords) return;
    med.tonyoRecords.forEach(rec => {
      const recDate = new Date(rec.date);
      if (recDate.getFullYear() === year && (recDate.getMonth() + 1) === month && recDate.getDate() === day) {
        todaysMeds.push({ info: med, type: "tonyo_log", timeLog: rec.time });
      }
    });
  });

  return todaysMeds;
}

// ==========================================================================
// 3. カレンダー ＆ 滑らかなインラインアコーディオン展開エンジン
// ==========================================================================
function renderCalendar(year, month) {
  const container = document.getElementById("calendar-container");
  container.innerHTML = ""; 
  document.getElementById("calendar-title").textContent = `${year}年 ${month}月`;

  const firstDayIndex = getFirstDayOfWeek(year, month); 
  const totalDays = getDaysInMonth(year, month);       
  const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

  const headerRow = document.createElement("div");
  headerRow.classList.add("calendar-header-row"); 
  for (let i = 0; i < weekdays.length; i++) {
    const slot = document.createElement("div"); slot.classList.add("calendar-header"); slot.textContent = weekdays[i];
    headerRow.appendChild(slot);
  }
  container.appendChild(headerRow); 

  const allSlots = [];
  for (let i = 0; i < ((firstDayIndex + 6) % 7); i++) {
    const emptySlot = document.createElement("div"); emptySlot.classList.add("calendar-day", "empty");
    allSlots.push(emptySlot); 
  }

  for (let day = 1; day <= totalDays; day++) {
    const daySlot = document.createElement("div");
    daySlot.classList.add("calendar-day"); daySlot.textContent = day; daySlot.dataset.day = day; 
    
    if (day === today.getDate() && month === (today.getMonth() + 1) && year === today.getFullYear()) {
      daySlot.classList.add("is-today");
    }

    const todaysMeds = getMedicinesForDay(year, month, day);
    if (todaysMeds.length > 0) daySlot.classList.add("has-med");
    allSlots.push(daySlot);        
  }

  for (let i = 0; i < allSlots.length; i += 7) {
    const weekSlots = allSlots.slice(i, i + 7);
    const weekRow = document.createElement("div"); weekRow.classList.add("calendar-week-row");
    weekSlots.forEach(slot => { if(slot) weekRow.appendChild(slot); });
    
    const panel = document.createElement("div"); 
    panel.classList.add("accordion-panel");
    
    container.appendChild(weekRow);
    container.appendChild(panel);

    weekSlots.forEach(slot => {
      if (!slot || slot.classList.contains("empty")) return; 
      
      slot.addEventListener("click", () => {
        const day = parseInt(slot.dataset.day);
        const dayOfWeek = weekdays[(firstDayIndex + day - 2 + 7) % 7];
        const clickedDayStr = `${year}-${month}-${day}`; // 識別用の一意な日付文字列

        // 💡 1. 状態に応じた開閉コントロール判断
        let shouldAnimateOpen = false;

        if (currentOpenedDayStr === clickedDayStr) {
          // 【パターンA】全く同じ日付を再度タップ ➔ アコーディオンを閉じる
          panel.classList.remove("is-open");
          currentOpenedDayStr = null;
          return; // 処理終了
        } else {
          // 【パターンB】別の日付をタップ
          // 他のすべての週アコーディオンは、閉じているかどうかにかかわらず念のためクラスを外す
          container.querySelectorAll(".accordion-panel").forEach(p => { 
            if (p !== panel) p.classList.remove("is-open"); 
          });

          // もし今回タップした日が「別の週」だった、あるいは「現在どこも開いていなかった」場合のみアニメーション起動
          if (!panel.classList.contains("is-open")) {
            shouldAnimateOpen = true;
          }
          // ※同じ週の別の日であれば、panel.classListはすでに is-open を持っているので何もしない（閉じない）
          
          currentOpenedDayStr = clickedDayStr;
        }

        // 💡 2. カルテのHTML中身の生成（開いたままで中身だけが瞬時に切り替わる）
        const todaysMeds = getMedicinesForDay(year, month, day);
        let html = `<h3 class="accordion-title">💊 ${month}月${day}日（${dayOfWeek}）の服薬予定</h3>`;

        if (todaysMeds.length === 0) {
          html += `<p class="no-medicine-msg">🌟 この日に服用するお薬の予定はありません。</p>`;
        } else {
          const cats = [
            { id: "morning", label: "🌅 朝のむお薬" }, { id: "noon", label: "☀️ 昼のむお薬" },
            { id: "evening", label: "🌌 夕のむお薬" }, { id: "bedtime", label: "🌙 眠前にのむお薬" }
          ];
          cats.forEach(cat => {
            const matched = todaysMeds.filter(m => m.type === "schedule" && m.info.categories[cat.id]);
            if (matched.length > 0) {
              html += `<div class="time-category-section"><div class="time-category-header">${cat.label}</div><div class="med-check-list">`;
              matched.forEach(m => {
                // 💡 実績配列内にこの日・この薬・この時間帯の記録が存在するか検証
                const isChecked = executionRecords.some(r => r.date === clickedDayStr && r.masterId === m.info.id && r.category === cat.id);
                
                html += `
                  <label class="med-check-item">
                    <input type="checkbox" class="med-checkbox" data-master-id="${m.info.id}" data-category="${cat.id}" ${isChecked ? 'checked' : ''}>
                    <div class="med-check-info">
                      <span class="med-check-text">${m.info.name} <span style="color: #ea580c; font-weight:700; margin-left:4px;">【 1回 ${m.info.dosages[cat.id]}錠 】</span></span>
                      <span class="med-check-subtext">用法：${m.info.detailUsageText}</span>
                    </div>
                  </label>`;
              });
              html += `</div></div>`;
            }
          });

          const tonyoLogs = todaysMeds.filter(m => m.type === "tonyo_log");
          if (tonyoLogs.length > 0) {
            html += `<div class="time-category-section"><div class="time-category-header" style="color:#64748b;">🚨 症状に合わせて服用した記録（頓用）</div><div class="med-check-list">`;
            tonyoLogs.forEach(m => {
              html += `
                <label class="med-check-item" style="background:#f1f5f9; cursor:default;">
                  <input type="checkbox" class="med-checkbox" checked disabled>
                  <div class="med-check-info">
                    <span class="med-check-text" style="color:#475569;">${m.info.name} <span style="color: #64748b; font-weight:700; margin-left:4px;">【 1回 分頓 】</span></span>
                    <span class="med-check-subtext" style="color:#0284c7; font-weight:700;">⏱️ ${m.timeLog} に服用済み</span>
                  </div>
                </label>`;
            });
            html += `</div></div>`;
          }
        }
        
        panel.innerHTML = html;

        // 💡 3. 生成したチェックボックスの変更（クリック）イベントを監視するロジックを追加
        panel.querySelectorAll(".med-checkbox:not([disabled])").forEach(cb => {
          cb.addEventListener("change", (e) => {
            const mId = e.target.dataset.masterId;
            const catId = e.target.dataset.category;

            if (e.target.checked) {
              // チェックされたら実績配列に追加
              executionRecords.push({ date: clickedDayStr, masterId: mId, category: catId });
            } else {
              // チェックが外されたら実績配列から削除
              executionRecords = executionRecords.filter(r => !(r.date === clickedDayStr && r.masterId === mId && r.category === catId));
            }
            saveDataToStorage(); // 💾 ローカルストレージに保存
          });
        });
        
        // 💡 新しく開く必要があるときだけ遅延させてクラスを付与（なめらかさ担保）
        if (shouldAnimateOpen) {
          setTimeout(() => { panel.classList.add("is-open"); }, 10);
        }
      });
    });
  }
}

// ==========================================================================
// 4. マスタ履歴一覧の動的描画
// ==========================================================================
function renderMasterListSheet() {
  const activeContainer = document.getElementById("active-meds-list");
  const inactiveContainer = document.getElementById("inactive-meds-list");
  activeContainer.innerHTML = ""; inactiveContainer.innerHTML = "";

  const systemToday = new Date(SYSTEM_TODAY_STR);
  systemToday.setHours(0,0,0,0);

  let activeCount = 0; let inactiveCount = 0;

  medicineMaster.forEach(m => {
    if (m.status !== "active") return;
    const reg = registeredMedicines.find(r => r.masterId === m.id);
    
    let isActive = true;
    if (reg && reg.endDate) {
      const endDate = new Date(reg.endDate);
      endDate.setHours(0,0,0,0);
      if (endDate < systemToday) isActive = false; 
    }

    const card = document.createElement("div");
    card.classList.add("med-master-card");

    if (isActive) {
      activeCount++;
      card.innerHTML = `
        <div class="med-master-card-header">
          <span class="med-master-card-title">💊 ${m.name}</span>
          <span class="med-master-card-meta">${m.frequency === "tonyo" ? "頓用" : m.detailUsageText}</span>
        </div>
        <div style="font-size:11px; color:#059669; margin-top:4px;">📅 連動服用中 (開始: ${reg?reg.startDate:'--'})</div>
        <div class="med-master-action-row">
          <button class="btn-action-small stop-trigger-btn" data-id="${m.id}">🛑 服用終了処理</button>
          <button class="btn-action-small delete-btn" data-id="${m.id}">🗑️ 削除</button>
        </div>`;
      activeContainer.appendChild(card);
    } else {
      inactiveCount++;
      card.innerHTML = `
        <div class="med-master-card-header">
          <span class="med-master-card-title" style="color:#64748b;">📁 ${m.name}</span>
          <span class="med-master-card-meta" style="color:#64748b;">服用終了</span>
        </div>
        <div style="font-size:11px; color:#64748b; margin-top:4px;">⏱️ 服用期間: ${reg.startDate} ～ ${reg.endDate}</div>`;
      inactiveContainer.appendChild(card);
    }
  });

  if (activeCount === 0) activeContainer.innerHTML = '<p class="no-medicine-msg">現在服用中のアクティブなお薬はありません。</p>';
  if (inactiveCount === 0) inactiveContainer.innerHTML = '<p class="no-medicine-msg">過去の処方履歴はありません。</p>';

  document.querySelectorAll(".stop-trigger-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeTargetMasterIdForStop = btn.dataset.id;
      document.getElementById("stop-med-date-input").value = SYSTEM_TODAY_STR; 
      document.getElementById("stop-date-modal").classList.remove("hidden");
    });
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const target = medicineMaster.find(m => m.id === id);
      if (target && confirm(`「${target.name}」をシステムから完全に削除しますか？\n（過去のカレンダーからも履歴が消えます）`)) {
        target.status = "deleted";
        saveDataToStorage(); // 💾 状態変更を即時保存
        renderMasterListSheet();
        renderCalendar(currentYear, currentMonth);
      }
    });
  });
}

// ==========================================================================
// 5. 新規登録フォーム ＆ 各種流用モーダル制御
// ==========================================================================
const bottomSheet = document.getElementById("register-bottom-sheet");
const sheetOverlay = document.getElementById("bottom-sheet-overlay");
const frequencySelect = document.getElementById("med-frequency");
const detailUsageGroup = document.getElementById("detail-usage-group");
const detailUsageSelect = document.getElementById("med-detail-usage");
const dosageGroup = document.getElementById("dosage-group");
const scheduleGroup = document.getElementById("schedule-group");
const scheduleWeeklyArea = document.getElementById("schedule-weekly-area");
const scheduleIntervalArea = document.getElementById("schedule-interval-area");
const tonyoTimeGroup = document.getElementById("tonyo-actual-time-group");

function populateQuoteSelector() {
  const select = document.getElementById("quote-medicine-select");
  select.innerHTML = '<option value="">-- 流用する医薬品を選択 --</option>';
  medicineMaster.filter(m => m.status === "active").forEach(m => {
    const opt = document.createElement("option"); opt.value = m.id; opt.textContent = m.name;
    select.appendChild(opt);
  });
}

document.querySelectorAll('input[name="register-mode"]').forEach(radio => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "quote") {
      document.getElementById("quote-selector-area").classList.remove("hidden"); populateQuoteSelector();
    } else { document.getElementById("quote-selector-area").classList.add("hidden"); }
  });
});

document.getElementById("quote-medicine-select").addEventListener("change", (e) => {
  const id = e.target.value; if (!id) return;
  const target = medicineMaster.find(m => m.id === id); if (!target) return;

  document.getElementById("med-name").value = target.name;
  frequencySelect.value = target.frequency; frequencySelect.dispatchEvent(new Event("change"));
  document.querySelector(`input[name="med-period-type"][value="${target.periodType}"]`).checked = true;
  document.querySelector(`input[name="med-period-type"][value="${target.periodType}"]`).dispatchEvent(new Event("change"));

  if (target.periodType === "weekly") {
    scheduleWeeklyArea.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = target.targetDays.includes(parseInt(cb.value)); });
  } else if (target.periodType === "interval") { document.getElementById("med-interval-days").value = target.intervalDays; }
  document.getElementById("med-dosage-uniform").value = target.dosages.morning || "1";
});

// 💡 【整流】登録実行処理（配列へのすべてのデータプッシュ完了後に正しく保存を実行）
document.getElementById("submit-register-btn").addEventListener("click", () => {
  const name = document.getElementById("med-name").value.trim();
  const startDate = document.getElementById("med-start-date").value;
  const endDate = document.getElementById("med-end-date").value;
  const frequency = frequencySelect.value;

  if (!name || !startDate || !frequency) { alert("必須項目に入力漏れがあります。"); return; }

  let targetMasterId = "master_" + Date.now();
  let periodType = document.querySelector('input[name="med-period-type"]:checked').value;
  let targetDays = []; let intervalDays = 0;
  if (frequency === "tonyo") periodType = "daily";

  if (periodType === "weekly") {
    scheduleWeeklyArea.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => targetDays.push(parseInt(cb.value)));
  } else if (periodType === "interval") { intervalDays = parseInt(document.getElementById("med-interval-days").value) || 2; }

  let detailUsageText = detailUsageSelect.options[detailUsageSelect.selectedIndex]?.text || "通常用法";
  let categories = { morning: false, noon: false, evening: false, bedtime: false };
  let dosages = { morning: "0", noon: "0", evening: "0", bedtime: "0" };
  const uniformAmount = document.getElementById("med-dosage-uniform").value || "1";

  if (frequency === "3") { categories.morning = true; categories.noon = true; categories.evening = true; dosages.morning = uniformAmount; dosages.noon = uniformAmount; dosages.evening = uniformAmount; }
  else if (frequency === "2") { categories.morning = true; categories.evening = true; dosages.morning = uniformAmount; dosages.evening = uniformAmount; }
  else if (frequency === "1") { categories.morning = true; dosages.morning = uniformAmount; }

  // ① マスタ配列へ登録情報を格納
  medicineMaster.push({
    id: targetMasterId, name, status: "active", periodType, targetDays, intervalDays, frequency, detailUsageText, dosages, categories, tonyoRecords: []
  });

  // ② 各服用モードに応じた連動データの追加処理
  if (frequency === "tonyo") {
    const targetMed = medicineMaster.find(m => m.id === targetMasterId);
    const hr = document.getElementById("tonyo-actual-hour").value; const min = document.getElementById("tonyo-actual-minute").value;
    targetMed.tonyoRecords.push({ date: startDate, time: `${hr}:${min}` });
  } else {
    registeredMedicines.push({ masterId: targetMasterId, startDate, endDate });
  }

  // 💾 ③ 【重要】すべての配列データへのプッシュが完了した「この瞬間」に保存！
  saveDataToStorage(); 

  alert(`「${name}」を新しく登録しました。`);
  bottomSheet.classList.remove("is-open"); sheetOverlay.classList.remove("is-active");
  
  // フォームクリア
  document.getElementById("med-name").value = "";
  frequencySelect.value = ""; frequencySelect.dispatchEvent(new Event("change"));

  renderCalendar(currentYear, currentMonth);
});

// ==========================================================================
// 6. グローバルウィンドウイベント・開閉トリガー結合
// ==========================================================================
document.getElementById("prev-month-btn").addEventListener("click", () => {
  currentMonth--; if (currentMonth < 1) { currentMonth = 12; currentYear--; }
  currentOpenedDayStr = null; // 月移動時はアコーディオン状態リセット
  renderCalendar(currentYear, currentMonth);
});
document.getElementById("next-month-btn").addEventListener("click", () => {
  currentMonth++; if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  currentOpenedDayStr = null; // 月移動時はアコーディオン状態リセット
  renderCalendar(currentYear, currentMonth);
});

document.getElementById("confirm-stop-btn").addEventListener("click", () => {
  const chosenDate = document.getElementById("stop-med-date-input").value;
  if (!chosenDate) { alert("終了日を指定してください。"); return; }

  const reg = registeredMedicines.find(r => r.masterId === activeTargetMasterIdForStop);
  const med = medicineMaster.find(m => m.id === activeTargetMasterIdForStop);

  if (reg && med) {
    reg.endDate = chosenDate; 
    saveDataToStorage(); // 💾 保存
    alert(`「${med.name}」の終了日を ${chosenDate} に保存しました。`);
    document.getElementById("stop-date-modal").classList.add("hidden");
    renderMasterListSheet();
    renderCalendar(currentYear, currentMonth);
  }
});

document.getElementById("cancel-stop-btn").addEventListener("click", () => {
  document.getElementById("stop-date-modal").classList.add("hidden");
});

document.getElementById("floating-master-btn").addEventListener("click", () => {
  document.getElementById("master-list-sheet").classList.remove("hidden"); renderMasterListSheet();
});
document.getElementById("close-master-list-btn").addEventListener("click", () => {
  document.getElementById("master-list-sheet").classList.add("hidden");
});
document.getElementById("floating-register-btn").addEventListener("click", () => {
  bottomSheet.classList.add("is-open"); sheetOverlay.classList.add("is-active");
  document.getElementById("med-start-date").value = SYSTEM_TODAY_STR;
});
document.getElementById("close-register-btn").addEventListener("click", () => {
  bottomSheet.classList.remove("is-open"); sheetOverlay.classList.remove("is-active");
});

document.querySelectorAll('input[name="med-period-type"]').forEach(r => {
  r.addEventListener("change", (e) => {
    scheduleWeeklyArea.classList.add("hidden"); scheduleIntervalArea.classList.add("hidden");
    if (e.target.value === "weekly") scheduleWeeklyArea.classList.remove("hidden");
    if (e.target.value === "interval") scheduleIntervalArea.classList.remove("hidden");
  });
});

frequencySelect.addEventListener("change", (e) => {
  const v = e.target.value; detailUsageGroup.classList.add("hidden"); dosageGroup.classList.add("hidden"); scheduleGroup.classList.remove("hidden"); tonyoTimeGroup.classList.add("hidden"); detailUsageSelect.innerHTML = "";
  if (!v) return;
  let opts = [];
  if (v === "3") opts = [{ text: "朝・昼・夕食後" }];
  else if (v === "2") opts = [{ text: "朝・夕食後" }];
  else if (v === "1") opts = [{ text: "朝食後" }];
  else if (v === "tonyo") opts = [{ text: "頭痛・痛むとき" }];
  
  if (opts.length > 0) {
    opts.forEach(o => { const el = document.createElement("option"); el.textContent = o.text; detailUsageSelect.appendChild(el); });
    detailUsageGroup.classList.remove("hidden");
  }
  dosageGroup.classList.remove("hidden");
  if (v === "tonyo") { scheduleGroup.classList.add("hidden"); tonyoTimeGroup.classList.remove("hidden"); }
});

// アプリ起動時のデータロード ➔ 描画トリガー
loadDataFromStorage();
renderCalendar(currentYear, currentMonth);


// ==========================================================================
// 7. 検証者のための localStorage 完全クリーンアップ（ガイダンス付き一括削除）
// ==========================================================================
document.getElementById("floating-clear-btn").addEventListener("click", () => {
  const guidanceMessage = 
    "デモページを触ってくれてありがとうございます。\n" +
    "OKを押下すると端末内の登録データを安全に削除することができます。\n" +
    "必要に応じて検証終了時に登録データの削除を行ってください。\n\n" +
    "このブラウザに保存されているアプリのデータをすべて消去し、初期状態に戻しますか？";

  if (confirm(guidanceMessage)) {
    localStorage.removeItem("med_medicineMaster");
    localStorage.removeItem("med_registeredMedicines");
    localStorage.removeItem("med_executionRecords"); // 💡 追加
    
    alert("データを安全に消去しました。初期状態に戻ります。");
    window.location.reload();
  }
});