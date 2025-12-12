// ===== ひらがな辞書（0〜18） =====
const YOMI = {
  0:"ぜろ", 1:"いち", 2:"に", 3:"さん", 4:"よん", 5:"ご",
  6:"ろく", 7:"なな", 8:"はち", 9:"きゅう", 10:"じゅう",
  11:"じゅういち", 12:"じゅうに", 13:"じゅうさん", 14:"じゅうよん",
  15:"じゅうご", 16:"じゅうろく", 17:"じゅうなな", 18:"じゅうはち",
};

const TOTAL = 10;
const CARRY = false; // MVPは繰り上がりOFF

// ===== 状態 =====
let screen = "START"; // "START" | "QUIZ" | "RESULT"
let qIndex = 0;
let correctCount = 0;

let step = 0;         // 0,1,2,3,"H","4a","4b"
let a = 1, b = 1, ans = 2;
let choices = [];
let mistakeCount = 0;
let lastWrong = null;

// ===== DOM =====
const elProgress = document.getElementById("progress");

const elStartCard = document.getElementById("startCard");
const elStartBtn  = document.getElementById("startBtn");

const elQuizCard  = document.getElementById("quizCard");
const elEquation  = document.getElementById("equation");
const elMaru      = document.getElementById("maru");
const elReading   = document.getElementById("reading");
const elMessage   = document.getElementById("message");
const elChoices   = document.getElementById("choices");
const elNextBtn   = document.getElementById("nextBtn");

const elResultCard  = document.getElementById("resultCard");
const elResultScore = document.getElementById("resultScore");
const elRestartBtn  = document.getElementById("restartBtn");

// ===== ユーティリティ =====
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 「枠に収まる最大フォント」をざっくり確実にする（式/数字の自動最大化）
function fitTextToBox(el, { minPx = 20, maxPx = 220, padPx = 6 } = {}) {
  // display:none のときは測れないので回避
  const boxW = el.clientWidth;
  const boxH = el.clientHeight || 0;
  if (!boxW) return;

  // 収めたい最大幅：親カードに対して
  const targetW = Math.max(10, boxW - padPx);

  // 一旦 max を入れてから縮める（2分探索）
  let lo = minPx, hi = maxPx;

  // 計測用に改変（後で戻す必要なし）
  el.style.whiteSpace = "nowrap";
  el.style.overflow = "hidden";

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    el.style.fontSize = `${mid}px`;

    // scrollWidth が targetW を超えないか確認
    if (el.scrollWidth <= targetW) {
      lo = mid + 1; // もっと大きく
    } else {
      hi = mid - 1; // 大きすぎ
    }
  }

  // hi が「収まる最大」
  el.style.fontSize = `${Math.max(minPx, hi)}px`;
}

function makeQuestion() {
  mistakeCount = 0;
  lastWrong = null;

  while (true) {
    a = randInt(0, 9);
    b = randInt(0, 9);
    ans = a + b;
    if (!CARRY && ans > 9) continue;
    break;
  }

  // 通常の3択（重複なし）
  const set = new Set([ans]);
  while (set.size < 3) {
    const delta = [ -2, -1, 1, 2, 3, -3 ][randInt(0, 5)];
    let w = ans + delta;
    w = Math.max(0, Math.min(18, w));
    if (w === ans) continue;
    set.add(w);
  }
  choices = shuffle(Array.from(set));
}

function showChoices(list) {
  elChoices.innerHTML = "";
  list.forEach((n) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choiceBtn";
    btn.textContent = String(n);
    btn.addEventListener("click", () => onChoose(n));
    elChoices.appendChild(btn);
  });
}

function setUI({ equation, reading, messageHTML, showNext, showChoiceButtons, showMaru, centerMode }) {
  elEquation.textContent = equation ?? "";
  elReading.textContent = reading ?? "";
  elMessage.innerHTML = messageHTML ?? "";

  elNextBtn.style.display = showNext ? "block" : "none";
  elChoices.style.display = showChoiceButtons ? "grid" : "none";

  if (showMaru) elMaru.classList.remove("hidden");
  else elMaru.classList.add("hidden");

  if (centerMode) elQuizCard.classList.add("centerMode");
  else elQuizCard.classList.remove("centerMode");

  // 表示のたびに「できるだけ大きく」調整（UI反映後に実行）
  // requestAnimationFrameでレイアウト確定後に測る
  requestAnimationFrame(() => {
    fitTextToBox(elEquation, { minPx: 28, maxPx: centerMode ? 260 : 180, padPx: 12 });
  });
}

function updateProgress() {
  elProgress.textContent = (screen === "QUIZ") ? `${qIndex + 1}/${TOTAL}` : "";
}

function showScreen(next) {
  screen = next;
  elStartCard.classList.toggle("hidden", screen !== "START");
  elQuizCard.classList.toggle("hidden", screen !== "QUIZ");
  elResultCard.classList.toggle("hidden", screen !== "RESULT");
  updateProgress();
}

