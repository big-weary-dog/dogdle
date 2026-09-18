const PLAYER_KEY = "dogdle-player-id";
const RESULT_KEY_PREFIX = "dogdle-result-";
const SPIN_EMOJIS = ["🐶", "🐕", "🦴", "🐾", "🎾", "🐩", "🦮"];

function getPlayerId() {
  let id = localStorage.getItem(PLAYER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_KEY, id);
  }
  return id;
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

const reelItem = document.getElementById("reelItem");
const pullBtn = document.getElementById("pullBtn");
const result = document.getElementById("result");
const rarityBadge = document.getElementById("rarityBadge");
const breedName = document.getElementById("breedName");
const qualityLabel = document.getElementById("qualityLabel");
const sizeTag = document.getElementById("sizeTag");
const coatTag = document.getElementById("coatTag");
const modifiersList = document.getElementById("modifiersList");
const shareBtn = document.getElementById("shareBtn");
const nextRoll = document.getElementById("nextRoll");

function msUntilNextUTCDay() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next - now;
}

function formatCountdown(ms) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `Next dog in ${h}h ${m}m`;
}

function renderDog(dog) {
  rarityBadge.textContent = dog.rarityLabel;
  rarityBadge.style.background = dog.color;
  rarityBadge.style.color = "#0d0f14";

  breedName.textContent = dog.breed;
  breedName.style.textShadow = dog.glow;

  qualityLabel.textContent = dog.qualityLabel;
  qualityLabel.style.color = dog.qualityColor;

  sizeTag.textContent = dog.size;
  coatTag.textContent = dog.coat;

  modifiersList.innerHTML = "";
  for (const mod of dog.modifiers) {
    const li = document.createElement("li");
    li.className = mod.value > 0 ? "pos" : mod.value < 0 ? "neg" : "neutral";
    const label = document.createElement("span");
    label.textContent = mod.text;
    const val = document.createElement("span");
    val.className = "mod-value";
    val.textContent = mod.value > 0 ? `+${mod.value}` : `${mod.value}`;
    li.append(label, val);
    modifiersList.appendChild(li);
  }

  result.hidden = false;
  nextRoll.textContent = formatCountdown(msUntilNextUTCDay());

  shareBtn.onclick = () => {
    const text = [
      `🎰 Dogdle ${dog.date}`,
      `${dog.rarityLabel} ${dog.breed} (${dog.qualityLabel})`,
      `Score: ${dog.score > 0 ? "+" : ""}${dog.score}`,
      "swampkat.com/dogdle",
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      shareBtn.textContent = "Copied!";
      setTimeout(() => (shareBtn.textContent = "Copy share card"), 1500);
    });
  };
}

async function spinAndReveal(dog) {
  pullBtn.disabled = true;
  const spinDuration = 1200;
  const start = performance.now();

  function frame(now) {
    const elapsed = now - start;
    if (elapsed < spinDuration) {
      reelItem.textContent = SPIN_EMOJIS[Math.floor(elapsed / 80) % SPIN_EMOJIS.length];
      requestAnimationFrame(frame);
    } else {
      reelItem.textContent = "🐕";
      renderDog(dog);
      pullBtn.textContent = "Already pulled today";
    }
  }
  requestAnimationFrame(frame);
}

async function fetchTodaysDog() {
  const player = getPlayerId();
  const res = await fetch(`/api/roll?player=${encodeURIComponent(player)}`);
  if (!res.ok) throw new Error("roll failed");
  return res.json();
}

function cacheKey() {
  return `${RESULT_KEY_PREFIX}${todayUTC()}`;
}

async function init() {
  // Clean up any stale cached results from previous days.
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(RESULT_KEY_PREFIX) && key !== cacheKey()) {
      localStorage.removeItem(key);
    }
  }

  const cached = localStorage.getItem(cacheKey());
  if (cached) {
    const dog = JSON.parse(cached);
    reelItem.textContent = "🐕";
    renderDog(dog);
    pullBtn.disabled = true;
    pullBtn.textContent = "Already pulled today";
    return;
  }

  pullBtn.onclick = async () => {
    pullBtn.onclick = null;
    try {
      const dog = await fetchTodaysDog();
      localStorage.setItem(cacheKey(), JSON.stringify(dog));
      spinAndReveal(dog);
    } catch (err) {
      pullBtn.disabled = false;
      pullBtn.textContent = "Something went wrong, try again";
    }
  };
}

init();
