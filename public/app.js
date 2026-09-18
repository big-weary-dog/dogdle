import { Scene } from "/effects.js";

const PLAYER_KEY = "dogdle-player-id";
const RESULT_PREFIX = "dogdle-result-";
const SPIN_EMOJIS = ["🐶", "🐕", "🦴", "🐾", "🎾", "🐩", "🦮", "🐕‍🦺"];
const SPIN_MS = 1600;

const el = (id) => document.getElementById(id);
const stage = el("stage");
const spinner = el("spinner");
const dogPhoto = el("dogPhoto");
const sceneLabel = el("sceneLabel");
const pullBtn = el("pullBtn");
const result = el("result");

const scene = new Scene(el("scene"));
window.addEventListener("resize", () => scene.resize());

function getPlayerId() {
  let id = localStorage.getItem(PLAYER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_KEY, id);
  }
  return id;
}

const todayUTC = () => new Date().toISOString().slice(0, 10);
const cacheKey = () => `${RESULT_PREFIX}${todayUTC()}`;

function countdown() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const ms = next - now;
  return `Next dog in ${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

function applyScene(dog) {
  const effects = [dog.background.effect, ...dog.modifiers.map((m) => m.effect)];
  scene.setScene({ sky: dog.background.sky, ground: dog.background.ground, effects });
  scene.start();

  const shake = dog.modifiers.find((m) => m.effect?.type === "shake");
  if (shake && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stage.style.setProperty("--shake", `${shake.effect.params.intensity ?? 3}px`);
    stage.style.animationDuration = `${shake.effect.params.period ?? 600}ms`;
    stage.classList.add("shaking");
  }
}

function renderResult(dog) {
  el("dogName").textContent = dog.name;
  el("breedName").textContent = dog.breed;

  const badge = el("rarityBadge");
  badge.textContent = dog.rarityLabel;
  badge.style.background = dog.rarityColor;

  el("qualityLabel").textContent = dog.qualityLabel;
  el("qualityLabel").style.color = dog.qualityColor;

  const score = el("scoreValue");
  score.textContent = signed(dog.score);
  score.style.color = dog.qualityColor;

  sceneLabel.textContent = `${dog.background.name} · ${dog.background.rarityLabel}`;
  sceneLabel.hidden = false;

  const list = el("modifiersList");
  list.innerHTML = "";

  const rows = [
    { label: dog.background.name, category: "background", value: dog.background.value, scene: true },
    ...dog.modifiers.map((m) => ({ label: m.text, category: m.category, value: m.value })),
  ];

  rows.forEach((row, i) => {
    const li = document.createElement("li");
    li.className = row.scene ? "scene" : row.value > 0 ? "pos" : row.value < 0 ? "neg" : "";
    li.style.animationDelay = `${i * 70}ms`;

    const label = document.createElement("div");
    label.className = "mod-label";
    const cat = document.createElement("span");
    cat.className = "mod-cat";
    cat.textContent = row.category;
    label.append(cat, document.createTextNode(row.label));

    const value = document.createElement("span");
    value.className = `mod-value ${row.value > 0 ? "pos" : row.value < 0 ? "neg" : ""}`;
    value.textContent = signed(row.value);

    li.append(label, value);
    list.appendChild(li);
  });

  el("nextRoll").textContent = countdown();
  result.hidden = false;

  el("shareBtn").onclick = () => {
    const text = [
      `Dogdle ${dog.date}`,
      `${dog.name} the ${dog.breed} (${dog.rarityLabel})`,
      `📍 ${dog.background.name}`,
      ...dog.modifiers.map((m) => `${m.value >= 0 ? "✅" : "❌"} ${m.text}`),
      `Score: ${signed(dog.score)} — ${dog.qualityLabel}`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      el("shareBtn").textContent = "Copied!";
      setTimeout(() => (el("shareBtn").textContent = "Copy share card"), 1600);
    });
  };
}

function showDog(dog, { animate }) {
  applyScene(dog);

  const reveal = () => {
    spinner.hidden = true;
    if (dog.photo) {
      dogPhoto.src = dog.photo;
      dogPhoto.alt = dog.breed;
      dogPhoto.style.boxShadow = `0 10px 30px rgba(0,0,0,.55), ${dog.rarityGlow}`;
      dogPhoto.style.borderColor = dog.rarityColor;
      dogPhoto.hidden = false;
      // A dead photo URL shouldn't leave an empty frame.
      dogPhoto.onerror = () => {
        dogPhoto.hidden = true;
        spinner.hidden = false;
        spinner.textContent = "🐕";
      };
    } else {
      spinner.hidden = false;
      spinner.textContent = "🐕";
    }
    renderResult(dog);
    pullBtn.disabled = true;
    pullBtn.textContent = "Come back tomorrow";
  };

  if (!animate) return reveal();

  pullBtn.disabled = true;
  pullBtn.textContent = "Rolling...";
  const start = performance.now();

  const frame = (now) => {
    const elapsed = now - start;
    if (elapsed < SPIN_MS) {
      // Slot machines slow down as they land; so does this.
      const step = 60 + (elapsed / SPIN_MS) ** 3 * 260;
      spinner.textContent = SPIN_EMOJIS[Math.floor(elapsed / step) % SPIN_EMOJIS.length];
      requestAnimationFrame(frame);
    } else {
      reveal();
    }
  };
  requestAnimationFrame(frame);
}

async function init() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(RESULT_PREFIX) && key !== cacheKey()) localStorage.removeItem(key);
  }

  const cached = localStorage.getItem(cacheKey());
  if (cached) {
    showDog(JSON.parse(cached), { animate: false });
    return;
  }

  scene.setScene({ sky: ["#1e293b", "#334155"], ground: "#0f172a", effects: [] });
  scene.start();

  pullBtn.onclick = async () => {
    pullBtn.onclick = null;
    try {
      const res = await fetch(`/api/roll?player=${encodeURIComponent(getPlayerId())}`);
      if (!res.ok) throw new Error("roll failed");
      const dog = await res.json();
      localStorage.setItem(cacheKey(), JSON.stringify(dog));
      showDog(dog, { animate: true });
    } catch {
      pullBtn.disabled = false;
      pullBtn.textContent = "Something went wrong — tap to retry";
      pullBtn.onclick = () => location.reload();
    }
  };
}

init();
