// The keypad for an account PIN. Shared by the page (to draw it) and the Worker (to check a
// PIN only uses these). Nine keys, a 3x3 pad, and at least three taps: 729 PINs at the
// shortest, behind a lockout. It's a dog game, not a bank.
// Never replace a key -- stored PINs are hashes of these exact characters. (The first pad
// had sixteen; these nine are a subset of it, so PINs made from them still work.)
export const PIN_EMOJI = ["🐶", "🐱", "🐸", "🦴", "🎾", "🍕", "🚀", "🌙", "🌈"];
export const PIN_MIN = 3;
export const PIN_MAX = 6;
