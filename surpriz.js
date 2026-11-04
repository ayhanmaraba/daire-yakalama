// ===== Sürprizler =====
// Bu dosya oyunun orijinal kodunu değiştirmeden üstüne eklenir.
// script.js'teki global değişkenleri (score, playing, POINTS...) kullanır.
(() => {
  const GOLD_CHANCE = 0.12;    // her tıklamadan sonra altın daire çıkma ihtimali
  const GOLD_TIME = 1400;      // ms, altın daire bu kadar süre altın kalır
  const GOLD_BONUS = 20;       // altın daireye tıklayınca ekstra puan
  const COMBO_WINDOW = 900;    // ms, bu süre içinde tekrar vurursan seri devam eder
  const COMBO_START = 3;       // kaçıncı vuruştan itibaren bonus başlar

  let combo = 0;
  let lastHit = 0;
  let goldTimer = null;
  let disco = false;

  // ---- Ses (WebAudio, ilk dokunuşta açılır) ----
  let audio = null;
  function ctx() {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === "suspended") audio.resume();
    return audio;
  }

  function beep(freq, dur = 0.08, type = "sine", vol = 0.15, when = 0) {
    const a = ctx();
    if (!a) return;
    const t = a.currentTime + when;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  const sounds = {
    hit: (c) => beep(440 * Math.pow(1.06, Math.min(c, 15)), 0.07, "triangle"),
    gold: () => [784, 988, 1319, 1568].forEach((f, i) => beep(f, 0.12, "square", 0.08, i * 0.06)),
    disco: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => beep(f, 0.1, "sawtooth", 0.06, i * 0.08)),
    record: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.25, "triangle", 0.12, i * 0.12)),
  };

  // ---- Görsel efektler ----
  function areaPoint(e) {
    const r = gameArea.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function burst(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "spark";
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 60;
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.background = colors[i % colors.length];
      p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      p.style.setProperty("--dy", Math.sin(angle) * dist + "px");
      p.addEventListener("animationend", () => p.remove());
      gameArea.appendChild(p);
    }
  }

  function floatText(x, y, text, cls = "") {
    const t = document.createElement("span");
    t.className = "float-text " + cls;
    t.textContent = text;
    t.style.left = x + "px";
    t.style.top = y + "px";
    t.addEventListener("animationend", () => t.remove());
    gameArea.appendChild(t);
  }

  function shake() {
    gameArea.classList.remove("shake");
    void gameArea.offsetWidth; // animasyonu yeniden başlat
    gameArea.classList.add("shake");
  }

  function toast(text) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    t.addEventListener("animationend", () => t.remove());
    document.body.appendChild(t);
  }

  function confetti() {
    const colors = ["#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
    for (let i = 0; i < 120; i++) {
      const c = document.createElement("span");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.6 + "s";
      c.style.animationDuration = 2 + Math.random() * 1.5 + "s";
      c.style.setProperty("--drift", (Math.random() - 0.5) * 200 + "px");
      c.style.setProperty("--spin", Math.random() * 1080 + "deg");
      c.addEventListener("animationend", () => c.remove());
      document.body.appendChild(c);
    }
  }

  function updateScore() {
    scoreEl.textContent = score;
    scoreEl.classList.remove("pop");
    void scoreEl.offsetWidth;
    scoreEl.classList.add("pop");
  }

  // ---- Altın daire ----
  function clearGold() {
    clearTimeout(goldTimer);
    circle.classList.remove("golden");
  }

  function maybeGold() {
    if (Math.random() >= GOLD_CHANCE) return;
    circle.classList.add("golden");
    clearTimeout(goldTimer);
    goldTimer = setTimeout(clearGold, GOLD_TIME);
  }

  // ---- Vuruş: script.js'teki dinleyiciden SONRA çalışır ----
  circle.addEventListener("pointerdown", (e) => {
    if (!playing) return;
    const { x, y } = areaPoint(e);
    const wasGold = circle.classList.contains("golden");
    const mult = disco ? 2 : 1;
    const now = performance.now();

    combo = now - lastHit <= COMBO_WINDOW ? combo + 1 : 1;
    lastHit = now;

    let gained = POINTS;
    if (disco) { score += POINTS; gained += POINTS; } // disko modunda temel puan x2

    const comboBonus = combo >= COMBO_START ? (combo - COMBO_START + 1) * mult : 0;
    score += comboBonus;
    gained += comboBonus;

    if (wasGold) {
      clearGold();
      score += GOLD_BONUS * mult;
      gained += GOLD_BONUS * mult;
      burst(x, y, 24, ["#fde047", "#facc15", "#f59e0b", "#fff7ae"]);
      shake();
      sounds.gold();
      floatText(x, y, `+${gained} ALTIN!`, "gold");
    } else {
      sounds.hit(combo);
      burst(x, y, 8, disco ? ["#f472b6", "#60a5fa", "#4ade80", "#facc15"] : ["#fb7185", "#f43f5e", "#fecdd3"]);
      if (comboBonus) floatText(x, y, `+${gained} SERİ x${combo}`, combo >= 8 ? "hot" : "");
      else floatText(x, y, `+${gained}`);
    }

    if (combo === 10) { toast("🔥 ALEV ALDIN! 10'lu seri!"); shake(); }

    updateScore();
    maybeGold();
  });

  // Oyun başlarken seriyi ve altın daireyi sıfırla
  startBtn.addEventListener("click", () => {
    combo = 0;
    lastHit = 0;
    clearGold();
    ctx(); // sesi kullanıcı etkileşimiyle aç (mobil için gerekli)
  });

  // Oyun bitince rekor varsa konfeti
  const originalEndGame = endGame;
  endGame = function () {
    const previous = loadScores();
    const prevBest = previous.length ? Math.max(...previous.map((s) => s.score)) : 0;
    clearGold();
    originalEndGame();
    if (previous.length > 0 && score > prevBest) {
      confetti();
      sounds.record();
    }
  };

  // ---- Gizli Disko Modu: Konami kodu veya başlığa 5 kez dokun ----
  function toggleDisco() {
    disco = !disco;
    document.body.classList.toggle("disco", disco);
    if (disco) {
      sounds.disco();
      toast("🪩 DİSKO MODU! Tüm puanlar x2");
    } else {
      toast("Disko modu kapandı");
    }
  }

  const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let kIndex = 0;
  document.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === konami[kIndex]) {
      kIndex++;
      if (kIndex === konami.length) { kIndex = 0; toggleDisco(); }
    } else {
      kIndex = key === konami[0] ? 1 : 0;
    }
  });

  const title = document.querySelector(".topbar h1");
  let taps = 0;
  let tapTimer = null;
  title.addEventListener("click", () => {
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => (taps = 0), 1500);
    if (taps >= 5) { taps = 0; toggleDisco(); }
  });
})();
