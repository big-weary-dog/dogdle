// The mega-kennel: every dog anyone has ever rolled, from /api/kennels. Everything shown
// is set as text -- names come from players. Only Discord dogs have a card to open; a web
// player's dogs are listed without anything that could lead back to them.

const content = document.getElementById("content");
const peek = document.getElementById("peek");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PAGE = 240;

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const prettyDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "style") Object.assign(node.style, v);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c != null) node.append(c);
  return node;
}

function notice(text) {
  content.replaceChildren(el("p", { className: "notice", textContent: text }));
}

function pressable(node, action) {
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  node.addEventListener("click", action);
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); action(); }
  });
  return node;
}

// A dog's card, over the page. Only dogs with a card get here.
function open(d) {
  peek.replaceChildren(
    el("button", { className: "close", type: "button", textContent: "✕", ariaLabel: "Close", onclick: () => peek.close() }),
    el("img", { src: d.image, width: 560, height: 320, alt: `${d.name} the ${d.breed}: ${signed(d.score)}` }),
    el("div", { className: "cap" },
      el("span", { textContent: `${d.qualityEmoji} ${d.name} ${signed(d.score)} · ${d.owner || "Someone"} · ${prettyDate(d.date)}` }),
      d.kennel ? el("a", { href: d.kennel, textContent: "Their kennel →" }) : null));
  peek.showModal();
}
peek.addEventListener("click", (e) => { if (e.target === peek) peek.close(); });

function highlight(label, dog) {
  if (!dog) return null;
  const node = el("div", { className: "panel highlight" },
    el("div", { className: "label", textContent: label }),
    el("div", { className: "what" },
      el("span", { textContent: `${dog.qualityEmoji} ${dog.name}` }),
      el("span", { textContent: signed(dog.score), style: { color: dog.qualityColor } })),
    el("div", { className: "sub", textContent: `${dog.breed} · ${dog.owner || "Someone"} · ${prettyDate(dog.date)}` }));
  return dog.image ? pressable(node, () => open(dog)) : node;
}

function panel(label, what, value, sub, color) {
  return el("div", { className: "panel highlight" },
    el("div", { className: "label", textContent: label }),
    el("div", { className: "what" }, el("span", { textContent: what }), el("span", { textContent: value, style: color ? { color } : {} })),
    el("div", { className: "sub", textContent: sub }));
}

function tile(d) {
  const node = el("div", { className: "tile", style: { borderLeftColor: d.qualityColor },
    title: `${d.name} the ${d.breed}, ${d.quality} ${signed(d.score)} · ${d.owner || "Someone"} · ${prettyDate(d.date)}` },
    el("div", { className: "n" },
      el("span", { textContent: `${d.frog ? "🐸" : d.qualityEmoji} ${d.name}` }),
      el("span", { textContent: signed(d.score), style: { color: d.qualityColor } })),
    el("div", { className: "b", textContent: `${d.place || ""} ${d.breed}`.trim() }),
    el("div", { className: "o" },
      d.image ? el("span", { className: "cam", textContent: "🖼️" }) : null,
      `${d.owner || "Someone"} · ${prettyDate(d.date)}`));
  return d.image ? pressable(node, () => open(d)) : node;
}

function kennels(list) {
  const rows = list.map((p, i) => el("tr", {},
    el("td", { className: "rank num", textContent: String(i + 1) }),
    el("td", { className: "name" }, p.kennel
      ? el("a", { href: p.kennel, textContent: p.name || "Someone" })
      : (p.name || "Someone")),
    el("td", { className: "num", textContent: String(p.dogs) }),
    el("td", { className: "num", textContent: signed(p.average) }),
    el("td", { className: "top", textContent: p.best ? `${p.best.qualityEmoji} ${p.best.name} ${signed(p.best.score)}` : "" })));
  return el("div", { className: "panel roster-scroll" },
    el("table", { className: "roster" },
      el("thead", {}, el("tr", {},
        el("th", { className: "num", textContent: "#" }), el("th", { textContent: "Player" }),
        el("th", { className: "num", textContent: "Dogs" }), el("th", { className: "num", textContent: "Avg" }),
        el("th", { className: "top", textContent: "Best dog" }))),
      el("tbody", {}, ...rows)));
}

function render(m) {
  document.getElementById("subtitle").textContent =
    `${plural(m.dogs - m.frogs, "dog")}` + (m.frogs ? ` and ${plural(m.frogs, "frog")}` : "") +
    ` from ${plural(m.players, "player")} over ${plural(m.days, "day")}` + (m.first ? `, since ${prettyDate(m.first)}.` : ".");

  const sorts = {
    newest: (a, b) => b.date.localeCompare(a.date) || b.score - a.score,
    best: (a, b) => b.score - a.score || b.date.localeCompare(a.date),
    worst: (a, b) => a.score - b.score || b.date.localeCompare(a.date),
  };
  let sortKey = "newest";
  let shown = PAGE;
  const wall = el("div", { className: "wall" });
  const countLine = el("p", { className: "count-line" });
  const more = el("button", { type: "button", className: "more", textContent: "Show more" });
  const find = el("input", { type: "search", className: "find", placeholder: "Find a dog or player", ariaLabel: "Find a dog" });
  const buttons = Object.keys(sorts).map((key) =>
    el("button", { type: "button", textContent: key[0].toUpperCase() + key.slice(1), onclick: () => { sortKey = key; shown = PAGE; draw(); } }));

  function draw() {
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.textContent.toLowerCase() === sortKey)));
    const q = find.value.trim().toLowerCase();
    const hits = (q ? m.all.filter((d) => `${d.name} ${d.breed} ${d.owner}`.toLowerCase().includes(q)) : [...m.all]).sort(sorts[sortKey]);
    wall.replaceChildren(...hits.slice(0, shown).map(tile));
    countLine.textContent = q
      ? `${plural(hits.length, "match", "matches")}${hits.length > shown ? `, showing ${shown}` : ""}.`
      : `Showing ${Math.min(shown, hits.length)} of ${hits.length}. Tap one with a 🖼️ to see its card.`;
    more.hidden = hits.length <= shown;
  }
  more.addEventListener("click", () => { shown += PAGE; draw(); });
  find.addEventListener("input", () => { shown = PAGE; draw(); });
  draw();

  content.replaceChildren(
    el("section", {}, el("div", { className: "highlights" },
      highlight("Best dog ever", m.best),
      m.averageQuality ? panel("The average dog", `${m.averageQuality.emoji} ${m.averageQuality.label}`, signed(m.average),
        `Total ${signed(m.total)} across ${plural(m.dogs - m.frogs, "dog")}`, m.averageQuality.color) : null,
      highlight("Worst dog ever", m.worst),
      m.commonBreed ? panel("Most rolled breed", `🧬 ${m.commonBreed.breed}`, `×${m.commonBreed.count}`,
        `${Math.round((100 * m.commonBreed.count) / Math.max(1, m.dogs - m.frogs))}% of all dogs`) : null)),
    el("section", {}, el("h2", { textContent: `Kennels · ${m.players}` }), kennels(m.kennels)),
    el("section", {},
      el("div", { className: "toolbar" },
        el("h2", { textContent: "Every dog, ever" }),
        el("div", { className: "tools" }, find, el("div", { className: "sort" }, ...buttons))),
      countLine, wall, el("div", { className: "sort" }, more)),
  );
}

async function load() {
  try {
    const res = await fetch("/api/kennels");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const m = await res.json();
    if (!m.dogs) return notice("No dogs yet. Be the first.");
    render(m);
  } catch {
    notice("Couldn't round up the dogs. Try again in a moment.");
  }
}

load();
