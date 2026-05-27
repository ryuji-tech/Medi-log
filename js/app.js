// ==========================================================================
// 1. グローバル変数（アプリ全体で共有する、現在表示中の年・月）
// ==========================================================================
// 【進化ポイント】固定値ではなく、Date() を使って「現在のリアルな年月」を初期値として取得します
const today = new Date();
let currentYear = today.getFullYear();  // 例：2026 などの4桁の西暦
let currentMonth = today.getMonth() + 1; // getMonth()は0〜11で返るため、現実の月に合わせて「+1」する

// ==========================================================================
// 2. 毎月のデータを計算する子関数（ロジック担当）
// ==========================================================================

// 指定された年月が「何曜日から始まるか」を調べる関数（0:日, 1:月, ..., 6:土）
function getFirstDayOfWeek(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  return firstDay.getDay();
}

// 指定された年月が「全部で何日あるか」を調べる関数（28日〜31日）
function getDaysInMonth(year, month) {
  const lastDay = new Date(year, month, 0);
  return lastDay.getDate();
}

// ==========================================================================
// 3. 画面を綺麗に描き変えるメイン関数（レンダリング担当）
// ==========================================================================
function renderCalendar(year, month) {
  // ① カレンダーの日付を入れるグリッド容器（部屋）を取得
  const container = document.getElementById("calendar-container");
  container.innerHTML = ""; // 部屋の中身を一度リセット（空っぽに）する

  // ② 【新設】画面のタイトル（h2）を「〇〇〇〇年 〇月」に書き換える
  const title = document.getElementById("calendar-title");
  title.textContent = `${year}年 ${month}月`; // HTMLに書いてある固定文字をここで上書き！

  const firstDayIndex = getFirstDayOfWeek(year, month); 
  const totalDays = getDaysInMonth(year, month);       

  // 【ステップ0】曜日ヘッダー（月〜日）を生成して敷き詰める
  const weekdays = ["月", "火", "水", "木", "金", "土", "日"];
  for (let i = 0; i < weekdays.length; i++) {
    const headerSlot = document.createElement("div");
    headerSlot.classList.add("calendar-header"); 
    headerSlot.textContent = weekdays[i];
    
    // 土曜日と日曜日に専用の目印クラスをつける
    if (i === 5) {
      headerSlot.classList.add("saturday"); 
    } else if (i === 6) {
      headerSlot.classList.add("sunday");   
    }
    container.appendChild(headerSlot);
  }

  // 【ステップ1】月曜始まりにするための「空白のマス」を生成
  const emptyDaysCount = (firstDayIndex + 6) % 7;
  for (let i = 0; i < emptyDaysCount; i++) {
    const emptySlot = document.createElement("div");
    emptySlot.classList.add("calendar-day", "empty"); 
    container.appendChild(emptySlot); 
  }

// 【ステップ2】1日から最終日までの「日付のマス」を生成
  for (let day = 1; day <= totalDays; day++) {
    const daySlot = document.createElement("div");
    daySlot.classList.add("calendar-day"); 
    daySlot.textContent = day;            

    // 日付マスがクリックされたときの処理
    daySlot.addEventListener("click", () => {
      
      // カレンダーカードの下部に用意した「固定の引き出し部屋」を取得する
      const panel = document.getElementById("calendar-accordion-panel");
      
      // 一度「開くクラス」を外して、中身をシュッと入れ替える準備をする
      panel.classList.remove("is-open");

      // 引き出しの中身を組み立てる
      panel.innerHTML = `
        <h3 class="accordion-title">💊 ${month}月${day}日（${weekdays[(firstDayIndex + day - 2 + 7) % 7]}）のお薬記録</h3>
        <div class="accordion-content">
          <p>⏳ ここに朝・昼・晩のお薬チェックボックスが並びます（次のステップで実装！）</p>
        </div>
      `;

      // ほんの一瞬だけ待ってから、ぬるっと開くクラスを付与する
      setTimeout(() => {
        panel.classList.add("is-open");
      }, 50);
    });

    container.appendChild(daySlot);        
  }
}

// ==========================================================================
// 4. ボタンを押した時の動き（イベントリスナー・操作担当）
// ==========================================================================

// 【新設】「先月ボタン」がクリックされたときの処理
document.getElementById("prev-month-btn").addEventListener("click", () => {
  currentMonth--; // 表示する月を1つ減らす
  
  if (currentMonth < 1) {
    currentMonth = 12; // 1月より小さくなったら12月に戻す
    currentYear--;    // 年を1つ減らす（年またぎの処理）
  }
  
  renderCalendar(currentYear, currentMonth); // 新しい年月でカレンダーを再描画！
});

// 【新設】「来月ボタン」がクリックされたときの処理
document.getElementById("next-month-btn").addEventListener("click", () => {
  currentMonth++; // 表示する月を1つ増やす
  
  if (currentMonth > 12) {
    currentMonth = 1;  // 12月を超えたら1月に戻す
    currentYear++;    // 年を1つ増やす（年またぎの処理）
  }
  
  renderCalendar(currentYear, currentMonth); // 新しい年月でカレンダーを再描画！
});

// ==========================================================================
// 5. アプリ起動時の最初の一歩（初期化）
// ==========================================================================
// ページを開いた瞬間に、自動取得した「現在のリアルな年月」でカレンダーを表示する
renderCalendar(currentYear, currentMonth);