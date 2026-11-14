// Dates for the holiday seasons, and how strongly a given day belongs to one.
//
// A season has a first day, a length, and a run-up and a run-down around it. Its strength
// on a day climbs from almost nothing at the start of the run-up to 1 for the holiday
// itself, then falls away again: the closer the day, the more of the holiday a dog gets.
// Dates are the game's own day keys (YYYY-MM-DD, Eastern), compared as whole UTC days.

const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export const dayNumber = (dateStr) =>
  Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(5, 7) - 1, +dateStr.slice(8, 10)) / 86400000;

// The same date every year.
export const fixed = (month, day) => (year) => iso(year, month, day);

// The nth weekday of a month: nthWeekday(2026, 11, 4, 4) is the fourth Thursday of
// November. Weekdays count from Sunday = 0, as Date does.
export function nthWeekday(year, month, weekday, n) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return iso(year, month, 1 + ((weekday - first + 7) % 7) + 7 * (n - 1));
}

// From a table, for holidays on another calendar. A year past the table has no season.
export const table = (dates) => (year) => dates[year];

// The holiday itself: the first `peak` days of the season (none if it has no `peak`),
// when it takes over the dog instead of sprinkling it.
export function peakOn(season, dateStr) {
  const day = dayNumber(dateStr);
  const year = +dateStr.slice(0, 4);
  return [year - 1, year, year + 1].some((y) => {
    const start = season.date(y);
    return start && day >= dayNumber(start) && day < dayNumber(start) + (season.peak ?? 0);
  });
}

// 0 outside the window, else up to 1. Checks the neighbouring years too, so a window
// that crosses New Year is found from either side of it.
export function strengthOn(season, dateStr) {
  const day = dayNumber(dateStr);
  const year = +dateStr.slice(0, 4);
  let best = 0;
  for (const y of [year - 1, year, year + 1]) {
    const start = season.date(y);
    if (!start) continue;
    const first = dayNumber(start);
    const last = first + (season.days ?? 1) - 1;
    let s = 0;
    if (day >= first && day <= last) s = 1;
    else if (day < first && first - day <= season.before) s = (season.before + 1 - (first - day)) / (season.before + 1);
    else if (day > last && day - last <= season.after) s = (season.after + 1 - (day - last)) / (season.after + 1);
    best = Math.max(best, s);
  }
  return best;
}
