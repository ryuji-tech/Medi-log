// ==========================================================================
// 1. システムカレンダー日付 ➔ 2026年5月基準で展開
// ==========================================================================
const today = new Date();
let currentYear = 2026;  // デモ用に2026年固定
let currentMonth = 5;    // デモ用に5月固定

/**
 * 📦【最重要：医薬品マスタの土台】
 * status: "active"(現在有効) / "inactive"(過去の医薬品) / "deleted"(物理削除用フラグ)
 */
let medicineMaster = [
  {
    id: "master_001",
    name: "メディログ錠 10mg",
    status: "active",
    periodType: "daily",
    targetDays: [],
    intervalDays: 0,
    frequency: "2",
    detailUsageText: "朝・夕食後",
    dosages: { morning: "1", noon: "0", evening: "1", bedtime: "0" },
    categories: { morning: true, noon: false, evening: true, bedtime: false },
    tonyoRecords: [] // 頓用の後追い履歴用
  },
  {
    id: "master_002",
    name: "ライトアムロジピン カプセル",
    status: "active",
    periodType: "daily",
    targetDays: [],
    intervalDays: 0,
    frequency: "1",
    detailUsageText: "朝食後",
    dosages: { morning: "1", noon: "0", evening: "0", bedtime: "0" },
    categories: { morning: true, noon: false, evening: false, bedtime: false },
    tonyoRecords: []
  },
  {
    id: "master_003",
    name: "【曜日指定】毎週日曜日のお薬",
    status: "active",
    periodType: "weekly",
    targetDays: [0], // 日曜日
    intervalDays: 0,
    frequency: "1",
    detailUsageText: "朝食後",
    dosages: { morning: "1", noon: "0", evening: "0", bedtime: "0" },
    categories: { morning: true, noon: false, evening: false, bedtime: false },
    tonyoRecords: []
  },
  {
    id: "master_004",
    name: "【隔日】2日おきに飲むお薬",
    status: "active",
    periodType: "interval",
    targetDays: [],
    intervalDays: 2, 
    frequency: "1",
    detailUsageText: "夕食後",
    dosages: { morning: "0", noon: "0", evening: "1", bedtime: "0" },
    categories: { morning: false, noon: false, evening: true, bedtime: false },
    tonyoRecords: []
  },
  {
    id: "master_inactive_01",
    name: "【過去の履歴】ロキソニン 60mg",
    status: "inactive", // ⭐過去の医薬品としてアーカイブされている状態の土台
    periodType: "daily",
    targetDays: [],
    intervalDays: 0,
    frequency: "tonyo",
    detailUsageText: "頭痛・痛むとき（消炎鎮痛用）",
    dosages: { morning: "1", noon: "0", evening: "0", bedtime: "0" },
    categories: { morning: false, noon: false, evening: false, bedtime: false },
    tonyoRecords: []
  }
];

// 服用スケジュール（カレンダー連動用インスタンスDB）
let registeredMedicines = [
  {
    masterId: "master_001",
    startDate: "2026-05-15",
    endDate: "2026-05-31"
  },
  {
    masterId: "master_002",
    startDate: "2026-05-20",
    endDate: ""
  },
  {
    masterId: "master_003",
    startDate: "2026-05-01",
    endDate: ""
  },
  {
    masterId: "master_004",
    startDate: "2026-05-24", // ここから2日おき
    endDate: ""
  }
];

// ==========================================================================
// 2. カレンダー・変則周期・時刻判定アルゴリズム群
// ==========================================================================

