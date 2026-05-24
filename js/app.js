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

// 4. カレンダーを画面に描画（レンダリング）する関数
function renderCalendar(year, month) {
    // HTML側にある「カレンダーの受け皿」をJSの中に引っ張ってくる
    const container = document.getElementById("calendar-container");

    // 描画する前に、中身を一度完全に空っぽ（リセット）にする
    // 「来月」や「先月」のボタンを押したときに、前の月のカレンダーの上に新しいカレンダーがどんどん重なって追記されてしまうのを防ぐ
    container.innerHTML = "";

    const firstDayIndex = getFirstDayOfWeek(year, month); // 1日の曜日番号(0〜6)
    const totalDays = getDaysInMonth(year, month); // 今月の総日数(1〜31)

    // 手順１.月曜始まりにするための「空白のマス」の数を計算する
    // ここが今回一番面白いかった。日曜日始まりから月曜日始まりへ、曜日のインデックスをずらす計算式
    const emptyDaysCount = (firstDayIndex + 6) % 7;

    // 計算された数だけ、中身が空っぽの <div> をループで生成して敷き詰める
    for (let i = 0; i < emptyDaysCount; i++) {
    const emptySlot = document.createElement("div");
    // container.innerHTML += `<div class="calendar-day">${day}</div>`;こういう書き方でも大丈夫みたい。
    emptySlot.classList.add("calendar-day", "empty"); // 空白用の目印クラスをつける。まとめて記述できるみたい。
    container.appendChild(emptySlot); // 器の中に追加する
    }

    // 手順2.1日から最終日までの「日付のマス」をループで生成して敷き詰める
    for (let day = 1; day <= totalDays; day++) {
        const daySlot = document.createElement("div");
        daySlot.classList.add("calendar-day"); // マス目共通のクラスをつける
        daySlot.textContent = day; // マスの中に日付の数字を入れる
        container.appendChild(daySlot); // 器の中に追加する

    }   
}

    // 5. アプリ起動時に、今月のカレンダーを描画するように命令
    renderCalendar(currentYear, currentMonth); 