function renderQuiz() {
  updateProgress();

  if (step === 0) {
    setUI({
      equation: `${a}`,
      reading: `${YOMI[a]}`,
      messageHTML: "",
      showNext: true,
      showChoiceButtons: false,
      showMaru: false,
      centerMode: true,     // ← Step0は縦横センター
    });
    return;
  }

  if (step === 1) {
    setUI({
      equation: `${a} +`,
      reading: `${YOMI[a]}　たす`,
      messageHTML: "",
      showNext: true,
      showChoiceButtons: false,
      showMaru: false,
      centerMode: false,
    });
    return;
  }

  if (step === 2) {
    setUI({
      equation: `${a} + ${b}`,
      reading: `${YOMI[a]}　たす　${YOMI[b]}`,
      messageHTML: "",
      showNext: true,
      showChoiceButtons: false,
      showMaru: false,
      centerMode: false,
    });
    return;
  }

  if (step === 3) {
    setUI({
      equation: `${a} + ${b} = ?`,
      reading: `${YOMI[a]}　たす　${YOMI[b]}　は？`,
      messageHTML: "",
      showNext: false,
      showChoiceButtons: true,
      showMaru: false,
      centerMode: false,
    });
    showChoices(choices);
    return;
  }

  if (step === "H") {
    const msg = `ほんと？<small>やっぱり・・</small>`;

    if (mistakeCount >= 2) {
      // 2回目以降：全部正解（オチ）※表示文言は同じ
      setUI({
        equation: `${a} + ${b} = ?`,
        reading: `${YOMI[a]}　たす　${YOMI[b]}　は？`,
        messageHTML: msg,
        showNext: false,
        showChoiceButtons: true,
        showMaru: false,
        centerMode: false,
      });
      showChoices([ans, ans, ans]);
      return;
    }

    // 1回目：正解2つ＋ハズレ1つ
    let wrong = lastWrong ?? Math.max(0, Math.min(18, ans + 1));
    if (wrong === ans) wrong = Math.max(0, ans - 1);

    setUI({
      equation: `${a} + ${b} = ?`,
      reading: `${YOMI[a]}　たす　${YOMI[b]}　は？`,
      messageHTML: msg,
      showNext: false,
      showChoiceButtons: true,
      showMaru: false,
      centerMode: false,
    });
    showChoices(shuffle([ans, ans, wrong]));
    return;
  }

  if (step === "4a") {
    setUI({
      equation: `${ans}`,
      reading: `${YOMI[ans]}`,
      messageHTML: "",
      showNext: true,
      showChoiceButtons: false,
      showMaru: true,     // ← 〇を表示（赤・大）
      centerMode: false,
    });
    return;
  }

  if (step === "4b") {
    setUI({
      equation: `${a} + ${b} = ${ans}`,
      reading: `${YOMI[a]}　たす　${YOMI[b]}　は　${YOMI[ans]}`,
      messageHTML: "",
      showNext: true,
      showChoiceButtons: false,
      showMaru: false,
      centerMode: false,
    });
    return;
  }
}

// ===== 操作 =====
function startGame() {
  qIndex = 0;
  correctCount = 0;
  makeQuestion();
  step = 0;
  showScreen("QUIZ");
  renderQuiz();
}

function onChoose(n) {
  // Step3 / H で押された
  const isAutoCorrect = (step === "H" && mistakeCount >= 2); // オチ：全部正解
  const isCorrect = isAutoCorrect || (n === ans);

  if (isCorrect) {
    correctCount += 1;
    step = "4a";
    renderQuiz();
    return;
  }

  // 不正解
  lastWrong = n;
  mistakeCount += 1;
  step = "H";
  renderQuiz();
}

function nextStep() {
  if (screen !== "QUIZ") return;

  if (step === 0) step = 1;
  else if (step === 1) step = 2;
  else if (step === 2) step = 3;
  else if (step === "4a") step = "4b";
  else if (step === "4b") goNextQuestion();

  renderQuiz();
}

function goNextQuestion() {
  qIndex += 1;
  if (qIndex >= TOTAL) {
    showResult();
    return;
  }
  makeQuestion();
  step = 0;
}

function showResult() {
  showScreen("RESULT");
  elResultScore.textContent = `${TOTAL}もんちゅう ${correctCount}もん せいかい`;
}

function restart() {
  showScreen("START");
}

// 画面サイズが変わったら、表示中の式/数字を再フィット
window.addEventListener("resize", () => {
  if (screen === "QUIZ") {
    requestAnimationFrame(() => {
      fitTextToBox(elEquation, { minPx: 28, maxPx: elQuizCard.classList.contains("centerMode") ? 260 : 180, padPx: 12 });
    });
  }
});

// ===== 初期化 =====
elStartBtn.addEventListener("click", startGame);
elNextBtn.addEventListener("click", nextStep);
elRestartBtn.addEventListener("click", restart);

showScreen("START");
