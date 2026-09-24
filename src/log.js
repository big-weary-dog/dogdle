// Structured logging. Every line is one JSON object, which Workers Logs indexes field by
// field, so "every photo that failed to decode this week" is a filter rather than a grep.
// Workers Logs already ties each line to its invocation (URL, ray id, outcome), so nothing
// here has to thread a request id around.
//
// Failures that are handled -- a photo that didn't load, a card drawn without its dog --
// are exactly the ones nobody hears about, so they log at warn rather than vanishing.

const SINKS = {
  info: (entry) => console.log(entry),
  warn: (entry) => console.warn(entry),
  error: (entry) => console.error(entry),
};

let sink = (level, entry) => SINKS[level](entry);

// An Error doesn't survive JSON: its message and stack are non-enumerable.
function flatten(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v;
  }
  return out;
}

function write(level, event, fields = {}) {
  try {
    sink(level, { level, event, ...flatten(fields) });
  } catch {
    // Logging must never be the thing that breaks a request.
  }
}

export const log = {
  info: (event, fields) => write("info", event, fields),
  warn: (event, fields) => write("warn", event, fields),
  error: (event, fields) => write("error", event, fields),
};

// Tests swap the sink to assert on what was logged, and to keep the output quiet.
export function setLogSink(fn) {
  const previous = sink;
  sink = fn;
  return previous;
}
