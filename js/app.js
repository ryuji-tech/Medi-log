// ==========================================================================
// 1. グローバル変数（アプリケーションの状態管理）
// ==========================================================================
const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth() + 1; // 1月〜12月に補正

// ==========================================================================
// 2. 日付・カレンダー演算用ロジック（純粋関数）
// ==========================================================================

/**
 * 指定された年物の1日が何曜日から始まるかを取得する（0:日 〜 6:土）
 */
function getFirstDayOfWeek(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  return firstDay.getDay();
}

/**
 * 指定された年月の総日数（最終日の日付）を取得する
 */
function getDaysInMonth(year, month) {
  const lastDay = new Date(year, month, 0);
  return lastDay.getDate();
}

// ==========================================================================
// 3. カレンダー描画・UI制御メイン関数（レンダリング・DOM操作担当）
// ==========================================================================
function renderCalendar(year, month) {
  const container = document.getElementById("calendar-container");
  container.innerHTML = ""; // コンテナ内の初期化

  const title = document.getElementById("calendar-title");
  title.textContent = `${year}年 ${month}月`;

  const firstDayIndex = getFirstDayOfWeek(year, month); 
  const totalDays = getDaysInMonth(year, month);       
  const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

  // ------------------------------------------------------------------------
  // ステップ0：曜日ヘッダー行の独立生成と配置
  // ------------------------------------------------------------------------
  const headerRow = document.createElement("div");
  headerRow.classList.add("calendar-header-row"); // 7列Gridのヘッダー専用コンテナ

  for (let i = 0; i < weekdays.length; i++) {
    const headerSlot = document.createElement("div");
    headerSlot.classList.add("calendar-header"); 
    headerSlot.textContent = weekdays[i];
    
    if (i === 5) {
      headerSlot.classList.add("saturday"); 
    } else if (i === 6) {
      headerSlot.classList.add("sunday");   
    }
    headerRow.appendChild(headerSlot);
  }
  container.appendChild(headerRow); // 最上部に配置

  // ------------------------------------------------------------------------
  // 週単位分割アコーディオン構築ロジック
  // ------------------------------------------------------------------------

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

        // 日々のチェック・確認用アコーディオンの中身（純粋な確認エリア）
        const newHTML = `
          <h3 class="accordion-title">💊 ${month}月${day}日（${dayOfWeek}）のお薬記録</h3>
          <div class="accordion-content">
            <p>⏳ ここに朝・昼・晩のお薬チェックボックスが並びます（次フェーズ実装）</p>
          </div>
        `;

        if (panel.classList.contains("is-open")) {
          panel.innerHTML = newHTML;
        } else {
          panel.innerHTML = newHTML;
          setTimeout(() => {
            panel.classList.add("is-open");
          }, 10);
        }
      });
    });
  }
}

// ==========================================================================
// 4. グローバルナビゲーション制御（イベントリスナー担当）
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
// 5. ✨【新設】お薬登録用ボトムインフォ制御インタラクション
// ==========================================================================

// DOM要素のキャッシュ
const floatingBtn = document.getElementById("floating-register-btn");
const bottomSheet = document.getElementById("register-bottom-sheet");
const sheetOverlay = document.getElementById("bottom-sheet-overlay");
const closeSheetBtn = document.getElementById("close-register-btn");

const frequencySelect = document.getElementById("med-frequency");
const detailUsageGroup = document.getElementById("detail-usage-group");
const detailUsageSelect = document.getElementById("med-detail-usage");
const freeInputGroup = document.getElementById("free-input-group");
const timeCategoryGroup = document.getElementById("time-category-group");

/**
 * ボトムインフォ（登録画面）を開く関数
 */
function openBottomSheet() {
  bottomSheet.classList.add("is-open");
  sheetOverlay.classList.add("is-active");
  // 開始日の初期値として現在のリアルな日付を自動セット（親切設計）
  document.getElementById("med-start-date").value = new Date().toISOString().split('T')[0];
}

/**
 * ボトムインフォ（登録画面）を閉じる関数
 */
function closeBottomSheet() {
  bottomSheet.classList.remove("is-open");
  sheetOverlay.classList.remove("is-active");
}

// ボタンクリックイベントの紐付け
floatingBtn.addEventListener("click", openBottomSheet);
closeSheetBtn.addEventListener("click", closeBottomSheet);
sheetOverlay.addEventListener("click", closeBottomSheet); // スモーク部分のタップでも優しく閉じる

/**
 * 服用回数ベースの用法マスター動的切り替えロジック
 */
frequencySelect.addEventListener("change", (e) => {
  const value = e.target.value;

  // 一旦すべての連動グループを隠す
  detailUsageGroup.classList.add("hidden");
  freeInputGroup.classList.add("hidden");
  timeCategoryGroup.classList.add("hidden");
  detailUsageSelect.innerHTML = "";

  if (!value) return;

  // 1日の服用回数に応じたシチュエーションマスター定義
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

  // 選択肢を動的に生成して流し込む
  if (options.length > 0) {
    options.forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.val;
      el.textContent = opt.text;
      detailUsageSelect.appendChild(el);
    });
    detailUsageGroup.classList.remove("hidden"); // 詳細セレクトを表示
  }

  // 💡「フリー記載」または「頓用」が選ばれたら、介助者のために時間帯分類チェックを強制表示する
  if (value === "free") {
    freeInputGroup.classList.remove("hidden"); // テキスト入力欄を出現
    timeCategoryGroup.classList.remove("hidden"); // 分類チェックボックスを出現
  } else if (value === "tonyo") {
    timeCategoryGroup.classList.remove("hidden"); // 頓用の場合も、どのタイミングで飲ませるべきか分類できるよう表示
  }
});

// デモ用の登録確定イベント（ボタンが押されたら優しく閉じる）
document.getElementById("submit-register-btn").addEventListener("click", () => {
  const medName = document.getElementById("med-name").value;
  if (!medName) {
    alert("お薬の名前を入力してください。");
    return;
  }
  alert(`✨ デモ動作：お薬「${medName}」をシステムに仮登録しました。確認用アラート`);
  closeBottomSheet();
});

// ==========================================================================
// 6. アプリケーション初期化
// ==========================================================================
renderCalendar(currentYear, currentMonth);