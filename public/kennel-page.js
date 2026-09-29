// The album page: one Discord player's whole collection, from /api/kennel. The player is
// the last part of the path (/kennel/discord-<id>). Everything shown is set as text --
// names come from players.

const player = location.pathname.split("/").filter(Boolean).pop() || "";
const content = document.getElementById("content");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86400000;
const FROG_GREEN = "#65a30d";

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
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

function stat(emoji, label, { found, total }, color) {
  const pct = total ? Math.max(found ? 1.5 : 0, (100 * found) / total) : 0;
  return el("div", { className: "panel stat" },
    el("div", { className: "top" },
      el("span", { textContent: `${emoji} ${label}` }),
      el("span", { className: "count", textContent: `${found} / ${total}` })),
    el("div", { className: "bar" }, el("i", { style: { width: `${pct}%`, background: color } })));
}

// Scrolls the dog grid to one dog and lights it up, until another is picked.
function showDog(date) {
  const card = document.getElementById(`dog-${date}`);
  if (!card) return;
  content.querySelector(".dog.lit")?.classList.remove("lit");
  card.classList.add("lit");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Buttons that aren't <button>s: squares and place tiles, which a grid lays out better.
function pressable(node, action) {
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  node.addEventListener("click", action);
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); action(); }
  });
  return node;
}

// A year of squares, a column a week, coloured by how good that day's dog was.
function calendar(dogs, tierList) {
  const byDate = new Map(dogs.map((d) => [d.date, d]));
  const newest = dogs.reduce((m, d) => (d.date > m ? d.date : m), "");
  const todayIso = new Date().toISOString().slice(0, 10);
  const end = Date.parse(`${newest > todayIso ? newest : todayIso}T00:00:00Z`);
  const weeks = 53;
  const start = end - ((weeks - 1) * 7 + new Date(end).getUTCDay()) * DAY_MS;

  const months = el("div", { className: "months" });
  const grid = el("div", { className: "calendar", role: "img", ariaLabel: "A year of dogs, one square a day" });
  let lastLabel = -9;
  for (let col = 0; col < weeks; col++) {
    const first = new Date(start + col * 7 * DAY_MS);
    const label = first.getUTCDate() <= 7 && col - lastLabel >= 3 ? MONTHS[first.getUTCMonth()] : "";
    if (label) lastLabel = col;
    months.append(el("span", { textContent: label }));
    for (let row = 0; row < 7; row++) {
      const t = start + (col * 7 + row) * DAY_MS;
      const iso = new Date(t).toISOString().slice(0, 10);
      const dog = byDate.get(iso);
      const cell = el("i");
      if (t > end) cell.className = "gone";
      else if (dog) {
        cell.style.background = dog.frog ? FROG_GREEN : dog.qualityColor;
        cell.title = `${prettyDate(iso)}: ${dog.name}${dog.frog ? " (a frog)" : ""}, ${dog.quality} ${signed(dog.score)}`;
        cell.ariaLabel = cell.title;
        cell.className = "has";
        pressable(cell, () => showDog(iso));
      } else cell.title = prettyDate(iso);
      grid.append(cell);
    }
  }

  const legend = el("div", { className: "legend" }, el("span", { textContent: "Worse" }));
  for (const t of tierList) legend.append(el("i", { title: t.label, style: { background: t.color } }));
  legend.append(el("span", { textContent: "Better" }), el("span", { className: "gap" }),
    el("i", { style: { background: FROG_GREEN } }), el("span", { textContent: "Frog" }));

  return el("div", { className: "panel" }, el("div", { className: "calendar-scroll" }, months, grid), legend);
}

function highlight(label, dog) {
  if (!dog) return null;
  return el("div", { className: "panel highlight" },
    el("div", { className: "label", textContent: label }),
    el("div", { className: "what" },
      el("span", { textContent: `${dog.qualityEmoji} ${dog.name}` }),
      el("span", { textContent: signed(dog.score), style: { color: dog.qualityColor } })),
    el("div", { className: "sub", textContent: `${dog.breed} · ${prettyDate(dog.date)}` }));
}

function dogCard(d) {
  return el("figure", { className: "dog", id: `dog-${d.date}` },
    el("a", { href: d.image, target: "_blank", rel: "noopener" },
      el("img", { src: d.image, loading: "lazy", decoding: "async", width: 560, height: 320,
        alt: `${d.name} the ${d.breed}: ${d.quality}, ${signed(d.score)}` })),
    el("figcaption", {},
      el("span", { className: "who", textContent: `${d.qualityEmoji} ${d.name} ${signed(d.score)}` }),
      el("span", { className: "when", textContent: prettyDate(d.date) })));
}

