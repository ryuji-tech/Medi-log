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
  // 【重要・復旧】ステップ0：曜日ヘッダー行の独立生成と配置
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
  // 【新設計】週単位分割アコーディオン構築ロジック
  // ------------------------------------------------------------------------

  // 1. カレンダーを構成する全マス（前月空白 ＋ 当月日付）を一時配列にフラットに格納
  const allSlots = [];

  // 【前月の空白マスの生成】（月曜始まりに対応するためのオフセット計算）
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
    daySlot.dataset.day = day; // カスタムデータ属性に日付を保持
    allSlots.push(daySlot);        
  }

  // 2. 格納した全マスを「7個ずつ（1週間単位）」のチャンクに切り分けて画面に構築
  for (let i = 0; i < allSlots.length; i += 7) {
    const weekSlots = allSlots.slice(i, i + 7);
    
    // 1週間分のグリッド行コンテナを生成
    const weekRow = document.createElement("div");
    weekRow.classList.add("calendar-week-row");
    weekSlots.forEach(slot => weekRow.appendChild(slot));
    
    // この「週の行」の直下に、専用のアコーディオンパネルを最初から1通ずつ仕込んでおく
    const panel = document.createElement("div");
    panel.classList.add("accordion-panel");
    
    // DOMに週の行と専用パネルをセットでバインド
    container.appendChild(weekRow);
    container.appendChild(panel);

    // 3. この週に属する各日付マスに対してインタラクション（クリック）を設定
    weekSlots.forEach(slot => {
      if (slot.classList.contains("empty")) return; // 空白マスは処理スキップ

      slot.addEventListener("click", () => {
        const day = parseInt(slot.dataset.day);
        const dayOfWeek = weekdays[(firstDayIndex + day - 2 + 7) % 7];

        // ① 他の週のアコーディオンが開いている場合、すべて強制クローズ
        const allPanels = container.querySelectorAll(".accordion-panel");
        allPanels.forEach(p => {
          if (p !== panel) p.classList.remove("is-open");
        });

        // ② 動的に流し込むインラインコンテンツのHTMLを組み立て
        const newHTML = `
          <h3 class="accordion-title">💊 ${month}月${day}日（${dayOfWeek}）のお薬記録</h3>
          <div class="accordion-content">
            <p>⏳ ここに朝・昼・晩のお薬チェックボックスが並びます（次フェーズ実装）</p>
          </div>
        `;

        // ③ 【インタラクションの最適化】
        // すでに「同じ週」の別の日付が選択されておりパネルが開いている場合は、
        // 無駄な開閉モーションをスキップし、中のデータ（テキスト）だけをヌルリと自然に差し替える。
        if (panel.classList.contains("is-open")) {
          panel.innerHTML = newHTML;
        } else {
          panel.innerHTML = newHTML;
          // DOMへの配置完了をほんのわずかに待ってからクラスを付与し、スムーズな縦展開アニメーションを発動
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
// 5. アプリケーション初期化
// ==========================================================================
renderCalendar(currentYear, currentMonth);