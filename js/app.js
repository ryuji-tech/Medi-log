// ==========================================================================
// 1. グローバル変数（アプリケーションの状態・仮データベース管理）
// ==========================================================================
const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth() + 1; 

/**
 * 🟢【データベース拡張】登録データに「1回あたりの服用量（dosages）」を完全追加
 * 1つの薬で、時間帯（morning等）ごとに異なる量が自動保持できるように設計
 */
let registeredMedicines = [
  {
    name: "メディログ錠 10mg",
    startDate: "2026-05-15",
    endDate: "2026-05-25",
    frequency: "2",
    detailUsageText: "朝・夕食後",
    // 一律処方マッピングのデータ構造
    dosages: { morning: "1", noon: "0", evening: "1", bedtime: "0" },
    categories: { morning: true, noon: false, evening: true, bedtime: false }
  },
  {
    name: "傾斜テスト用お薬（例：朝2 昼1 夕1）",
    startDate: "2026-05-20",
    endDate: "", // 終了日なし＝永続
    frequency: "3",
    detailUsageText: "朝・昼・夕食後",
    // ✨【Ryuさん提案】傾斜・変則処方マッピングのデータ構造
    dosages: { morning: "2", noon: "1", evening: "1", bedtime: "0" },
    categories: { morning: true, noon: true, evening: true, bedtime: false }
  }
];

// ==========================================================================
// 2. 日付・カレンダー演算・連動判定ロジック（純粋関数群）
// ==========================================================================

function getFirstDayOfWeek(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  return firstDay.getDay();
}

function getDaysInMonth(year, month) {
  const lastDay = new Date(year, month, 0);
  return lastDay.getDate();
}

function isDateInPeriod(targetYear, targetMonth, targetDay, startStr, endStr) {
  const targetDate = new Date(targetYear, targetMonth - 1, targetDay);
  const startDate = new Date(startStr);
  startDate.setHours(0,0,0,0);
  
  if (targetDate < startDate) return false;

  if (endStr) {
    const endDate = new Date(endStr);
    endDate.setHours(0,0,0,0);
    return targetDate <= endDate;
  }
  return true;
}

function getMedicinesForDay(year, month, day) {
  return registeredMedicines.filter(med => {
    return isDateInPeriod(year, month, day, med.startDate, med.endDate);
  });
}

