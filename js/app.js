// console.log("Medi-log: JavaScript linked successfully.");

// ==========================================
// Medi-log: カレンダー生成ロジック
// ==========================================

// 1. 今日の日付、現在の年・月を取得する
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();//0が1月なので画面に表示させるときは調整のため1を足す

console.log(`現在の表示対象: ${currentYear}年 ${currentMonth + 1}月`);


// 2. 指定した月の「1日」が何曜日かを調べる関数
function getFirstDayOfWeek(year,month) {
    const firstDay = new Date(year,month, 1);
    return firstDay.getDay();//0(日)〜6(土)が返る ※Dateが日付でDayが曜日0(日)〜6(土曜日)
}

// 3. 指定した月に「何日まであるか」を調べる関数
function getDaysInMonth(year,month) {
    // 翌月の0日を指定すると、今月の末日（最終日）が取得できるJavaScriptの裏技らしい
    const lastDay = new Date(year,month + 1, 0);
    return lastDay.getDate();
}

// --- 動作確認用のログ出力 ---
const firstDayNum = getFirstDayOfWeek(currentYear, currentMonth);
const totalDays = getDaysInMonth(currentYear, currentMonth);

console.log(`今月の1日の曜日番号: ${firstDayNum}`);
console.log(`今月の総日数: ${totalDays}日間`);

function renderCalendar(year, month) {
    const container = document.getElementById("calendar-container");
    container.innerHTML = "";
    const firstDayIndex = getFirstDayOfWeek(year,month);
    const totalDays = getDaysInMonth(year,month);
    const emptyDaysCount = (firstDayIndex + 6) % 7;

    for (let i =0; i < emptyDaysCount; i++){
        const emptySlot = document.createElement("div");
        emptySlot.classList.add("calendar-day", "empty");
        container.appendChild(emptySlot);
    }

    for (let day = 1; day <= totalDays; day++){
        const daySlot = document.createElement("div");
        daySlot.classList.add("calendar-day");
        daySlot.textContent = day;
        container.appendChild(daySlot);
    }
}

renderCalendar(currentYear,currentMonth);
