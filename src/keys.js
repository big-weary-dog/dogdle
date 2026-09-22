// KV key layout, in one place because the web routes and the Discord bot write the same
// records. Everything lives in one namespace, separated by prefix:
//
//   roll:<player>:<date>    the dog that was dealt (the value; also a player's history)
//   day:<date>:<player>     the global leaderboard index for a date
//   guild:<guild>:<date>:<player>   the same, scoped to one Discord server
//   card:<player>:<date>    the rendered share image
//
// The three index keys store an empty value and put the row in the metadata, so a
// leaderboard is one list call and never fetches a value.

export const PLAYER_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const cardKey = (player, date) => `card:${player}:${date}`;
export const rollKey = (player, date) => `roll:${player}:${date}`;
export const dayKey = (date, player) => `day:${date}:${player}`;
export const guildKey = (guild, date, player) => `guild:${guild}:${date}:${player}`;

export const cleanName = (raw) =>
  String(raw || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 20);

// The row a leaderboard lists. Kept here so the web and the bot can't drift apart on it.
export const boardRow = (name, dog) => ({
  player: name,
  dog: dog.name,
  breed: dog.breed,
  score: dog.score,
  quality: dog.qualityLabel,
  emoji: dog.background.emoji,
});
