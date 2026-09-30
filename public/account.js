// Accounts on the web page: a public username and an emoji PIN in front of the private
// player id this browser keeps (src/accounts.js has the why). Three ways in:
//   - a browser with dogs but no account is asked to claim them, once a day until it does;
//   - a browser with nothing asks who you are: sign in, or start fresh;
//   - an account without Discord gets a "Sync with Discord" button.
// Everything shown is set as text -- usernames come from players.

import { PIN_EMOJI, PIN_MIN, PIN_MAX } from "/pin-emoji.js";

const PLAYER_KEY = "dogdle-player-id";
const USER_KEY = "dogdle-username";
const NAME_KEY = "dogdle-name";
const RESULT_PREFIX = "dogdle-result-";
const LATER_KEY = "dogdle-claim-later";
const POLL_MS = 4000;

const today = () => new Date().toISOString().slice(0, 10);

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

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  drop: (k) => { try { localStorage.removeItem(k); } catch {} },
};

async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const username = () => store.get(USER_KEY);

// Forget this browser's dog of the day: it belongs to whoever was here before.
function adopt(player, account) {
  if (player && player !== store.get(PLAYER_KEY)) {
    for (const key of Object.keys(localStorage)) if (key.startsWith(RESULT_PREFIX)) store.drop(key);
    store.set(PLAYER_KEY, player);
  }
  store.set(USER_KEY, account.username);
  if (!store.get(NAME_KEY)) store.set(NAME_KEY, account.handle);
}

// ---------- the PIN pad ----------

function pinPad({ onChange }) {
  let keys = [];
  let shown = false;
  const slots = el("div", { className: "pin-slots", ariaLive: "polite" });
  const draw = () => {
    slots.replaceChildren(...Array.from({ length: Math.max(PIN_MIN, keys.length) }, (_, i) =>
      el("span", { className: i < keys.length ? "on" : "", textContent: i < keys.length ? (shown ? keys[i] : "●") : "" })));
    slots.ariaLabel = `${keys.length} of ${PIN_MIN} to ${PIN_MAX} entered`;
    onChange(keys);
  };
  const grid = el("div", { className: "pin-grid" }, ...PIN_EMOJI.map((e) =>
    el("button", { type: "button", textContent: e, ariaLabel: e, onclick: () => { if (keys.length < PIN_MAX) { keys.push(e); draw(); } } })));
  const tools = el("div", { className: "pin-tools" },
    el("button", { type: "button", className: "link", textContent: "👁 Show", onclick: (ev) => {
      shown = !shown; ev.target.textContent = shown ? "🙈 Hide" : "👁 Show"; draw();
    } }),
    el("button", { type: "button", className: "link", textContent: "⌫ Back", onclick: () => { keys.pop(); draw(); } }));
  draw();
  return {
    node: el("div", { className: "pin" }, slots, grid, tools),
    keys: () => [...keys],
    clear: () => { keys = []; draw(); },
  };
}

// ---------- the modal ----------

let dialog;
function modal() {
  if (!dialog) {
    dialog = el("dialog", { className: "account-modal" });
    // Esc would leave a new visitor with no player at all.
    dialog.addEventListener("cancel", (e) => { if (dialog.dataset.locked) e.preventDefault(); });
    document.body.append(dialog);
  }
  return dialog;
}

function screen(title, blurb, ...body) {
  const d = modal();
  d.replaceChildren(el("h2", { textContent: title }), blurb ? el("p", { className: "blurb", textContent: blurb }) : null, ...body);
  if (!d.open) d.showModal();
}

const status = () => el("p", { className: "account-status", ariaLive: "polite" });
const say = (node, text, bad = true) => { node.textContent = text; node.classList.toggle("bad", bad); };

function usernameField() {
  return el("input", { type: "text", className: "account-input", maxLength: 20, placeholder: "Username",
    autocomplete: "username", autocapitalize: "off", spellcheck: false, ariaLabel: "Username" });
}