function getFirstDayOfWeek(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * 📅 該当日に飲むお薬のフィルタリングロジック
 */
function getMedicinesForDay(year, month, day) {
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0,0,0,0);
  const targetDayOfWeek = targetDate.getDay();

  let todaysMeds = [];

  // 1. 定期スケジュール薬の判定
  registeredMedicines.forEach(reg => {
    const med = medicineMaster.find(m => m.id === reg.masterId);
    if (!med || med.status === "deleted") return; 

    // 期間判定
    const startDate = new Date(reg.startDate);
    startDate.setHours(0,0,0,0);
    if (targetDate < startDate) return;

    if (reg.endDate) {
      const endDate = new Date(reg.endDate);
      endDate.setHours(0,0,0,0);
      if (targetDate > endDate) return;
    }

    // スケジュールタイプ別判定
    if (med.periodType === "weekly") {
      if (med.targetDays.includes(targetDayOfWeek)) {
        todaysMeds.push({ info: med, type: "schedule", timeLog: null });
      }
    } else if (med.periodType === "interval") {
      const diffDays = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && (diffDays % med.intervalDays === 0)) {
        todaysMeds.push({ info: med, type: "schedule", timeLog: null });
      }
    } else {
      // 毎日
      if (med.frequency !== "tonyo") {
        todaysMeds.push({ info: med, type: "schedule", timeLog: null });
      }
    }
  });

  // 2. 頓用（とんよう）の後追い実録ログの引き当て判定
  medicineMaster.forEach(med => {
    if (med.status === "deleted") return;
    if (med.tonyoRecords && med.tonyoRecords.length > 0) {
      med.tonyoRecords.forEach(rec => {
        const recDate = new Date(rec.date);
        if (recDate.getFullYear() === year && (recDate.getMonth() + 1) === month && recDate.getDate() === day) {
          todaysMeds.push({ info: med, type: "tonyo_log", timeLog: rec.time });
        }
      });
    }
  });

  return todaysMeds;
}

// ==========================================================================
// 3. 画面レンダリング（カレンダー ＆ カルテ出力）
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
    const headerSlot = document.createElement("div");
    headerSlot.classList.add("calendar-header"); 
    headerSlot.textContent = weekdays[i];
    if (i === 5) headerSlot.classList.add("saturday"); 
    if (i === 6) headerSlot.classList.add("sunday");   
    headerRow.appendChild(headerSlot);
  }
  container.appendChild(headerRow); 

  const allSlots = [];
  for (let i = 0; i < ((firstDayIndex + 6) % 7); i++) {
    allSlots.push(document.createElement("div").classList.add("calendar-day", "empty")); 
  }

  const systemToday = new Date();

  for (let day = 1; day <= totalDays; day++) {
    const daySlot = document.createElement("div");
    daySlot.classList.add("calendar-day"); 
    daySlot.textContent = day;            
    daySlot.dataset.day = day; 

    // 「今日」マスのやんわり背景アクセント
    if (day === 28 && month === 5 && year === 2026) { // デモ固定日（2026年5月28日を「今日」と仮定）
      daySlot.classList.add("is-today");
    }

    const todaysMeds = getMedicinesForDay(year, month, day);
    if (todaysMeds.length > 0) daySlot.classList.add("has-med");
    allSlots.push(daySlot);        
  }

  for (let i = 0; i < allSlots.length; i += 7) {
    const weekSlots = allSlots.slice(i, i + 7);
    const weekRow = document.createElement("div");
    weekRow.classList.add("calendar-week-row");
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

        container.querySelectorAll(".accordion-panel").forEach(p => { if (p !== panel) p.classList.remove("is-open"); });

        const todaysMeds = getMedicinesForDay(year, month, day);
        let accordionHTML = `<h3 class="accordion-title">💊 ${month}月${day}日（${dayOfWeek}）の服薬インラインカルテ</h3>`;

        if (todaysMeds.length === 0) {
          accordionHTML += `<p class="no-medicine-msg">🌟 この日に服用するお薬の予定はありません。</p>`;
        } else {
          
          // 通常スケジュール薬のレンダリング
          const timeCategories = [
            { id: "morning",  label: "🌅 朝のむお薬" },
            { id: "noon",     label: "☀️ 昼のむお薬" },
            { id: "evening",  label: "🌌 夕のむお薬" },
            { id: "bedtime",  label: "🌙 眠前にのむお薬" }
          ];

          timeCategories.forEach(cat => {
            const matched = todaysMeds.filter(m => m.type === "schedule" && m.info.categories[cat.id]);
            if (matched.length > 0) {
              accordionHTML += `<div class="time-category-section"><div class="time-category-header">${cat.label}</div><div class="med-check-list">`;
              matched.forEach(m => {
                accordionHTML += `
                  <label class="med-check-item">
                    <input type="checkbox" class="med-checkbox">
                    <div class="med-check-info">
                      <span class="med-check-text">${m.info.name} <span style="color: #ea580c; font-weight:700; margin-left:4px;">【 1回 ${m.info.dosages[cat.id]}錠 】</span></span>
                      <span class="med-check-subtext">用法：${m.info.detailUsageText}</span>
                    </div>
                  </label>`;
              });
              accordionHTML += `</div></div>`;
            }
          });

          // ✨【新設：後追い】頓用（とんよう）の実服用時間ログ表示
          const tonyoLogs = todaysMeds.filter(m => m.type === "tonyo_log");
          if (tonyoLogs.length > 0) {
            accordionHTML += `<div class="time-category-section"><div class="time-category-header" style="color:#64748b;">🚨 症状に合わせて服用した記録（頓用）</div><div class="med-check-list">`;
            tonyoLogs.forEach(m => {
              accordionHTML += `
                <label class="med-check-item is-checked">
                  <input type="checkbox" class="med-checkbox" checked disabled>
                  <div class="med-check-info">
                    <span class="med-check-text" style="text-decoration:none; color:#334155;">${m.info.name} <span style="color: #475569; font-weight:700; margin-left:4px;">【 1回 ${m.info.dosages.morning}錠 】</span></span>
                    <span class="med-check-subtext" style="color:#0284c7; font-weight:700;">⏱️ ${m.timeLog} に服用済み（後追い記録）</span>
                  </div>
                </label>`;
            });
            accordionHTML += `</div></div>`;
          }
        }

        panel.innerHTML = accordionHTML;
        setTimeout(() => { panel.classList.add("is-open"); }, 10);

        setTimeout(() => {
          panel.querySelectorAll(".med-check-item").forEach(item => {
            const checkbox = item.querySelector(".med-checkbox");
            if(checkbox.disabled) return;
            item.addEventListener("change", () => {
              if (checkbox.checked) item.classList.add("is-checked");
              else item.classList.remove("is-checked");
            });
          });
        }, 20);
      });
    });
  }
}