// ==========================================================================
// 3. カレンダー描画・UI制御メイン関数（レンダリング・DOM操作担当）
// ==========================================================================
function renderCalendar(year, month) {
  const container = document.getElementById("calendar-container");
  container.innerHTML = ""; 

  const title = document.getElementById("calendar-title");
  title.textContent = `${year}年 ${month}月`;

  const firstDayIndex = getFirstDayOfWeek(year, month); 
  const totalDays = getDaysInMonth(year, month);       
  const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

  // 曜日ヘッダー行の独立生成と配置
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

  // 週単位分割アコーディオン構築
  const allSlots = [];

  for (let i = 0; i < ((firstDayIndex + 6) % 7); i++) {
    const emptySlot = document.createElement("div");
    emptySlot.classList.add("calendar-day", "empty"); 
    allSlots.push(emptySlot); 
  }

  for (let day = 1; day <= totalDays; day++) {
    const daySlot = document.createElement("div");
    daySlot.classList.add("calendar-day"); 
    daySlot.textContent = day;            
    daySlot.dataset.day = day; 

    const todaysMeds = getMedicinesForDay(year, month, day);
    if (todaysMeds.length > 0) {
      daySlot.classList.add("has-med");
    }
    allSlots.push(daySlot);        
  }

  for (let i = 0; i < allSlots.length; i += 7) {
    const weekSlots = allSlots.slice(i, i + 7);
    
    const weekRow = document.createElement("div");
    weekRow.classList.add("calendar-week-row");
    weekSlots.forEach(slot => weekRow.appendChild(slot));
    
    const panel = document.createElement("div");
    panel.classList.add("accordion-panel");
    
    container.appendChild(weekRow);
    container.appendChild(panel);

    weekSlots.forEach(slot => {
      if (slot.classList.contains("empty")) return; 

      slot.addEventListener("click", () => {
        const day = parseInt(slot.dataset.day);
        const dayOfWeek = weekdays[(firstDayIndex + day - 2 + 7) % 7];

        const allPanels = container.querySelectorAll(".accordion-panel");
        allPanels.forEach(p => {
          if (p !== panel) p.classList.remove("is-open");
        });

        const todaysMeds = getMedicinesForDay(year, month, day);
        
        let accordionHTML = `<h3 class="accordion-title">💊 ${month}月${day}日（${dayOfWeek}）の服薬インラインカルテ</h3>`;

        if (todaysMeds.length === 0) {
          accordionHTML += `<p class="no-medicine-msg">🌟 この日に服用するお薬の予定はありません。</p>`;
        } else {
          
          // ✨【改善案①：時間帯マスター定義】
          // 薬をバラバラに出すのではなく、時間帯の枠組みを最優先してループを回す
          const timeCategories = [
            { id: "morning",  label: "🌅 朝のむお薬",  className: "morning" },
            { id: "noon",     label: "☀️ 昼のむお薬",  className: "noon" },
            { id: "evening",  label: "🌌 夕のむお薬",  className: "evening" },
            { id: "bedtime",  label: "🌙 眠前にのむお薬", className: "bedtime" }
          ];

          let hasRegularMeds = false;

          // 定期薬（朝・昼・夕・眠前）をカテゴリーごとに固めて出力
          timeCategories.forEach(cat => {
            // この時間帯に対象となるお薬があるかフィルタリング
            const matchedMeds = todaysMeds.filter(med => med.categories[cat.id]);

            if (matchedMeds.length > 0) {
              hasRegularMeds = true;
              // 時間帯ごとの独立セクションを構築（視線誘導の最適化）
              accordionHTML += `
                <div class="time-category-section">
                  <div class="time-category-header">${cat.label}</div>
                  <div class="med-check-list">
              `;

              matchedMeds.forEach(med => {
                // その時間帯専用の服用数をデータベースから安全に取得
                const doseAmount = med.dosages[cat.id] || "1";
                
                // 用法テキストから「1日何回」を逆算して、全体像の補足テキストを生成
                let frequencyText = "";
                if (med.frequency === "3") frequencyText = "1日3回";
                else if (med.frequency === "2") frequencyText = "1日2回";
                else if (med.frequency === "1") frequencyText = "1日1回";
                else frequencyText = "特注用法";

                accordionHTML += `
                  <label class="med-check-item">
                    <input type="checkbox" class="med-checkbox">
                    <div class="med-check-info">
                      <span class="med-check-text">${med.name} <span style="color: #ea580c; font-weight:700; margin-left:4px;">【 1回 ${doseAmount}錠 】</span></span>
                      <span class="med-check-subtext">全体スケジュール：${frequencyText} （${med.detailUsageText}）</span>
                    </div>
                  </label>
                `;
              });

              accordionHTML += `</div></div>`; // 閉じタグ
            }
          });

          // 頓用（症状時）のお薬セクションは、最下部に独立して配置
          const tonyoMeds = todaysMeds.filter(med => med.frequency === "tonyo");
          if (tonyoMeds.length > 0) {
            accordionHTML += `
              <div class="time-category-section">
                <div class="time-category-header" style="color:#64748b;">🚨 症状があるとき飲むお薬（頓用）</div>
                <div class="med-check-list">
            `;
            tonyoMeds.forEach(med => {
              const doseAmount = med.dosages.morning || "1"; // 頓用はmorningに代表値を格納
              accordionHTML += `
                <label class="med-check-item">
                  <input type="checkbox" class="med-checkbox">
                  <div class="med-check-info">
                    <span class="med-check-text">${med.name} <span style="color: #64748b; font-weight:700; margin-left:4px;">【 1回 ${doseAmount}錠 】</span></span>
                    <span class="med-check-subtext">指示タイミング：${med.detailUsageText}</span>
                  </div>
                </label>
              `;
            });
            accordionHTML += `</div></div>`;
          }
        }

        // パネルへ流し込み
        if (panel.classList.contains("is-open")) {
          panel.innerHTML = accordionHTML;
        } else {
          panel.innerHTML = accordionHTML;
          setTimeout(() => { panel.classList.add("is-open"); }, 10);
        }

        // チェック時の達成感アニメーションのバインド
        setTimeout(() => {
          const checkItems = panel.querySelectorAll(".med-check-item");
          checkItems.forEach(item => {
            const checkbox = item.querySelector(".med-checkbox");
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
// 4. グローバルナビゲーション制御
// ==========================================================================
document.getElementById("prev-month-btn").addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 1) { currentMonth = 12; currentYear--; }
  renderCalendar(currentYear, currentMonth);
});
document.getElementById("next-month-btn").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  renderCalendar(currentYear, currentMonth);
});

// ==========================================================================
// 5. お薬登録用ボトムインフォ制御 ＆ 🧠【一律 ➔ 変則ハイブリッドUI制御】
// ==========================================================================
const floatingBtn = document.getElementById("floating-register-btn");
const bottomSheet = document.getElementById("register-bottom-sheet");
const sheetOverlay = document.getElementById("bottom-sheet-overlay");
const closeSheetBtn = document.getElementById("close-register-btn");

const frequencySelect = document.getElementById("med-frequency");
const detailUsageGroup = document.getElementById("detail-usage-group");
const detailUsageSelect = document.getElementById("med-detail-usage");
const freeInputGroup = document.getElementById("free-input-group");
const timeCategoryGroup = document.getElementById("time-category-group");

// ✨【新設キャッシュ】服用量関連のDOM要素
const dosageGroup = document.getElementById("dosage-group");
const dosageUniformArea = document.getElementById("dosage-uniform-area");
const toggleVariableDosage = document.getElementById("toggle-variable-dosage");
const dosageVariableArea = document.getElementById("dosage-variable-area");
const switchLabel = document.getElementById("variable-dosage-switch-label");

// 内訳ボックスのキャッシュ
const vMorning = document.getElementById("v-input-morning");
const vNoon = document.getElementById("v-input-noon");
const vEvening = document.getElementById("v-input-evening");
const vBedtime = document.getElementById("v-input-bedtime");

function openBottomSheet() {
  bottomSheet.classList.add("is-open");
  sheetOverlay.classList.add("is-active");
  document.getElementById("med-start-date").value = new Date().toISOString().split('T')[0];
}

function closeBottomSheet() {
  bottomSheet.classList.remove("is-open");
  sheetOverlay.classList.remove("is-active");
  
  // フォーム完全初期化
  document.getElementById("med-name").value = "";
  document.getElementById("med-end-date").value = "";
  frequencySelect.value = "";
  toggleVariableDosage.checked = false;
  document.getElementById("med-dosage-uniform").value = "1";
  document.getElementById("dosage-m").value = "";
  document.getElementById("dosage-n").value = "";
  document.getElementById("dosage-e").value = "";
  document.getElementById("dosage-b").value = "";
  
  detailUsageGroup.classList.add("hidden");
  freeInputGroup.classList.add("hidden");
  dosageGroup.classList.add("hidden");
  timeCategoryGroup.classList.add("hidden");
}

floatingBtn.addEventListener("click", openBottomSheet);
closeSheetBtn.addEventListener("click", closeBottomSheet);
sheetOverlay.addEventListener("click", closeBottomSheet);

/**
 * ✨【新設ロジック】服用回数に基づいて、変則時の「内訳入力欄」をスマートに絞り込む関数
 * 例：1日2回（朝夕）なら、朝と夕の内訳欄だけを出して、関係ない昼・眠前は最初から非表示にする
 */
function updateVariableInputsVisibility(frequency, usageVal) {
  // 一旦内訳欄を全部隠す
  vMorning.classList.add("hidden");
  vNoon.classList.add("hidden");
  vEvening.classList.add("hidden");
  vBedtime.classList.add("hidden");

  if (frequency === "3") {
    vMorning.classList.remove("hidden"); vNoon.classList.remove("hidden"); vEvening.classList.remove("hidden");
  } else if (frequency === "2") {
    if (usageVal.includes("morning")) vMorning.classList.remove("hidden");
    if (usageVal.includes("noon")) vNoon.classList.remove("hidden");
    if (usageVal.includes("evening")) vEvening.classList.remove("hidden");
    if (usageVal.includes("bedtime")) vBedtime.classList.remove("hidden");
  } else if (frequency === "1") {
    if (usageVal.includes("morning") || usageVal.includes("wakeup")) vMorning.classList.remove("hidden");
    if (usageVal.includes("noon")) vNoon.classList.remove("hidden");
    if (usageVal.includes("evening")) vEvening.classList.remove("hidden");
    if (usageVal.includes("bedtime")) vBedtime.classList.remove("hidden");
  } else if (frequency === "free" || frequency === "tonyo") {
    // 特殊処方は全時間帯を入力できるようにフル解放
    vMorning.classList.remove("hidden"); vNoon.classList.remove("hidden"); vEvening.classList.remove("hidden"); vBedtime.classList.remove("hidden");
  }
}

/**
 * 1日の服用回数ベースの用法マスター動的切り替え
 */
frequencySelect.addEventListener("change", (e) => {
  const value = e.target.value;

  detailUsageGroup.classList.add("hidden");
  freeInputGroup.classList.add("hidden");
  dosageGroup.classList.add("hidden");
  timeCategoryGroup.classList.add("hidden");
  toggleVariableDosage.checked = false;
  dosageVariableArea.classList.add("hidden");
  dosageUniformArea.classList.remove("hidden");
  detailUsageSelect.innerHTML = "";

  if (!value) return;

  let options = [];

  if (value === "3") {
    options = [
      { text: "朝・昼・夕食後（毎食後）", val: "3_meals_after" },
      { text: "朝・昼・夕食前（毎食前）", val: "3_meals_before" }
    ];
  } else if (value === "2") {
    options = [
      { text: "朝・夕食後", val: "2_morning_evening_after" },
      { text: "朝・昼食後", val: "2_morning_noon_after" },
      { text: "昼・夕食後", val: "2_noon_evening_after" },
      { text: "朝食後・眠前", val: "2_morning_bedtime" }
    ];
  } else if (value === "1") {
    options = [
      { text: "朝食後", val: "1_morning_after" },
      { text: "朝食前", val: "1_morning_before" },
      { text: "昼食後", val: "1_noon_after" },
      { text: "夕食後", val: "1_evening_after" },
      { text: "就寝前（眠前）", val: "1_bedtime" }
    ];
  } else if (value === "tonyo") {
    options = [
      { text: "頭痛・痛むとき（消炎鎮痛用）", val: "tonyo_pain" },
      { text: "熱があるとき（解熱用）", val: "tonyo_fever" },
      { text: "眠れないとき（不眠時用）", val: "tonyo_insomnia" }
    ];
  }

  if (options.length > 0) {
    options.forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.val; el.textContent = opt.text;
      detailUsageSelect.appendChild(el);
    });
    detailUsageGroup.classList.remove("hidden");
  }

  // 🟢 用法が決まったら、服用量グループを出現させる
  dosageGroup.classList.remove("hidden");
  
  // 頓用の場合は「朝夕で量が違うスイッチ」を隠してシンプルにする
  if (value === "tonyo") {
    switchLabel.classList.add("hidden");
    timeCategoryGroup.classList.remove("hidden");
  } else {
    switchLabel.classList.remove("hidden");
  }

  if (value === "free") {
    freeInputGroup.classList.remove("hidden");
    timeCategoryGroup.classList.remove("hidden");
  }

  // 初期状態の表示絞り込みを実行
  updateVariableInputsVisibility(value, detailUsageSelect.value || "");
});

// 詳細用法セレクトが変わったときも、内訳入力欄の表示を追従させる
detailUsageSelect.addEventListener("change", () => {
  updateVariableInputsVisibility(frequencySelect.value, detailUsageSelect.value);
});

/**
 * ✨【新設ロジック】「量が違うチェック」が押されたときのフォーム切り替え制御
 */
toggleVariableDosage.addEventListener("change", (e) => {
  if (e.target.checked) {
    dosageUniformArea.classList.add("hidden");  // 一律入力欄を隠す
    dosageVariableArea.classList.remove("hidden"); // 内訳フォームをぬるっと出現させる
    // 選択中の回数に合わせて内訳の項目を最新化
    updateVariableInputsVisibility(frequencySelect.value, detailUsageSelect.value || "");
  } else {
    dosageUniformArea.classList.remove("hidden");
    dosageVariableArea.classList.add("hidden");
  }
});

/**
 * 🧠【完全保存拡張】登録実行ボタンが押されたときの「変則・一律自動マッピング」コア処理
 */
document.getElementById("submit-register-btn").addEventListener("click", () => {
  const name = document.getElementById("med-name").value.trim();
  const startDate = document.getElementById("med-start-date").value;
  const endDate = document.getElementById("med-end-date").value;
  const frequency = frequencySelect.value;

  if (!name || !startDate || !frequency) {
    alert("必須項目（お薬名・開始日・服用回数）を正しく入力してください。");
    return;
  }

  let detailUsageText = "";
  let categories = { morning: false, noon: false, evening: false, bedtime: false };
  let dosages = { morning: "0", noon: "0", evening: "0", bedtime: "0" };

  // 用法テキストの確定 ＆ 基本時間帯フラグのマッピング
  if (frequency === "free") {
    detailUsageText = document.getElementById("med-free-usage").value.trim() || "フリー記載用法";
    categories.morning = document.getElementById("check-morning").checked;
    categories.noon = document.getElementById("check-noon").checked;
    categories.evening = document.getElementById("check-evening").checked;
    categories.bedtime = document.getElementById("check-bedtime").checked;
  } else {
    detailUsageText = detailUsageSelect.options[detailUsageSelect.selectedIndex].text;
    const usageVal = detailUsageSelect.value;

    if (frequency === "3") {
      categories.morning = true; categories.noon = true; categories.evening = true;
    } else if (frequency === "2" || frequency === "1") {
      if (usageVal.includes("morning")) categories.morning = true;
      if (usageVal.includes("noon")) categories.noon = true;
      if (usageVal.includes("evening")) categories.evening = true;
      if (usageVal.includes("bedtime")) categories.bedtime = true;
    } else if (frequency === "tonyo") {
      // 頓用は手動チェック時間帯をマッピング
      categories.morning = document.getElementById("check-morning").checked;
      categories.noon = document.getElementById("check-noon").checked;
      categories.evening = document.getElementById("check-evening").checked;
      categories.bedtime = document.getElementById("check-bedtime").checked;
    }
  }

  // 🟢【コア】服用量の自動マッピング処理
  const isVariable = toggleVariableDosage.checked;

  if (frequency === "tonyo") {
    // 頓用の場合は一律欄に入力された量をセット
    const tonAmount = document.getElementById("med-dosage-uniform").value || "1";
    dosages.morning = tonAmount; // 代表値として格納
  } else if (!isVariable) {
    // 【通常パターン】一律入力された数字を、飲む時間帯すべてに一撃自動コピー！
    const uniformAmount = document.getElementById("med-dosage-uniform").value || "1";
    if (categories.morning) dosages.morning = uniformAmount;
    if (categories.noon) dosages.noon = uniformAmount;
    if (categories.evening) dosages.evening = uniformAmount;
    if (categories.bedtime) dosages.bedtime = uniformAmount;
  } else {
    // 【変則パターン】内訳に入力されたバラバラの数字をそのままマッピング
    // 入力がない、または0の場合は、自動的にその時間帯のカテゴリフラグもへし折って非表示化（引き算ロジック）
    const mVal = document.getElementById("dosage-m").value.trim();
    const nVal = document.getElementById("dosage-n").value.trim();
    const eVal = document.getElementById("dosage-e").value.trim();
    const bVal = document.getElementById("dosage-b").value.trim();

    dosages.morning = mVal || "0";
    dosages.noon = nVal || "0";
    dosages.evening = eVal || "0";
    dosages.bedtime = bVal || "0";

    // 0の箇所はカテゴリから除外する親切引き算
    if (parseFloat(dosages.morning) <= 0) categories.morning = false;
    if (parseFloat(dosages.noon) <= 0) categories.noon = false;
    if (parseFloat(dosages.evening) <= 0) categories.evening = false;
    if (parseFloat(dosages.bedtime) <= 0) categories.bedtime = false;
  }

  // 仮データベースにプッシュして再描画
  registeredMedicines.push({ name, startDate, endDate, frequency, detailUsageText, dosages, categories });
  
  alert(`✨ お薬「${name}」を正常に登録しました！`);
  closeBottomSheet();
  renderCalendar(currentYear, currentMonth);
});

// ==========================================================================
// 6. アプリケーション初期化
// ==========================================================================
renderCalendar(currentYear, currentMonth);