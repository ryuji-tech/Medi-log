// ==========================================================================
// 1. グローバル変数（アプリケーションの状態・仮データベース管理）
// ==========================================================================
const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth() + 1; 

/**
 * 🟢【新設計】登録されたお薬を保持するメモリ内データベース配列
 * 初期デモデータとして、期間指定お薬と、永続（終了日空欄）お薬の2件をあらかじめ充填
 */
let registeredMedicines = [
  {
    name: "メディログ錠 10mg",
    startDate: "2026-05-15",
    endDate: "2026-05-25",
    frequency: "2",
    detailUsageText: "朝・夕食後",
    categories: { morning: true, noon: false, evening: true, bedtime: false }
  },
  {
    name: "ライトアムロジピン カプセル",
    startDate: "2026-05-20",
    endDate: "", // 🟢 終了日なし＝永続の設計に対応
    frequency: "1",
    detailUsageText: "朝食後",
    categories: { morning: true, noon: false, evening: false, bedtime: false }
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

/**
 * 🟢【新設】指定された日付が、お薬の服用期間内に入っているかを厳密に判定する関数
 */
function isDateInPeriod(targetYear, targetMonth, targetDay, startStr, endStr) {
  // 判定対象の日付をDateオブジェクト化（時刻は00:00:00に統一して日付のみを比較）
  const targetDate = new Date(targetYear, targetMonth - 1, targetDay);
  const startDate = new Date(startStr);
  startDate.setHours(0,0,0,0);
  
  // 開始日より前なら、問答無用で期間外
  if (targetDate < startDate) return false;

  // 終了日が設定されている場合のみ、終了日を過ぎているかチェック
  if (endStr) {
    const endDate = new Date(endStr);
    endDate.setHours(0,0,0,0);
    return targetDate <= endDate;
  }

  // 🟢 終了日が空欄（永続）の場合は、開始日以降であれば常にtrue
  return true;
}

/**
 * 🟢【新設】特定の日付に処方されているお薬をすべて抽出する関数
 */
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

  // 【前月の空白マスの生成】
  const emptyDaysCount = (firstDayIndex + 6) % 7;
  for (let i = 0; i < emptyDaysCount; i++) {
    const emptySlot = document.createElement("div");
    emptySlot.classList.add("calendar-day", "empty"); 
    allSlots.push(emptySlot); 
  }

  // 【当月の日付マスの生成】
  for (let day = 1; day <= totalDays; day++) {
    const daySlot = document.createElement("div");
    daySlot.classList.add("calendar-day"); 
    daySlot.textContent = day;            
    daySlot.dataset.day = day; 

    // 🟢【連動】この日に有効なお薬が1件でもあるか確認し、あればインジケータードットを灯す
    const todaysMeds = getMedicinesForDay(year, month, day);
    if (todaysMeds.length > 0) {
      daySlot.classList.add("has-med");
    }

    allSlots.push(daySlot);        
  }

  // 格納した全マスを「7個ずつ（1週間単位）」に切り分けて画面に構築
  for (let i = 0; i < allSlots.length; i += 7) {
    const weekSlots = allSlots.slice(i, i + 7);
    
    const weekRow = document.createElement("div");
    weekRow.classList.add("calendar-week-row");
    weekSlots.forEach(slot => weekRow.appendChild(slot));
    
    const panel = document.createElement("div");
    panel.classList.add("accordion-panel");
    
    container.appendChild(weekRow);
    container.appendChild(panel);

    // 各日付マスに対してインタラクションを設定
    weekSlots.forEach(slot => {
      if (slot.classList.contains("empty")) return; 

      slot.addEventListener("click", () => {
        const day = parseInt(slot.dataset.day);
        const dayOfWeek = weekdays[(firstDayIndex + day - 2 + 7) % 7];

        const allPanels = container.querySelectorAll(".accordion-panel");
        allPanels.forEach(p => {
          if (p !== panel) p.classList.remove("is-open");
        });

        // 🟢【連動】このクリックされた日に飲むべきお薬のリストを取得
        const todaysMeds = getMedicinesForDay(year, month, day);
        
        // アコーディオンのヘッダー部分を組み立て
        let accordionHTML = `
          <h3 class="accordion-title">💊 ${month}月${day}日（${dayOfWeek}）の服薬インラインカルテ</h3>
          <div class="med-check-list">
        `;

        if (todaysMeds.length === 0) {
          // お薬がない日は優しい案内を出す
          accordionHTML += `<p class="no-medicine-msg">🌟 この日に服用するお薬の予定はありません。</p>`;
        } else {
          // 🟢【連動】登録されている時間帯分類（朝・昼・夕・眠前）ループを回し、該当するものだけ大きなチェック部品を生成
          // 介助者が一目で判別できるよう、時間帯ごとに整理して出力します
          const timeKeys = [
            { key: "morning", label: "朝のむ", className: "morning" },
            { key: "noon",    label: "昼のむ", className: "noon" },
            { key: "evening", label: "夕のむ", className: "evening" },
            { key: "bedtime", label: "眠前に", className: "bedtime" }
          ];

          todaysMeds.forEach((med, medIndex) => {
            // 通常の定期薬（朝昼夕眠前）のチェック項目を出力
            timeKeys.forEach(time => {
              if (med.categories[time.key]) {
                accordionHTML += `
                  <label class="med-check-item">
                    <input type="checkbox" class="med-checkbox">
                    <div class="med-check-info">
                      <span class="med-time-tag ${time.className}">${time.label}</span>
                      <span class="med-check-text">${med.name}</span>
                      <span class="med-check-subtext">用法：${med.detailUsageText}</span>
                    </div>
                  </label>
                `;
              }
            });

            // 頓用（痛いときなど）の場合は、専用のチェック項目を出力
            if (med.frequency === "tonyo") {
              accordionHTML += `
                <label class="med-check-item">
                  <input type="checkbox" class="med-checkbox">
                  <div class="med-check-info">
                    <span class="med-time-tag tonyo">頓用（症状時）</span>
                    <span class="med-check-text">${med.name}</span>
                    <span class="med-check-subtext">指示：${med.detailUsageText}</span>
                  </div>
                </label>
              `;
            }
          });
        }

        accordionHTML += `</div>`; // .med-check-list の閉じタグ

        // パネルへ流し込み
        if (panel.classList.contains("is-open")) {
          panel.innerHTML = accordionHTML;
        } else {
          panel.innerHTML = accordionHTML;
          setTimeout(() => {
            panel.classList.add("is-open");
          }, 10);
        }

        // 🟢【新設インタラクション】生成された巨大服薬チェックボタンに、タップした時の達成感アニメーションをバインド
        // 10ミリ秒待ってDOMに確実に配置されてからイベントを設定
        setTimeout(() => {
          const checkItems = panel.querySelectorAll(".med-check-item");
          checkItems.forEach(item => {
            const checkbox = item.querySelector(".med-checkbox");
            
            // ラベル全体のどこを押しても連動して背景色を変える
            item.addEventListener("change", () => {
              if (checkbox.checked) {
                item.classList.add("is-checked");
              } else {
                item.classList.remove("is-checked");
              }
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
  if (currentMonth < 1) {
    currentMonth = 12;
    currentYear--;
  }
  renderCalendar(currentYear, currentMonth);
});

document.getElementById("next-month-btn").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 12) {
    currentMonth = 1;
    currentYear++;
  }
  renderCalendar(currentYear, currentMonth);
});

// ==========================================================================
// 5. お薬登録用ボトムインフォ制御 ＆ 🧠【完全連動コアロジック】
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

function openBottomSheet() {
  bottomSheet.classList.add("is-open");
  sheetOverlay.classList.add("is-active");
  document.getElementById("med-start-date").value = new Date().toISOString().split('T')[0];
}

function closeBottomSheet() {
  bottomSheet.classList.remove("is-open");
  sheetOverlay.classList.remove("is-active");
  // 次回のために登録フォームの入力をリセット
  document.getElementById("med-name").value = "";
  document.getElementById("med-end-date").value = "";
  frequencySelect.value = "";
  detailUsageGroup.classList.add("hidden");
  freeInputGroup.classList.add("hidden");
  timeCategoryGroup.classList.add("hidden");
}

floatingBtn.addEventListener("click", openBottomSheet);
closeSheetBtn.addEventListener("click", closeBottomSheet);
sheetOverlay.addEventListener("click", closeBottomSheet);

/**
 * 服用回数ベースの用法マスター動的切り替え
 */
frequencySelect.addEventListener("change", (e) => {
  const value = e.target.value;

  detailUsageGroup.classList.add("hidden");
  freeInputGroup.classList.add("hidden");
  timeCategoryGroup.classList.add("hidden");
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
      { text: "朝食後・眠前", val: "2_morning_bedtime" },
      { text: "朝・夕食前", val: "2_morning_evening_before" }
    ];
  } else if (value === "1") {
    options = [
      { text: "朝食後", val: "1_morning_after" },
      { text: "朝食前", val: "1_morning_before" },
      { text: "昼食後", val: "1_noon_after" },
      { text: "夕食後", val: "1_evening_after" },
      { text: "就寝前（眠前）", val: "1_bedtime" },
      { text: "起床時", val: "1_wakeup" }
    ];
  } else if (value === "tonyo") {
    options = [
      { text: "頭痛・痛むとき（消炎鎮痛用）", val: "tonyo_pain" },
      { text: "熱があるとき（解熱用）", val: "tonyo_fever" },
      { text: "眠れないとき（不眠時用）", val: "tonyo_insomnia" },
      { text: "便秘のとき（緩下用）", val: "tonyo_constipation" }
    ];
  }

  if (options.length > 0) {
    options.forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.val;
      el.textContent = opt.text;
      detailUsageSelect.appendChild(el);
    });
    detailUsageGroup.classList.remove("hidden");
  }

  if (value === "free") {
    freeInputGroup.classList.remove("hidden");
    timeCategoryGroup.classList.remove("hidden");
    // チェックを初期化
    document.getElementById("check-morning").checked = false;
    document.getElementById("check-noon").checked = false;
    document.getElementById("check-evening").checked = false;
    document.getElementById("check-bedtime").checked = false;
  } else if (value === "tonyo") {
    timeCategoryGroup.classList.remove("hidden");
  }
});

/**
 * 🧠【新設】登録実行ボタンが押されたときの「仮データベース保存＆リアルタイム反映」コア処理
 */
document.getElementById("submit-register-btn").addEventListener("click", () => {
  const name = document.getElementById("med-name").value.trim();
  const startDate = document.getElementById("med-start-date").value;
  const endDate = document.getElementById("med-end-date").value;
  const frequency = frequencySelect.value;

  if (!name) {
    alert("お薬の名前を入力してください。");
    return;
  }
  if (!startDate) {
    alert("服用開始日を入力してください。");
    return;
  }
  if (!frequency) {
    alert("1日の服用回数を選択してください。");
    return;
  }

  // 1. 用法テキストの決定、および選択された用法から「時間帯分類フラグ」を全自動で逆算・マッピング
  let detailUsageText = "";
  let categories = { morning: false, noon: false, evening: false, bedtime: false };

  if (frequency === "free") {
    detailUsageText = document.getElementById("med-free-usage").value.trim() || "フリー記載用法";
    // フリー記載の場合は、画面上の手動チェックボックスの値をそのまま取得
    categories.morning = document.getElementById("check-morning").checked;
    categories.noon = document.getElementById("check-noon").checked;
    categories.evening = document.getElementById("check-evening").checked;
    categories.bedtime = document.getElementById("check-bedtime").checked;
  } else {
    // 選択されたセレクトボックスのテキストを取得
    detailUsageText = detailUsageSelect.options[detailUsageSelect.selectedIndex].text;
    const usageVal = detailUsageSelect.value;

    // 選択された用法コード（usageVal）から時間帯を自動判別
    if (frequency === "3") {
      categories.morning = true; categories.noon = true; categories.evening = true;
    } else if (frequency === "2") {
      if (usageVal.includes("morning")) categories.morning = true;
      if (usageVal.includes("noon")) categories.noon = true;
      if (usageVal.includes("evening")) categories.evening = true;
      if (usageVal.includes("bedtime")) categories.bedtime = true;
    } else if (frequency === "1") {
      if (usageVal.includes("morning") || usageVal.includes("wakeup")) categories.morning = true;
      if (usageVal.includes("noon")) categories.noon = true;
      if (usageVal.includes("evening")) categories.evening = true;
      if (usageVal.includes("bedtime")) categories.bedtime = true;
    } else if (frequency === "tonyo") {
      // 頓用の場合は手動チェックボックスから時間帯を引用（空欄でも可）
      categories.morning = document.getElementById("check-morning").checked;
      categories.noon = document.getElementById("check-noon").checked;
      categories.evening = document.getElementById("check-evening").checked;
      categories.bedtime = document.getElementById("check-bedtime").checked;
    }
  }

  // 2. 新しいお薬オブジェクトを作成し、仮データベース（配列）にプッシュ
  const newMedicine = { name, startDate, endDate, frequency, detailUsageText, categories };
  registeredMedicines.push(newMedicine);

  // 3. ユーザーへ通知し、ボトムシートを閉じる
  alert(`✨ お薬「${name}」を正常に登録しました！\nカレンダーの該当期間に自動反映されます。`);
  closeBottomSheet();

  // 4. 【感動の瞬間】新データに基づいて、カレンダー（ドットの灯り）を即座に再描画！
  renderCalendar(currentYear, currentMonth);
});

// ==========================================================================
// 6. アプリケーション初期化
// ==========================================================================
renderCalendar(currentYear, currentMonth);