const YOMI = {
  0:"ぜろ", 1:"いち", 2:"に", 3:"さん", 4:"よん", 5:"ご",
  6:"ろく", 7:"なな", 8:"はち", 9:"きゅう", 10:"じゅう",
  11:"じゅういち", 12:"じゅうに", 13:"じゅうさん", 14:"じゅうよん",
  15:"じゅうご", 16:"じゅうろく", 17:"じゅうなな", 18:"じゅうはち",
};

const TOTAL = 10;
const CARRY = false;

let screen = "START";
let qIndex = 0;
let correctCount = 0;

let step = 0; // 0,1,2,3,"H","4a","4b"
let a = 1, b = 1, ans = 2;
let choices = [];
let mistakeCount = 0;
let lastWrong = null;

// DOM
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

// utils
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 文字を枠に収めつつ最大化（横幅ベース）
function fitTextToBox(el, { minPx = 24, maxPx = 520, padPx = 12 } = {}) {
  const boxW = el.clientWidth;
  if (!boxW) return;
  const targetW = Math.max(10, boxW - padPx);

  el.style.whiteSpace = "nowrap";
  el.style.overflow = "hidden";

  let lo = minPx, hi = maxPx;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    el.style.fontSize = `${mid}px`;
    if (el.scrollWidth <= targetW) lo = mid + 1;
    else hi = mid - 1;
  }
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

  const set = new Set([ans]);
  while (set.size < 3) {
    const delta = [ -2, -1, 1, 2, 3, -3 ][randInt(0, 5)];
    let w = Math.max(0, Math.min(18, ans + delta));
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

function setUI({ equation, reading, messageHTML, showNext, showChoiceButtons, showMaru, centerMode, maxFont }) {
  elEquation.textContent = equation ?? "";
  elReading.textContent = reading ?? "";
  elMessage.innerHTML = messageHTML ?? "";

  elNextBtn.style.display = showNext ? "block" : "none";
  elChoices.style.display = showChoiceButtons ? "grid" : "none";

  elMaru.classList.toggle("hidden", !showMaru);

  elQuizCard.classList.toggle("centerMode", !!centerMode);

  requestAnimationFrame(() => {
    fitTextToBox(elEquation, { minPx: 28, maxPx: maxFont ?? 520, padPx: 12 });
  });
}

function renderQuiz() {
  updateProgress();

  // ★式は「全角記号・スペース無し」で横幅節約 → 大きくなりやすい
  const plus = "＋";
  const eq = "＝";

  if (step === 0) {
    setUI({
      equation: `${a}`,
      reading: `${YOMI[a]}`,
      messageHTML: "",
      showNext: true,
      showChoiceButtons: false,
      showMaru: false,
      centerMode: true,
      maxFont: 900, // 単独数字はより大きく
    });
    return;
  }

  if (step === 1) {
    setUI({
      equation: `${a}${plus}`,
      reading: `${YOMI[a]}　たす`,
      messageHTML: "",
      showNext: true,
      showChoiceButtons: false,
      showMaru: false,
      centerMode: false,
      maxFont: 520,
    });
    return;
  }

  if (step === 2) {
    setUI({
      equation: `${a}${plus}${b}`,
      reading: `${YOMI[a]}　たす　${YOMI[b]}`,
      messageHTML: "",
      showNext: true,
      showChoiceButtons: false,
      showMaru: false,
      centerMode: false,
      maxFont: 520,
    });
    return;
  }

  if (step === 3) {
    setUI({
      equation: `${a}${plus}${b}${eq}？`,
      reading: `${YOMI[a]}　たす　${YOMI[b]}　は？`,
      messageHTML: "",
      showNext: false,
      showChoiceButtons: true,
      showMaru: false,
      centerMode: false,
      maxFont: 520,
    });
    showChoices(choices);
    return;
  }

  if (step === "H") {
    const msg = `ほんと？<small>やっぱり・・</small>`;

    if (mistakeCount >= 2) {
      setUI({
        equation: `${a}${plus}${b}${eq}？`,
        reading: `${YOMI[a]}　たす　${YOMI[b]}　は？`,
        messageHTML: msg,
        showNext: false,
        showChoiceButtons: true,
        showMaru: false,
        centerMode: false,
        maxFont: 520,
      });
      showChoices([ans, ans, ans]);
      return;
    }

    let wrong = lastWrong ?? Math.max(0, Math.min(18, ans + 1));
    if (wrong === ans) wrong = Math.max(0, ans - 1);

    setUI({
      equation: `${a}${plus}${b}${eq}？`,
      reading: `${YOMI[a]}　たす　${YOMI[b]}　は？`,
      messageHTML: msg,
      showNext: false,
      showChoiceButtons: true,
      showMaru: false,
      centerMode: false,
      maxFont: 520,
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
      showMaru: true,
      centerMode: false,
      maxFont: 900,
    });
    return;
  }

  if (step === "4b") {
    setUI({
      equation: `${a}${plus}${b}${eq}${ans}`,
      reading: `${YOMI[a]}　たす　${YOMI[b]}　は　${YOMI[ans]}`,
      messageHTML: "",
      showNext: true,
      showChoiceButtons: false,
      showMaru: false,
      centerMode: false,
      maxFont: 520,
    });
    return;
  }
}

// actions
function startGame() {
  qIndex = 0;
  correctCount = 0;
  makeQuestion();
  step = 0;
  showScreen("QUIZ");
  renderQuiz();
}

function onChoose(n) {
  const isAutoCorrect = (step === "H" && mistakeCount >= 2);
  const isCorrect = isAutoCorrect || (n === ans);

  if (isCorrect) {
    correctCount += 1;
    step = "4a";
    renderQuiz();
    return;
  }

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
    showScreen("RESULT");
    elResultScore.textContent = `${TOTAL}もんちゅう ${correctCount}もん せいかい`;
    return;
  }
  makeQuestion();
  step = 0;
}

function restart() {
  showScreen("START");
}

window.addEventListener("resize", () => {
  if (screen === "QUIZ") renderQuiz();
});

// init
elStartBtn.addEventListener("click", startGame);
elNextBtn.addEventListener("click", nextStep);
elRestartBtn.addEventListener("click", restart);

showScreen("START");