// ==========================================================================
// 4. ドロップダウン（流用・引用メニュー）の動的構築
// ==========================================================================
function populateQuoteSelector() {
  const select = document.getElementById("quote-medicine-select");
  select.innerHTML = '<option value="">-- 選択してください --</option>';

  // 現在有効なお薬グループ
  const activeGroup = document.createElement("optgroup");
  activeGroup.label = "📋 現在登録中（有効）のお薬";
  medicineMaster.filter(m => m.status === "active").forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id; opt.textContent = m.name;
    activeGroup.appendChild(opt);
  });
  select.appendChild(activeGroup);

  // 過去の履歴お薬グループ
  const inactiveGroup = document.createElement("optgroup");
  inactiveGroup.label = "📁 過去に使用したお薬の履歴（流用元）";
  medicineMaster.filter(m => m.status === "inactive").forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id; opt.textContent = m.name;
    inactiveGroup.appendChild(opt);
  });
  select.appendChild(inactiveGroup);
}

// ==========================================================================
// 5. お薬登録用ボトムインフォ制御 ＆ 流用・引用トリガー
// ==========================================================================
const bottomSheet = document.getElementById("register-bottom-sheet");
const sheetOverlay = document.getElementById("bottom-sheet-overlay");
const frequencySelect = document.getElementById("med-frequency");
const detailUsageGroup = document.getElementById("detail-usage-group");
const detailUsageSelect = document.getElementById("med-detail-usage");
const freeInputGroup = document.getElementById("free-input-group");
const dosageGroup = document.getElementById("dosage-group");
const scheduleGroup = document.getElementById("schedule-group");
const scheduleWeeklyArea = document.getElementById("schedule-weekly-area");
const scheduleIntervalArea = document.getElementById("schedule-interval-area");
const tonyoTimeGroup = document.getElementById("tonyo-actual-time-group");

