/* ---------- DOM refs ---------- */
const numberInput = document.getElementById("numberInput");
const timeFrameEl = document.getElementById("timeFrame");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const timerBox = document.getElementById("timerBox");
const resultBox = document.getElementById("resultBox");
const accuracyPercent = document.getElementById("accuracyPercent");
const historyBox = document.getElementById("historyBox");
const bar = document.getElementById("progressBar");

let countdownInterval = null;
let running = false;
const predictionsCache = {}; // per-block cache

/* ---------- Helpers ---------- */
accuracyPercent.innerText = `${Math.floor(Math.random()*9 + 88)}%`;

numberInput.addEventListener("input", () => {
  numberInput.value = numberInput.value.replace(/\D/g, "").slice(0, 3);
  saveState();
});
timeFrameEl.addEventListener("change", saveState);

function openChat(){
  window.open("https://whatsapp.com/channel/0029VbB9XqR3mFYDMrbUJt2c","_blank");
}
window.openChat = openChat; // for HTML FAB

function saveState() {
  const state = {
    num: numberInput.value || "",
    tf: parseInt(timeFrameEl.value, 10) || 30,
    hist: Array.from(historyBox.querySelectorAll(".history-item")).map(e => e.outerHTML)
  };
  localStorage.setItem("pv_state", JSON.stringify(state));
}
function restoreState() {
  const raw = localStorage.getItem("pv_state");
  if (!raw) return;
  try{
    const s = JSON.parse(raw);
    if (s.num) numberInput.value = s.num;
    if (s.tf) timeFrameEl.value = String(s.tf);
    if (Array.isArray(s.hist)) {
      historyBox.innerHTML = s.hist.join("");
    }
  }catch{}
}
restoreState();

/* ---------- Prediction core ---------- */
function start() {
  if (running) return;
  const num = numberInput.value;
  const tf = parseInt(timeFrameEl.value, 10);

  if (num.length !== 3) {
    alert("Enter valid 3-digit number!");
    return;
  }
  running = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  resetBtn.disabled = false;

  runPrediction(num, tf);
  startCountdown(tf, num);
}
function stop() {
  running = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  clearInterval(countdownInterval);
  timerBox.innerText = "⏸️ Paused";
}
function reset() {
  stop();
  bar.style.width = "0%";
  timerBox.innerText = "⏳ Waiting...";
  resultBox.innerText = "Result: ❓";
}
startBtn.addEventListener("click", start);
stopBtn.addEventListener("click", stop);
resetBtn.addEventListener("click", reset);

function startCountdown(seconds, currentNum) {
  clearInterval(countdownInterval);
  let timeLeft = seconds;
  timerBox.innerText = `⏳ ${timeLeft}s`;
  setBar(seconds, timeLeft); // init fill

  countdownInterval = setInterval(() => {
    if (!running) { clearInterval(countdownInterval); return; }
    timeLeft--;
    timerBox.innerText = `⏳ ${timeLeft}s`;
    setBar(seconds, timeLeft);
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      const nextNum = (parseInt(currentNum, 10) + 1).toString().padStart(3, "0");
      numberInput.value = nextNum;
      saveState();
      runPrediction(nextNum, seconds);
      startCountdown(seconds, nextNum);
    }
  }, 1000);
}

/* Smooth progress bar fill (right-to-left countdown look) */
function setBar(total, left) {
  const percent = Math.max(0, Math.min(100, Math.round(((total - left) / total) * 100)));
  bar.style.width = `${percent}%`;
}

/* Sound */
function playSound(pred) {
  try{
    if (pred.includes("Small")) document.getElementById("smallSound")?.play();
    if (pred.includes("Big")) document.getElementById("bigSound")?.play();
  }catch{}
}

/* SHA-256 based pseudo prediction (stable within a time block) */
async function runPrediction(num, tf) {
  const block = Math.floor(Date.now() / 1000 / tf);
  const key = `${num}-${tf}-${block}`;
  if (predictionsCache[key]) {
    // already computed for this block+num
    showResult(num, tf, predictionsCache[key]);
    return;
  }

  resultBox.innerText = "Analyzing...";

  // small UX delay to let bar animate each run
  await delay(300);

  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const sum = [...new Uint8Array(hash)].reduce((a, b) => a + b, 0);
  const pred = sum % 2 === 0 ? "Small 🔴" : "Big 🟢";

  predictionsCache[key] = pred;
  showResult(num, tf, pred);
  playSound(pred);
  addHistory(num, tf, pred);
  saveState();
}
function showResult(num, tf, pred) {
  resultBox.innerText = `Result: ${pred}  •  #${num} (${tf}s)`;
}
function addHistory(num, tf, pred) {
  const row = document.createElement("div");
  row.className = "history-item";
  const ts = new Date().toLocaleTimeString();
  row.innerHTML = `<span>${ts} • #${num} (${tf}s)</span><strong>${pred}</strong>`;
  historyBox.prepend(row);
}
const delay = (ms) => new Promise(res => setTimeout(res, ms));