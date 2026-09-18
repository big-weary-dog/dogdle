import { Scene, subjectStyle } from "/effects.js";

const PLAYER_KEY = "dogdle-player-id";
const NAME_KEY = "dogdle-name";
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

const sceneBack = new Scene(el("sceneBack"), "back");
const sceneFront = new Scene(el("sceneFront"), "front");
const scenes = [sceneBack, sceneFront];
window.addEventListener("resize", () => scenes.forEach((s) => s.resize()));

function getPlayerId() {
  let id = localStorage.getItem(PLAYER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_KEY, id);
  }
  return id;
}

// Must match the server's day boundary, or the local cache and the roll disagree.
const DAY_ZONE = "America/New_York";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: DAY_ZONE }).format(new Date());
const cacheKey = () => `${RESULT_PREFIX}${today()}`;

function countdown() {
  // Time left in the Eastern day, read off the wall clock in that zone. On the two DST
  // changeover days this is an hour out for part of the day, which nobody will notice.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DAY_ZONE, hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const elapsed = (get("hour") % 24) * 3600 + get("minute") * 60 + get("second");
  const left = 86400 - elapsed;
  return `Next dog in ${Math.floor(left / 3600)}h ${Math.floor((left % 3600) / 60)}m`;
}

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);



function getName() {
  return localStorage.getItem(NAME_KEY) || "";
}

function fillBoard(rows, mode) {
  const list = el("boardList");
  list.innerHTML = "";

  if (!rows.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = mode === "today" ? "Nobody has rolled yet today." : "No dogdles saved yet.";
    list.appendChild(li);
    return;
  }

  rows.forEach((row, i) => {
    const li = document.createElement("li");

    const rank = document.createElement("span");
    rank.className = "rank";
    rank.textContent = mode === "today" ? `${i + 1}.` : "";

    const who = document.createElement("span");
    who.className = "who";
    // textContent throughout: names are player-supplied.
    who.textContent = mode === "today" ? (row.player || "anon") : row.date;

    const what = document.createElement("span");
    what.className = "what";
    what.textContent = mode === "today"
      ? `${row.emoji || ""} ${row.dog} the ${row.breed}`
      : `${row.name} the ${row.breed}`;

    const pts = document.createElement("span");
    pts.className = "pts";
    pts.textContent = signed(row.score);
    pts.style.color = row.score > 2 ? "#4ade80" : row.score < -5 ? "#f87171" : "#facc15";

    li.append(rank, who, what, pts);
    list.appendChild(li);
  });
}

async function loadBoard(mode) {
  el("tabToday").classList.toggle("active", mode === "today");
  el("tabMine").classList.toggle("active", mode === "mine");
  try {
    const url = mode === "today"
      ? "/api/leaderboard"
      : `/api/history?player=${encodeURIComponent(getPlayerId())}`;
    const res = await fetch(url);
    const body = await res.json();
    fillBoard(body.rows || [], mode);
  } catch {
    fillBoard([], mode);
  }
}

function renderBadges(dog) {
  const rail = el("badges");
  rail.innerHTML = "";
  for (const item of [dog.background, ...dog.modifiers]) {
    const span = document.createElement("span");
    span.textContent = item.emoji;
    span.title = item.name || item.text;
    rail.appendChild(span);
  }
}

function applyScene(dog) {
  const effects = [dog.background.effect, ...dog.modifiers.map((m) => m.effect)];
  for (const s of scenes) {
    s.setScene({ sky: dog.background.sky, ground: dog.background.ground, effects });
    s.start();
  }

  const subject = subjectStyle(effects);
  dogPhoto.style.filter = subject.filter;
  dogPhoto.style.animation = subject.animation;
  if (subject.opacity) dogPhoto.style.opacity = subject.opacity;

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
  renderBadges(dog);

  const list = el("modifiersList");
  list.innerHTML = "";

  const rows = [
    { label: `${dog.background.emoji} ${dog.background.name}`, category: "background", value: dog.background.value, scene: true },
    ...dog.modifiers.map((m) => ({ label: `${m.emoji} ${m.text}`, category: m.category, value: m.value })),
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
    // Link the PNG itself, not the /s/ page: a direct image URL unfurls in Discord as a
    // bare image with no title/description chrome. The angle brackets around the game link
    // stop it unfurling a second embed underneath.
    const imageUrl = `${location.origin}/i/${encodeURIComponent(getPlayerId())}/${dog.date}.gif`;
    const text = [
      `Dogdle ${dog.date}`,
      `${dog.name} the ${dog.breed} (${dog.rarityLabel})`,
      `${dog.background.emoji} ${dog.background.name} (${signed(dog.background.value)})`,
      ...dog.modifiers.map((m) => `${m.emoji} ${m.text} (${signed(m.value)})`),
      `Score: ${signed(dog.score)} — ${dog.qualityLabel}`,
      imageUrl,
      `Try yourself: <${location.origin}>`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      el("shareBtn").textContent = "Copied!";
      setTimeout(() => (el("shareBtn").textContent = "Copy share card"), 1600);
    });
  };
}