// 流用用切り替えラジオ
document.querySelectorAll('input[name="register-mode"]').forEach(radio => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "quote") {
      document.getElementById("quote-selector-area").classList.remove("hidden");
      populateQuoteSelector();
    } else {
      document.getElementById("quote-selector-area").classList.add("hidden");
    }
  });
});

/**
 * ✨【引用コアロジック】選択されたマスタからフォームへと値を引用・流用する
 */
document.getElementById("quote-medicine-select").addEventListener("change", (e) => {
  const id = e.target.value;
  if (!id) return;

  const target = medicineMaster.find(m => m.id === id);
  if (!target) return;

  // 1. 薬名と回数を自動流用
  document.getElementById("med-name").value = target.name;
  frequencySelect.value = target.frequency;
  frequencySelect.dispatchEvent(new Event("change")); // フォーム連動着火

  // 2. スケジュールタイプ流用
  document.querySelector(`input[name="med-period-type"][value="${target.periodType}"]`).checked = true;
  document.querySelector(`input[name="med-period-type"][value="${target.periodType}"]`).dispatchEvent(new Event("change"));

  if (target.periodType === "weekly") {
    scheduleWeeklyArea.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = target.targetDays.includes(parseInt(cb.value));
    });
  } else if (target.periodType === "interval") {
    document.getElementById("med-interval-days").value = target.intervalDays;
  }

  // 3. 服用量の流用
  if (target.frequency !== "tonyo") {
    document.getElementById("med-dosage-uniform").value = target.dosages.morning || "1";
  }
});

// スケジュールラジオ切り替え
document.querySelectorAll('input[name="med-period-type"]').forEach(r => {
  r.addEventListener("change", (e) => {
    scheduleWeeklyArea.classList.add("hidden"); scheduleIntervalArea.classList.add("hidden");
    if (e.target.value === "weekly") scheduleWeeklyArea.classList.remove("hidden");
    if (e.target.value === "interval") scheduleIntervalArea.classList.remove("hidden");
  });
});

// 用法切り替え時の頓用（とんよう）後追い対応
frequencySelect.addEventListener("change", (e) => {
  const value = e.target.value;
  detailUsageGroup.classList.add("hidden"); freeInputGroup.classList.add("hidden");
  dosageGroup.classList.add("hidden"); scheduleGroup.classList.remove("hidden");
  tonyoTimeGroup.classList.add("hidden");
  detailUsageSelect.innerHTML = "";

  if (!value) return;

  let options = [];
  if (value === "3") {
    options = [{ text: "朝・昼・夕食後（毎食後）", val: "3_after" }];
  } else if (value === "2") {
    options = [{ text: "朝・夕食後", val: "2_after" }];
  } else if (value === "1") {
    options = [{ text: "朝食後", val: "1_morning" }, { text: "就寝前（眠前）", val: "1_bedtime" }];
  } else if (value === "tonyo") {
    options = [{ text: "頭痛・痛むとき", val: "t_pain" }, { text: "熱があるとき", val: "t_fever" }];
  }

  if (options.length > 0) {
    options.forEach(opt => {
      const el = document.createElement("option"); el.value = opt.val; el.textContent = opt.text;
      detailUsageSelect.appendChild(el);
    });
    detailUsageGroup.classList.remove("hidden");
  }

  dosageGroup.classList.remove("hidden");

  // ✨【頓用専用UI分岐：土台】
  if (value === "tonyo") {
    scheduleGroup.classList.add("hidden");    // スケジュール設定はスキップ
    tonyoTimeGroup.classList.remove("hidden"); // 後追い実時刻フォームを出現させる
    
    // 現在時刻をデフォルトセット
    const now = new Date();
    document.getElementById("tonyo-actual-hour").value = String(now.getHours()).padStart(2, '0');
    document.getElementById("tonyo-actual-minute").value = String(now.getMinutes()).padStart(2, '0');
  }
});

