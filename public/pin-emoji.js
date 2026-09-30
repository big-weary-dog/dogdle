// The keypad for an account PIN. Shared by the page (to draw it) and the Worker (to check a
// PIN only uses these). Sixteen keys and at least four taps: 65,536 PINs, behind a lockout.
// Never reorder or replace a key -- stored PINs are hashes of these exact characters.
export const PIN_EMOJI = ["🐶", "🐱", "🐸", "🦆", "🦴", "🎾", "🌭", "🍕", "🧀", "🌮", "🚗", "🚀", "🌙", "⭐", "🔥", "🌈"];
export const PIN_MIN = 4;
export const PIN_MAX = 6;