function render(k) {
  const who = k.name ? `${k.name}'s Kennel` : "Kennel";
  document.title = `${who} · Dogdle`;
  document.getElementById("title").textContent = `🐾 ${who}`;
  document.getElementById("subtitle").textContent =
    `${k.days} ${k.days === 1 ? "dog" : "dogs"}` + (k.frogs ? `, ${k.frogs} ${k.frogs === 1 ? "frog" : "frogs"}` : "");

  const tiers = el("div", { className: "tiers" });
  for (const t of k.tierList) tiers.append(el("span", { textContent: t.emoji, title: t.label, className: t.found ? "" : "no" }));

  // The richest version of each highlight comes from the dogs list, which has colours.
  const full = (s) => s && k.dogs.find((d) => d.date === s.date);
  const rare = k.rarest[0];

  // Hovering (or focusing) a place names it underneath; a found one jumps to its first dog.
  const rarityName = (r) => r[0].toUpperCase() + r.slice(1);
  const placeInfo = el("div", { className: "place-info", ariaLive: "polite" });
  const idleInfo = "Point at a place to see what it is.";
  placeInfo.textContent = idleInfo;
  const places = el("div", { className: "places" });
  for (const p of k.places) {
    const color = k.rarityColors[p.rarity];
    const visits = p.found ? k.dogs.filter((d) => d.background.name === p.name).sort((a, b) => a.date.localeCompare(b.date)) : [];
    const info = () => {
      const tag = el("span", { textContent: rarityName(p.rarity), style: { color } });
      if (!p.found) return placeInfo.replaceChildren("❔ Not found yet · ", tag);
      const value = visits[0] ? ` ${signed(visits[0].background.value)}` : "";
      const who = visits.map((d) => d.name).join(", ");
      placeInfo.replaceChildren(`${p.emoji} ${p.name}${value} · `, tag, who ? ` · ${who}` : "");
    };
    const tile = p.found
      ? el("span", { textContent: p.emoji, ariaLabel: p.name, style: { borderColor: color } })
      : el("span", { className: "no", ariaLabel: `Not found yet (${p.rarity})`, style: { borderColor: `${color}55` } });
    tile.addEventListener("mouseenter", info);
    tile.addEventListener("focus", info);
    if (visits.length) pressable(tile, () => showDog(visits[0].date));
    else tile.addEventListener("click", info); // a tap on a phone, where there's no hover
    places.append(tile);
  }
  places.addEventListener("mouseleave", () => { placeInfo.textContent = idleInfo; });

  const dogsGrid = el("div", { className: "dogs" });
  const sorts = {
    newest: (a, b) => b.date.localeCompare(a.date),
    best: (a, b) => b.score - a.score || b.date.localeCompare(a.date),
    worst: (a, b) => a.score - b.score || b.date.localeCompare(a.date),
  };
  const buttons = Object.keys(sorts).map((key) =>
    el("button", { type: "button", textContent: key[0].toUpperCase() + key.slice(1), onclick: () => sortBy(key) }));
  const sortBy = (key) => {
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.textContent.toLowerCase() === key)));
    dogsGrid.replaceChildren(...[...k.dogs].sort(sorts[key]).map(dogCard));
  };
  sortBy("newest");

  content.replaceChildren(
    el("div", { className: "stats" },
      stat("🧬", "Breeds", k.breeds, "#38bdf8"),
      stat("🗺️", "Places", k.backgrounds, "#34d399"),
      stat("✨", "Traits", k.traits, "#fbbf24"),
      el("div", { className: "panel stat" },
        el("div", { className: "top" },
          el("span", { textContent: "🏆 Tiers" }),
          el("span", { className: "count", textContent: `${k.tiers.found} / ${k.tiers.total}` })),
        tiers)),
    el("section", {}, el("h2", { textContent: "The year so far" }), calendar(k.dogs, k.tierList)),
    el("section", {}, el("div", { className: "highlights" },
      highlight("Best dog", full(k.best)),
      k.worst && k.worst.date !== k.best?.date ? highlight("Worst dog", full(k.worst)) : null,
      rare ? el("div", { className: "panel highlight" },
        el("div", { className: "label", textContent: "Rarest find" }),
        el("div", { className: "what" },
          el("span", { textContent: `${rare.emoji} ${rare.name}` }),
          el("span", { textContent: rare.rarityLabel, style: { color: rare.rarityColor } })),
        el("div", { className: "sub", textContent: rare.kind === "breed" ? "A breed" : "A place" })) : null)),
    el("section", {}, el("h2", { textContent: `Places · ${k.backgrounds.found} of ${k.backgrounds.total}` }), el("div", { className: "panel" }, places, placeInfo)),
    el("section", {},
      el("div", { className: "toolbar" }, el("h2", { textContent: "Every dog" }), el("div", { className: "sort" }, ...buttons)),
      dogsGrid),
  );
  // On a phone the year doesn't fit: start at the recent end, where the dogs are.
  const scroller = content.querySelector(".calendar-scroll");
  if (scroller) scroller.scrollLeft = scroller.scrollWidth;
}

async function load() {
  if (!/^discord-\d{5,24}$/.test(player)) return notice("There's no kennel at this address.");
  try {
    const res = await fetch(`/api/kennel?player=${encodeURIComponent(player)}`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const k = await res.json();
    if (k.empty) return notice("No dogs here yet.");
    render(k);
  } catch {
    notice("Couldn't fetch this kennel. Try again in a moment.");
  }
}

load();