// Draws one composite frame of the live stage: back canvas, the photo with its subject
// filters, the front canvas, the badge rail, then the caption bar.
function drawCardFrame(ctx, w, h, dog) {
  const stageEl = el("stage");
  ctx.drawImage(el("sceneBack"), 0, 0, w, h);

  if (!dogPhoto.hidden && dogPhoto.complete && dogPhoto.naturalWidth) {
    const rect = dogPhoto.getBoundingClientRect();
    const stageRect = stageEl.getBoundingClientRect();
    const scale = w / stageRect.width;
    const dw = rect.width * scale;
    const dh = rect.height * scale;
    const dx = (rect.left - stageRect.left) * scale;
    const dy = (rect.top - stageRect.top) * scale;

    ctx.save();
    ctx.filter = dogPhoto.style.filter || "none";
    ctx.beginPath();
    ctx.ellipse(dx + dw / 2, dy + dh / 2, dw / 2, dh / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(dogPhoto, dx, dy, dw, dh);
    ctx.restore();

    ctx.strokeStyle = dog.rarityColor;
    ctx.lineWidth = Math.max(2, dw * 0.02);
    ctx.beginPath();
    ctx.ellipse(dx + dw / 2, dy + dh / 2, dw / 2, dh / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.drawImage(el("sceneFront"), 0, 0, w, h);

  const items = [dog.background, ...dog.modifiers];
  const size = Math.round(w * 0.052);
  const gap = Math.round(size * 0.28);
  let by = Math.round(h * 0.035);
  for (const item of items) {
    const bx = w - size - Math.round(w * 0.028);
    ctx.fillStyle = "rgba(0,0,0,.5)";
    ctx.beginPath();
    ctx.roundRect(bx, by, size, size, size * 0.28);
    ctx.fill();
    ctx.font = `${Math.round(size * 0.62)}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(item.emoji, bx + size / 2, by + size / 2);
    by += size + gap;
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const barH = Math.round(h * 0.16);
  ctx.fillStyle = "rgba(8,10,16,.82)";
  ctx.fillRect(0, h - barH, w, barH);
  ctx.fillStyle = "#fff";
  ctx.font = `600 ${Math.round(barH * 0.34)}px -apple-system, system-ui, sans-serif`;
  ctx.fillText(`${dog.name} — ${dog.breed}`, w * 0.024, h - barH + barH * 0.42);
  ctx.fillStyle = dog.qualityColor;
  ctx.font = `700 ${Math.round(barH * 0.3)}px -apple-system, system-ui, sans-serif`;
  ctx.fillText(`${dog.qualityLabel}  ${signed(dog.score)}`, w * 0.024, h - barH + barH * 0.82);
}

// Records the stage as an animated GIF so the shared card moves the way the game does.
// Kept small deliberately: GIF is limited to 256 colours and grows fast with size and
// frame count, so this is 480px wide over a ~2s loop. Best-effort -- sharing still works
// without it, falling back to the plain breed photo.
async function uploadCard(dog) {
  try {
    const { GIFEncoder, quantize, applyPalette } = await import("/vendor/gifenc.js");

    const stageEl = el("stage");
    const w = 480;
    const h = Math.round((w * stageEl.clientHeight) / stageEl.clientWidth);
    const frames = 16;
    const delay = 120;

    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d", { willReadFrequently: true });

    const gif = GIFEncoder();
    let palette = null;

    for (let i = 0; i < frames; i++) {
      drawCardFrame(ctx, w, h, dog);
      const { data } = ctx.getImageData(0, 0, w, h);
      // One palette for the whole animation: reusing it compresses far better than
      // quantising every frame separately.
      if (!palette) palette = quantize(data, 256);
      gif.writeFrame(applyPalette(data, palette), w, h, { palette, delay });
      await new Promise((r) => setTimeout(r, delay));
    }

    gif.finish();
    const blob = new Blob([gif.bytes()], { type: "image/gif" });

    await fetch(
      `/api/card?player=${encodeURIComponent(getPlayerId())}&date=${encodeURIComponent(dog.date)}`,
      { method: "PUT", body: blob }
    );
  } catch {
    // A failed card just means the embed falls back to the plain breed photo.
  }
}

function showDog(dog, { animate }) {
  applyScene(dog);

  const reveal = () => {
    spinner.hidden = true;
    if (dog.photo) {
      dogPhoto.crossOrigin = "anonymous";
      dogPhoto.src = `/img?u=${encodeURIComponent(dog.photo)}`;
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
    setTimeout(() => uploadCard(dog), 900);
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

  const nameInput = el("nameInput");
  nameInput.value = getName();
  async function saveName() {
    const value = nameInput.value.trim().slice(0, 20);
    localStorage.setItem(NAME_KEY, value);

    const saved = el("nameSaved");
    saved.hidden = false;
    saved.style.color = "#4ade80";

    if (!value) {
      saved.style.color = "#f87171";
      saved.textContent = "Enter a name first";
      return;
    }

    try {
      const res = await fetch(
        `/api/name?player=${encodeURIComponent(getPlayerId())}&name=${encodeURIComponent(value)}`,
        { method: "POST" }
      );
      // ok is false when today's dog hasn't been rolled yet; the name still applies to it.
      saved.textContent = (await res.json()).ok ? `Saved as ${value}` : `Saved — applies when you roll`;
      loadBoard("today");
    } catch {
      saved.style.color = "#f87171";
      saved.textContent = "Couldn't save, try again";
    }
  }

  el("nameBtn").onclick = saveName;
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveName();
  });

  el("tabToday").onclick = () => loadBoard("today");
  el("tabMine").onclick = () => loadBoard("mine");
  loadBoard("today");

  // The server is the source of truth for a roll that already happened, so ask it before
  // trusting the local copy -- that is what makes an already-dealt dog survive content
  // edits, and what keeps the dog consistent across devices.
  try {
    const res = await fetch(
      `/api/roll?player=${encodeURIComponent(getPlayerId())}&name=${encodeURIComponent(getName())}&peek=1`
    );
    if (res.ok) {
      const dog = await res.json();
      if (dog.replayed) {
        localStorage.setItem(cacheKey(), JSON.stringify(dog));
        showDog(dog, { animate: false });
        return;
      }
    }
  } catch {
    const cached = localStorage.getItem(cacheKey());
    if (cached) {
      showDog(JSON.parse(cached), { animate: false });
      return;
    }
  }

  // Someone who rolled before rolls were stored server-side has a dog in this browser and
  // nothing on the server, so they never reached the leaderboard. Materialise it now. The
  // server re-derives the dog itself rather than trusting anything posted from here, so
  // this can't be used to submit an invented score.
  const cached = localStorage.getItem(cacheKey());
  if (cached) {
    try {
      const res = await fetch(
        `/api/roll?player=${encodeURIComponent(getPlayerId())}&name=${encodeURIComponent(getName())}`
      );
      if (res.ok) {
        const dog = await res.json();
        localStorage.setItem(cacheKey(), JSON.stringify(dog));
        showDog(dog, { animate: false });
        loadBoard("today");
        return;
      }
    } catch {
      // Offline: fall back to the local copy.
    }
    showDog(JSON.parse(cached), { animate: false });
    return;
  }

  for (const s of scenes) {
    s.setScene({ sky: ["#1e293b", "#334155"], ground: "#0f172a", effects: [] });
    s.start();
  }

  pullBtn.onclick = async () => {
    pullBtn.onclick = null;
    try {
      const res = await fetch(
        `/api/roll?player=${encodeURIComponent(getPlayerId())}&name=${encodeURIComponent(getName())}`
      );
      if (!res.ok) throw new Error("roll failed");
      const dog = await res.json();
      localStorage.setItem(cacheKey(), JSON.stringify(dog));
      showDog(dog, { animate: true });
      loadBoard("today");
    } catch {
      pullBtn.disabled = false;
      pullBtn.textContent = "Something went wrong — tap to retry";
      pullBtn.onclick = () => location.reload();
    }
  };
}

init();
