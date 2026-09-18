import { rollDailyDog, todayUTC } from "./dogs.js";

const PLAYER_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/roll") {
      const player = url.searchParams.get("player") || "";
      if (!PLAYER_ID_RE.test(player)) {
        return Response.json({ error: "invalid player id" }, { status: 400 });
      }
      const dog = rollDailyDog(player, todayUTC());
      return Response.json(dog, {
        headers: { "cache-control": "no-store" },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
