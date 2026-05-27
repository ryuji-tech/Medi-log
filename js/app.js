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

/// 【ステップ2】1日から最終日までの「日付のマス」を生成
  for (let day = 1; day <= totalDays; day++) {
    const daySlot = document.createElement("div");
    daySlot.classList.add("calendar-day"); 
    daySlot.textContent = day;            

    // 日付マスがクリックされたときの処理
    daySlot.addEventListener("click", () => {
      
      // 1. 既存の開いている引き出しがあれば削除
      const existingPanel = document.querySelector(".accordion-panel");
      if (existingPanel) {
        existingPanel.remove();
      }

      // 2. 新しい引き出し要素を作成
      const panel = document.createElement("div");
      panel.classList.add("accordion-panel");
      panel.innerHTML = `
        <h3 class="accordion-title">💊 ${month}月${day}日（${weekdays[(firstDayIndex + day - 2 + 7) % 7]}）のお薬記録</h3>
        <div class="accordion-content">
          <p>⏳ ここに朝・昼・晩のお薬チェックボックスが並ぶ</p>
        </div>
      `;

      // 3. ★【重要ロジック】クリックされた日の「その週の土曜日（右端）」のマスを探し出す
      // 空白マスの数（firstDayIndex）と今日の日付から、グリッド上の位置を計算
      const currentGridIndex = firstDayIndex + day - 1; 
      const daysUntilSaturday = 6 - (currentGridIndex % 7); // 土曜日（インデックス6）までの残り日数
      const targetDay = day + daysUntilSaturday; // 同じ週の土曜日の日付
      
      // もし土曜日が当月の最終日を超えてしまったら、当月の最終日のマスの後ろに挿入する
      const finalInsertionDay = Math.min(targetDay, totalDays);

      // カレンダーの中から、挿入先となるマスの要素を特定する
      // (container.children の中から、インデックスを逆算してターゲットを見つけます)
      const targetSlotIndex = firstDayIndex + finalInsertionDay - 1;
      const targetSlot = container.children[targetSlotIndex];

      // 4. その週の右端マスのすぐ後ろに引き出しを滑り込ませる！
      if (targetSlot) {
        container.insertBefore(panel, targetSlot.nextSibling);
      } else {
        container.appendChild(panel);
      }

      // 5. 0.01秒後にぬるっと展開
      setTimeout(() => {
        panel.classList.add("is-open");
      }, 10);
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