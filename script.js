// Oyun ayarları
const GAME_TIME = 20;        // saniye
const START_SIZE = 50;       // px
const MIN_SIZE = 15;         // px
const SHRINK = 0.9;          // her tıklamada boyut %10 küçülür
const START_DELAY = 1500;    // ms, dairenin yer değiştirme aralığı
const MIN_DELAY = 400;       // ms
const SPEED_UP = 0.88;       // her tıklamada aralık %12 kısalır
const POINTS = 5;
const STORAGE_KEY = "daireYakalamaSkorlar";

const el = (id) => document.getElementById(id);
const gameArea = el("gameArea");
const circle = el("circle");
const hint = el("hint");
const startBtn = el("startBtn");
const timeEl = el("time");
const scoreEl = el("score");
const resultBox = el("result");

let score = 0;
let timeLeft = GAME_TIME;
let size = START_SIZE;
let delay = START_DELAY;
let countdownTimer = null;
let moveTimer = null;
let playing = false;

// ---- Skor geçmişi ----
function loadScores() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveScores(scores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    /* depolama kapalıysa sessizce geç */
  }
}

function average(list) {
  if (list.length === 0) return 0;
  return list.reduce((sum, s) => sum + s.score, 0) / list.length;
}

function renderHistory() {
  const scores = loadScores();
  const list = el("historyList");
  list.innerHTML = "";

  el("emptyHistory").classList.toggle("hidden", scores.length > 0);
  el("count").textContent = scores.length;

  if (scores.length === 0) {
    el("best").textContent = "-";
    el("avg").textContent = "-";
    return;
  }

  const best = Math.max(...scores.map((s) => s.score));
  el("best").textContent = best;
  el("avg").textContent = average(scores).toFixed(1);

  // En yeni üstte
  scores
    .slice()
    .reverse()
    .forEach((s) => {
      const li = document.createElement("li");
      if (s.score === best) li.className = "best";
      li.innerHTML = `${s.score} puan <small>— ${s.date}</small>`;
      list.appendChild(li);
    });
}

// ---- Değerlendirme ----
function gradeFor(points) {
  if (points >= 95) return "🏆 Derece: Usta";
  if (points >= 65) return "🥇 Derece: Çok İyi";
  if (points >= 35) return "🥈 Derece: İyi";
  return "🥉 Derece: Başlangıç";
}

function showResult(points, previous) {
  el("finalScore").textContent = points;
  el("grade").textContent = gradeFor(points);

  const items = [];
  if (previous.length === 0) {
    items.push("İlk oyunun! Tekrar oynayıp kendini geliştir.");
  } else {
    const prevBest = Math.max(...previous.map((s) => s.score));
    const prevAvg = average(previous);
    const last = previous[previous.length - 1].score;

    if (points > prevBest) {
      items.push(`<span class="record">🎉 Yeni rekor! (Eski rekor: ${prevBest})</span>`);
    } else {
      items.push(`Rekorun: ${prevBest} puan`);
    }

    const diffAvg = points - prevAvg;
    items.push(
      diffAvg >= 0
        ? `<span class="up">▲ Ortalamanın ${diffAvg.toFixed(1)} puan üstünde</span>`
        : `<span class="down">▼ Ortalamanın ${Math.abs(diffAvg).toFixed(1)} puan altında</span>`
    );

    const diffLast = points - last;
    if (diffLast > 0) items.push(`<span class="up">▲ Önceki oyundan ${diffLast} puan fazla</span>`);
    else if (diffLast < 0) items.push(`<span class="down">▼ Önceki oyundan ${-diffLast} puan az</span>`);
    else items.push("Önceki oyunla aynı puan");
  }

  el("evaluation").innerHTML = items.map((t) => `<li>${t}</li>`).join("");
  resultBox.classList.remove("hidden");
}

// ---- Oyun ----
function moveCircle() {
  const maxX = gameArea.clientWidth - size;
  const maxY = gameArea.clientHeight - size;
  circle.style.width = size + "px";
  circle.style.height = size + "px";
  circle.style.left = Math.random() * Math.max(0, maxX) + "px";
  circle.style.top = Math.random() * Math.max(0, maxY) + "px";
}

function scheduleMove() {
  clearTimeout(moveTimer);
  moveTimer = setTimeout(() => {
    moveCircle();
    scheduleMove();
  }, delay);
}

function startGame() {
  score = 0;
  timeLeft = GAME_TIME;
  size = START_SIZE;
  delay = START_DELAY;
  playing = true;

  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  hint.classList.add("hidden");
  resultBox.classList.add("hidden");
  startBtn.disabled = true;

  circle.classList.remove("hidden");
  moveCircle();
  scheduleMove();

  countdownTimer = setInterval(() => {
    timeLeft--;
    timeEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  playing = false;
  clearInterval(countdownTimer);
  clearTimeout(moveTimer);
  circle.classList.add("hidden");

  const previous = loadScores();
  showResult(score, previous);

  const now = new Date();
  previous.push({
    score,
    date: now.toLocaleDateString("tr-TR") + " " +
          now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
  });
  saveScores(previous);
  renderHistory();

  startBtn.disabled = false;
  startBtn.textContent = "Tekrar Oyna";
}

circle.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (!playing) return;
  score += POINTS;
  scoreEl.textContent = score;
  size = Math.max(MIN_SIZE, size * SHRINK);
  delay = Math.max(MIN_DELAY, delay * SPEED_UP);
  moveCircle();
  scheduleMove();
});

startBtn.addEventListener("click", startGame);

el("clearBtn").addEventListener("click", () => {
  if (confirm("Tüm geçmiş skorlar silinsin mi?")) {
    saveScores([]);
    renderHistory();
  }
});

renderHistory();