// ==========================================================================
// 6. 登録処理コア
// ==========================================================================
document.getElementById("submit-register-btn").addEventListener("click", () => {
  const name = document.getElementById("med-name").value.trim();
  const startDate = document.getElementById("med-start-date").value;
  const endDate = document.getElementById("med-end-date").value;
  const frequency = frequencySelect.value;

  if (!name || !startDate || !frequency) {
    alert("必須項目が入力されていません。"); return;
  }

  // 1. 新しいマスタIDの生成、または流用IDの特定
  let targetMasterId = "master_" + Date.now();
  const isQuoteMode = document.querySelector('input[name="register-mode"]:checked').value === "quote";
  const selectedQuoteId = document.getElementById("quote-medicine-select").value;

  if (isQuoteMode && selectedQuoteId) {
    targetMasterId = selectedQuoteId; // 既存IDを流用
  }

  // マスタオブジェクトの組み立て（または更新）
  let periodType = document.querySelector('input[name="med-period-type"]:checked').value;
  let targetDays = [];
  let intervalDays = 0;

  if (frequency === "tonyo") periodType = "daily";

  if (periodType === "weekly") {
    scheduleWeeklyArea.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => targetDays.push(parseInt(cb.value)));
  } else if (periodType === "interval") {
    intervalDays = parseInt(document.getElementById("med-interval-days").value) || 2;
  }

  let detailUsageText = detailUsageSelect.options[detailUsageSelect.selectedIndex]?.text || "通常用法";
  let categories = { morning: false, noon: false, evening: false, bedtime: false };
  let dosages = { morning: "0", noon: "0", evening: "0", bedtime: "0" };
  const uniformAmount = document.getElementById("med-dosage-uniform").value || "1";

  if (frequency === "3") { categories.morning = true; categories.noon = true; categories.evening = true; dosages.morning = uniformAmount; dosages.noon = uniformAmount; dosages.evening = uniformAmount; }
  else if (frequency === "2") { categories.morning = true; categories.evening = true; dosages.morning = uniformAmount; dosages.evening = uniformAmount; }
  else if (frequency === "1") { categories.morning = true; dosages.morning = uniformAmount; }

  // 既存マスタがない場合は新規追加
  const existingMaster = medicineMaster.find(m => m.id === targetMasterId);
  if (!existingMaster) {
    medicineMaster.push({
      id: targetMasterId, name, status: "active", periodType, targetDays, intervalDays, frequency, detailUsageText, dosages, categories, tonyoRecords: []
    });
  } else {
    existingMaster.status = "active"; // 過去履歴から流用された場合は「有効」に復帰
  }

  // ✨ 頓用の場合は後追い服用記録（時刻）をプッシュ
  if (frequency === "tonyo") {
    const targetMed = medicineMaster.find(m => m.id === targetMasterId);
    const hr = document.getElementById("tonyo-actual-hour").value;
    const min = document.getElementById("tonyo-actual-minute").value;
    targetMed.tonyoRecords.push({
      date: startDate, // カレンダー上に打刻する日
      time: `${hr}:${min}`
    });
  } else {
    // 通常定期薬は服薬スケジュールに登録
    registeredMedicines.push({ masterId: targetMasterId, startDate, endDate });
  }

  alert(`堅実にお薬「${name}」の登録・流用処理を完了しました。`);
  
  // ボトムシートを閉じる
  bottomSheet.classList.remove("is-open");
  sheetOverlay.classList.remove("is-active");
  renderCalendar(currentYear, currentMonth);
});

// 初期ナビ
document.getElementById("floating-register-btn").addEventListener("click", () => {
  bottomSheet.classList.add("is-open"); sheetOverlay.classList.add("is-active");
  document.getElementById("med-start-date").value = "2026-05-28"; // 今日をデフォルト設定
});
document.getElementById("close-register-btn").addEventListener("click", () => { bottomSheet.classList.remove("is-open"); sheetOverlay.classList.remove("is-active"); });

// 初期描画
renderCalendar(currentYear, currentMonth);