// Pick a username and PIN, confirm the PIN, and claim `player` -- or a fresh id.
function createScreen(resolve, { player, claiming }) {
  const name = usernameField();
  const note = status();
  let check = 0;
  name.addEventListener("input", () => {
    const mine = ++check;
    const value = name.value.trim();
    if (!value) return say(note, "");
    setTimeout(async () => {
      if (mine !== check) return;
      try {
        const { data } = await api(`/api/account/check?username=${encodeURIComponent(value)}`);
        if (mine === check) say(note, data.available ? `✓ ${value} is free` : `✗ ${data.problem}`, !data.available);
      } catch {}
    }, 300);
  });

  const next = el("button", { type: "button", className: "account-go", textContent: "Next", disabled: true });
  const pad = pinPad({ onChange: (k) => { next.disabled = k.length < PIN_MIN; } });
  next.onclick = () => {
    if (!name.value.trim()) return say(note, "Pick a username first");
    const first = pad.keys();
    confirmScreen(resolve, { player, claiming, handle: name.value.trim(), first });
  };

  screen(claiming ? "🐾 Claim your dogs" : "🐶 New player",
    claiming
      ? "Pick a username and an emoji PIN. Your dogs so far come with you, and you can sign in on any device."
      : "Pick a username and an emoji PIN. It's how you sign in on another device.",
    name, el("p", { className: "label", textContent: `Your PIN: ${PIN_MIN} to ${PIN_MAX} emoji` }), pad.node, note, next,
    el("div", { className: "account-links" },
      el("button", { type: "button", className: "link", textContent: "I already have a username", onclick: () => signInScreen(resolve, { claiming }) }),
      claiming ? el("button", { type: "button", className: "link", textContent: "Not now", onclick: () => {
        store.set(LATER_KEY, today()); modal().close(); resolve(null);
      } }) : el("button", { type: "button", className: "link", textContent: "← Back", onclick: () => welcomeScreen(resolve) })));
  name.focus();
}

function confirmScreen(resolve, { player, claiming, handle, first }) {
  const note = status();
  const done = el("button", { type: "button", className: "account-go", textContent: claiming ? "Claim my dogs" : "Start playing", disabled: true });
  const pad = pinPad({ onChange: (k) => { done.disabled = k.length !== first.length; } });
  done.onclick = async () => {
    if (pad.keys().join("") !== first.join("")) { pad.clear(); return say(note, "That wasn't the same PIN. Try again."); }
    done.disabled = true;
    say(note, "Saving…", false);
    const id = player || crypto.randomUUID();
    try {
      const { ok, data } = await api("/api/account/claim", { player: id, username: handle, pin: first });
      if (!ok) { done.disabled = false; return say(note, data.error === "taken" ? `${handle} is taken. Go back and pick another.` : `Couldn't save: ${data.error}`); }
      adopt(id, data);
      modal().close();
      resolve(data);
    } catch {
      done.disabled = false;
      say(note, "Couldn't reach Dogdle. Try again.");
    }
  };
  screen("🔁 Once more", `Tap the same PIN again, ${handle}. Remember it: it's the only way back in on a new device.`,
    pad.node, note, done,
    el("div", { className: "account-links" },
      el("button", { type: "button", className: "link", textContent: "← Change it", onclick: () => createScreen(resolve, { player, claiming }) })));
}

function signInScreen(resolve, { claiming }) {
  const name = usernameField();
  const note = status();
  const go = el("button", { type: "button", className: "account-go", textContent: "Sign in", disabled: true });
  const pad = pinPad({ onChange: (k) => { go.disabled = k.length < PIN_MIN; } });
  go.onclick = async () => {
    go.disabled = true;
    say(note, "Checking…", false);
    try {
      const { ok, status: code, data } = await api("/api/account/login", { username: name.value.trim(), pin: pad.keys() });
      if (!ok) {
        pad.clear();
        return say(note, code === 429 ? "Too many tries. Wait fifteen minutes." : "Wrong username or PIN.");
      }
      adopt(data.player, data);
      modal().close();
      resolve(data);
    } catch {
      go.disabled = false;
      say(note, "Couldn't reach Dogdle. Try again.");
    }
  };
  screen("👋 Welcome back", claiming
    ? "Signing in swaps this browser over to your account. Dogs rolled here without one stay behind."
    : "Your username and emoji PIN.",
    name, pad.node, note, go,
    el("div", { className: "account-links" },
      el("button", { type: "button", className: "link", textContent: "← Back",
        onclick: () => (claiming ? createScreen(resolve, { player: store.get(PLAYER_KEY), claiming }) : welcomeScreen(resolve)) })));
  name.focus();
}

function welcomeScreen(resolve) {
  modal().dataset.locked = "1";
  screen("🐾 Welcome to Dogdle", "One dog a day, every day. Who's playing?",
    el("div", { className: "account-choices" },
      el("button", { type: "button", className: "account-go", textContent: "🐶 I'm new here", onclick: () => createScreen(resolve, { claiming: false }) }),
      el("button", { type: "button", className: "account-go alt", textContent: "👋 I've played before", onclick: () => signInScreen(resolve, { claiming: false }) })));
}

