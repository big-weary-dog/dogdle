// Playtest harness: same rendering path as the real game, minus the once-a-day lock.

import { Scene, subjectStyle } from "/effects.js";

const el = (id) => document.getElementById(id);
const stage = el("stage");
const spinner = el("spinner");
const dogPhoto = el("dogPhoto");

const sceneBack = new Scene(el("sceneBack"), "back");
const sceneFront = new Scene(el("sceneFront"), "front");
const scenes = [sceneBack, sceneFront];
window.addEventListener("resize", () => scenes.forEach((s) => s.resize()));

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

function render(dog) {
  const effects = [dog.background.effect, ...dog.modifiers.map((m) => m.effect)];

  for (const s of scenes) {
    s.setScene({
      sky: dog.background.sky,
      ground: dog.background.ground,
      horizon: dog.background.horizon,
      props: dog.background.props,
      effects,
    });
    s.start();
  }

  // Reset anything a previous roll left on the photo before applying this one's.
  const subject = subjectStyle(effects);
  dogPhoto.style.filter = subject.filter;
  dogPhoto.style.animation = subject.animation;
  dogPhoto.style.opacity = subject.opacity || "1";

  stage.classList.remove("shaking");
  const shake = dog.modifiers.find((m) => m.effect?.type === "shake");
  if (shake) {
    stage.style.setProperty("--shake", `${shake.effect.params.intensity ?? 3}px`);
    stage.style.animationDuration = `${shake.effect.params.period ?? 600}ms`;
    stage.classList.add("shaking");
  }

  if (dog.photo) {
    dogPhoto.crossOrigin = "anonymous";
    dogPhoto.src = `/img?u=${encodeURIComponent(dog.photo)}`;
    dogPhoto.style.borderColor = dog.rarityColor;
    dogPhoto.style.boxShadow = `0 10px 30px rgba(0,0,0,.55), ${dog.rarityGlow}`;
    dogPhoto.hidden = false;
    spinner.hidden = true;
    dogPhoto.onerror = () => {
      dogPhoto.hidden = true;
      spinner.hidden = false;
      spinner.textContent = "🐕";
    };
  } else {
    dogPhoto.hidden = true;
    spinner.hidden = false;
    spinner.textContent = "🐕";
  }

  el("dogName").textContent = dog.name;
  el("breedName").textContent = `${dog.breed} · ${dog.breedSlug}`;
  el("rarityBadge").textContent = dog.rarityLabel;
  el("rarityBadge").style.background = dog.rarityColor;
  el("qualityLabel").textContent = dog.qualityLabel;
  el("qualityLabel").style.color = dog.qualityColor;
  el("scoreValue").textContent = signed(dog.score);
  el("scoreValue").style.color = dog.qualityColor;
  el("sceneLabel").textContent = `${dog.background.name} · ${dog.background.rarityLabel}`;
  el("sceneLabel").hidden = false;

  const rail = el("badges");
  rail.innerHTML = "";
  for (const item of [dog.background, ...dog.modifiers]) {
    const span = document.createElement("span");
    span.textContent = item.emoji;
    rail.appendChild(span);
  }
  el("seedLabel").textContent = `seed: ${dog.devSeed}`;

  const list = el("modifiersList");
  list.innerHTML = "";
  const rows = [
    { label: `${dog.background.emoji} ${dog.background.name}`, category: "background", value: dog.background.value, scene: true },
    ...dog.modifiers.map((m) => ({
      label: `${m.emoji} ${m.text}`, category: `${m.category}${m.effect ? ` · ${m.effect.type}/${m.effect.layer}` : ""}`,
      value: m.value,
    })),
  ];

  for (const row of rows) {
    const li = document.createElement("li");
    li.className = row.scene ? "scene" : row.value > 0 ? "pos" : row.value < 0 ? "neg" : "";
    li.innerHTML = `<div class="mod-label"><span class="mod-cat"></span></div><span class="mod-value"></span>`;
    li.querySelector(".mod-cat").textContent = row.category;
    li.querySelector(".mod-label").append(document.createTextNode(row.label));
    const v = li.querySelector(".mod-value");
    v.textContent = signed(row.value);
    v.className = `mod-value ${row.value > 0 ? "pos" : row.value < 0 ? "neg" : ""}`;
    list.appendChild(li);
  }

  el("result").hidden = false;
}

async function reroll(seed = crypto.randomUUID()) {
  const res = await fetch(`/api/dev-roll?seed=${encodeURIComponent(seed)}`);
  render(await res.json());
}

el("rerollBtn").onclick = () => reroll();

// Cycles quickly so you can eyeball a lot of combinations in a few seconds.
let spinning = null;
el("reroll10Btn").onclick = () => {
  if (spinning) {
    clearInterval(spinning);
    spinning = null;
    el("reroll10Btn").textContent = "Reroll ×10 (fast)";
    return;
  }
  let n = 0;
  el("reroll10Btn").textContent = "Stop";
  spinning = setInterval(() => {
    reroll();
    if (++n >= 10) el("reroll10Btn").onclick();
  }, 900);
};

reroll();