// ---------- Discord ----------

async function syncScreen(onLinked) {
  const d = modal();
  delete d.dataset.locked;
  const note = status();
  screen("🔗 Sync with Discord", "Getting a code…", note);
  let code;
  try {
    const { ok, data } = await api("/api/account/link-code", { player: store.get(PLAYER_KEY) });
    if (!ok) throw new Error(data.error);
    code = data.code;
  } catch {
    return say(note, "Couldn't get a code. Try again in a moment.");
  }
  const command = `/dogdle link ${code}`;
  const copy = el("button", { type: "button", className: "account-go alt", textContent: "Copy command", onclick: () =>
    navigator.clipboard.writeText(command).then(() => { copy.textContent = "Copied ✓"; }, () => {}) });
  screen("🔗 Sync with Discord",
    "In any server with the Dogdle bot, send this within ten minutes. Your website dogs join your Discord kennel, and from then on both deal the same dog each day.",
    el("p", { className: "link-code", textContent: command }), copy, note,
    el("div", { className: "account-links" }, el("button", { type: "button", className: "link", textContent: "Close", onclick: () => d.close() })));
  say(note, "Waiting for Discord…", false);

  const started = Date.now();
  const poll = setInterval(async () => {
    if (!d.open || Date.now() - started > 600_000) { clearInterval(poll); return; }
    try {
      const { data } = await api(`/api/account?player=${encodeURIComponent(store.get(PLAYER_KEY))}`);
      if (data.discord) {
        clearInterval(poll);
        screen("🎉 Linked!", "Your website and Discord dogs are one kennel now.",
          el("button", { type: "button", className: "account-go", textContent: "Nice", onclick: () => { d.close(); onLinked(); } }));
      }
    } catch {}
  }, POLL_MS);
}

// ---------- the bar under the title ----------

function renderBar(account, { claim }) {
  const bar = document.getElementById("account");
  if (!bar) return;
  bar.hidden = false;
  if (!account) {
    bar.replaceChildren(el("button", { type: "button", className: "link", textContent: "🐾 Claim your dogs: pick a username", onclick: claim }));
    return;
  }
  const signOut = () => {
    if (!confirm(`Sign out of ${account.handle}? Sign back in any time with your username and PIN.`)) return;
    for (const k of [PLAYER_KEY, USER_KEY, LATER_KEY]) store.drop(k);
    for (const key of Object.keys(localStorage)) if (key.startsWith(RESULT_PREFIX)) store.drop(key);
    location.reload();
  };
  bar.replaceChildren(
    el("span", { className: "who", textContent: `🐾 ${account.handle}` }),
    el("a", { href: account.kennel, textContent: "My kennel" }),
    account.discord ? el("span", { className: "linked", textContent: "🔗 Discord" })
      : el("button", { type: "button", className: "link", textContent: "🔗 Sync with Discord", onclick: () => syncScreen(() => location.reload()) }),
    el("button", { type: "button", className: "link", textContent: "Sign out", onclick: signOut }));
}

// Settles who is playing before the game asks the server for a dog. Resolves with the
// account, or null to carry on as an anonymous browser (offline, or "not now").
export async function accountGate() {
  const player = store.get(PLAYER_KEY);
  const ask = (claiming) => new Promise((resolve) => (claiming
    ? createScreen(resolve, { player, claiming: true })
    : welcomeScreen(resolve)));
  const claim = async () => {
    modal().dataset.locked = "1";
    const account = await new Promise((resolve) => createScreen(resolve, { player: store.get(PLAYER_KEY), claiming: true }));
    if (account) location.reload();
  };

  // Esc mustn't dismiss the question without an answer: the game is waiting on it.
  modal().dataset.locked = "1";
  let account = null;
  if (player) {
    try {
      const { ok, data } = await api(`/api/account?player=${encodeURIComponent(player)}`);
      if (!ok) throw new Error("account lookup failed");
      if (data.username) {
        store.set(USER_KEY, data.username);
        account = data;
      } else {
        store.drop(USER_KEY);
        if (store.get(LATER_KEY) !== today()) account = await ask(true);
      }
    } catch {
      // Offline or the server's down: play on as this browser, and ask another day.
      return null;
    }
  } else {
    account = await ask(false);
  }
  if (modal().open) modal().close();
  delete modal().dataset.locked;
  renderBar(account, { claim });
  return account;
}
