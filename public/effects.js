// Canvas effect engine. Every background and modifier declares { type, params }; each type
// below is a distinct renderer, parameterized enough that two modifiers sharing a type
// (say two different `fall` effects) still read as clearly different on screen.

const TAU = Math.PI * 2;

// Where the ground meets the sky, as a fraction of stage height.
const HORIZON = 0.68;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function shade(hex, amount) {
  const [r, g, b] = hexToRgb(hex).map((c) =>
    Math.round(Math.min(255, Math.max(0, c + c * amount)))
  );
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------------
// Shape drawing helpers, shared by the particle effects
// ---------------------------------------------------------------------------

function drawShape(ctx, shape, x, y, size, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();

  switch (shape) {
    case "square":
      ctx.rect(-size / 2, -size / 2, size, size);
      break;
    case "line":
      ctx.rect(-size / 10, -size / 2, Math.max(1, size / 5), size);
      break;
    case "leaf":
      ctx.ellipse(0, 0, size, size / 2.2, 0, 0, TAU);
      break;
    case "petal":
      ctx.ellipse(0, 0, size, size / 1.6, 0, 0, TAU);
      break;
    case "heart": {
      const s = size / 10;
      ctx.moveTo(0, 3 * s);
      ctx.bezierCurveTo(0, 0, -5 * s, 0, -5 * s, -3 * s);
      ctx.bezierCurveTo(-5 * s, -7 * s, 0, -7 * s, 0, -3 * s);
      ctx.bezierCurveTo(0, -7 * s, 5 * s, -7 * s, 5 * s, -3 * s);
      ctx.bezierCurveTo(5 * s, 0, 0, 0, 0, 3 * s);
      break;
    }
    default:
      ctx.arc(0, 0, size / 2, 0, TAU);
  }

  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Effect renderers. Each returns { draw(ctx, w, h, dt, t) }.
// ---------------------------------------------------------------------------

const EFFECTS = {
  // Particles drifting downward: snow, leaves, petals, crumbs, rain.
  fall(p) {
    const count = p.count ?? 30;
    const parts = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(),
      s: rand(0.7, 1.3), rot: rand(0, TAU), spin: rand(-0.02, 0.02),
      phase: rand(0, TAU),
    }));

    return {
      draw(ctx, w, h, dt, t) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity ?? 0.85;
        for (const part of parts) {
          part.y += ((p.speed ?? 0.5) * dt) / 900;
          // Wrap by the overshoot rather than resetting to a fixed line. A reset put every
          // particle that crossed the bottom in the same step onto the same row, and at
          // the GIF's 120ms step that was most of them: snow fell in visible bands.
          if (part.y > 1.1) { part.y -= 1.2; part.x = Math.random(); }
          part.rot += part.spin * dt * 0.06;

          const sway = Math.sin(t / 900 + part.phase) * (p.sway ?? 0) * 0.02;
          const angle = p.angle ?? 0;
          const x = (part.x + sway + part.y * angle) * w;
          // Rain streaks point along their fall, all of them. A random rotation is right
          // for a leaf and made rain read as scattered ticks.
          const rot = p.shape === "line" ? -Math.atan(angle) : part.rot;
          drawShape(ctx, p.shape ?? "dot", x % w, part.y * h, (p.size ?? 4) * part.s, rot);
        }
        ctx.globalAlpha = 1;
      },
    };
  },

  // Particles floating upward: embers, bubbles, hearts, spice.
  rise(p) {
    const count = p.count ?? 24;
    const parts = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(),
      s: rand(0.6, 1.4), phase: rand(0, TAU), rot: rand(0, TAU),
    }));

    return {
      draw(ctx, w, h, dt, t) {
        if (p.glow) { ctx.shadowBlur = 12; ctx.shadowColor = p.color; }
        ctx[p.hollow ? "strokeStyle" : "fillStyle"] = p.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = p.opacity ?? 0.8;

        for (const part of parts) {
          part.y -= ((p.speed ?? 0.5) * dt) / 900;
          if (part.y < -0.1) { part.y += 1.2; part.x = Math.random(); }

          const sway = Math.sin(t / 700 + part.phase) * (p.sway ?? 0) * 0.02;
          const x = ((part.x + sway) * w + w) % w;
          const size = (p.size ?? 4) * part.s;

          if (p.hollow) {
            ctx.beginPath();
            ctx.arc(x, part.y * h, size, 0, TAU);
            ctx.stroke();
          } else {
            drawShape(ctx, p.shape ?? "dot", x, part.y * h, size, p.shape === "heart" ? 0 : part.rot);
          }
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      },
    };
  },

  // One-shot radial burst from the centre, re-firing on a slow loop.
  burst(p) {
    const count = p.count ?? 30;
    let parts = [];
    let nextFire = 0;

    const spawn = (w, h) => {
      parts = Array.from({ length: count }, () => {
        const a = rand(0, TAU);
        const v = rand(0.3, 1) * (p.spread ?? 140);
        return {
          x: w / 2, y: h / 2,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          life: 1, rot: rand(0, TAU), spin: rand(-0.1, 0.1),
          hue: p.confetti ? rand(0, 360) : null,
        };
      });
    };

    return {
      draw(ctx, w, h, dt, t) {
        if (t > nextFire) { spawn(w, h); nextFire = t + 2800; }

        for (const part of parts) {
          part.x += (part.vx * dt) / 1000;
          part.y += (part.vy * dt) / 1000 + (p.debris ? (dt * dt) / 90000 : 0);
          part.life -= dt / 1600;
          part.rot += part.spin;
          if (part.life <= 0) continue;

          ctx.globalAlpha = Math.max(0, part.life);
          ctx.fillStyle = part.hue !== null ? `hsl(${part.hue},85%,62%)` : p.color;
          drawShape(ctx, p.confetti || p.debris ? "square" : "dot", part.x, part.y, p.size ?? 5, part.rot);
        }
        ctx.globalAlpha = 1;
      },
    };
  },

  // Soft radial aura breathing in and out behind the dog.
  pulse(p) {
    return {
      draw(ctx, w, h, dt, t) {
        const phase = (Math.sin((t / (p.period ?? 2000)) * TAU) + 1) / 2;
        const radius = (p.radius ?? 160) * (0.75 + phase * 0.35);
        const alpha = (p.strong ? 0.5 : 0.32) * (0.5 + phase * 0.5);

        const grad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.15, w / 2, h / 2, radius);
        grad.addColorStop(0, rgba(p.color, alpha));
        grad.addColorStop(1, rgba(p.color, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      },
    };
  },

  // Storm flashes with forked bolts.
  lightning(p) {
    let flash = 0;
    let bolt = null;

    const makeBolt = (w, h) => {
      const pts = [{ x: rand(w * 0.2, w * 0.8), y: 0 }];
      while (pts[pts.length - 1].y < h * 0.7) {
        const last = pts[pts.length - 1];
        pts.push({ x: last.x + rand(-28, 28), y: last.y + rand(18, 42) });
      }
      return pts;
    };

    return {
      draw(ctx, w, h, dt, t) {
        if (flash <= 0 && Math.random() < (p.frequency ?? 0.01)) {
          flash = 1;
          bolt = makeBolt(w, h);
        }
        if (flash <= 0) return;

        flash -= dt / 420;
        ctx.fillStyle = rgba(p.color, Math.max(0, flash) * 0.35);
        ctx.fillRect(0, 0, w, h);

        if (bolt) {
          ctx.strokeStyle = rgba(p.color, Math.max(0, flash));
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 16;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.moveTo(bolt[0].x, bolt[0].y);
          for (const pt of bolt.slice(1)) ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      },
    };
  },

  // Rotating light beams radiating from behind the subject.
  rays(p) {
    const beams = p.beams ?? 8;
    return {
      draw(ctx, w, h, dt, t) {
        const cx = w / 2;
        const cy = p.holy ? h * 0.15 : h / 2;
        const spin = (t / 1000) * (p.speed ?? 0.1);
        const len = Math.hypot(w, h);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(spin);
        for (let i = 0; i < beams; i++) {
          const a = (i / beams) * TAU;
          const width = (TAU / beams) * 0.38;
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
          grad.addColorStop(0, rgba(p.color, p.opacity ?? 0.25));
          grad.addColorStop(1, rgba(p.color, 0));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, len, a - width, a + width);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      },
    };
  },

  // Twinkling starfield, optionally over a nebula wash.
  stars(p) {
    const count = p.count ?? 100;
    const stars = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(),
      s: rand(0.5, 1.8), phase: rand(0, TAU), rate: rand(0.5, 2),
    }));
    const blobs = p.nebula
      ? Array.from({ length: 3 }, () => ({ x: Math.random(), y: Math.random(), r: rand(0.25, 0.5) }))
      : [];

    return {
      draw(ctx, w, h, dt, t) {
        for (const b of blobs) {
          const grad = ctx.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, b.r * w);
          grad.addColorStop(0, rgba(p.nebula, 0.28));
          grad.addColorStop(1, rgba(p.nebula, 0));
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
        }

        ctx.fillStyle = p.color;
        for (const s of stars) {
          const tw = (Math.sin(t / 600 * s.rate + s.phase) + 1) / 2;
          ctx.globalAlpha = 0.25 + tw * (p.twinkle ?? 0.7);
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.s, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
  },

  // Drifting mist. Soft radial puffs rather than hard-edged bands: rectangles with a
  // gradient across them read as painted stripes, not fog.
  fog(p) {
    const count = (p.bands ?? 3) * 3;
    const puffs = Array.from({ length: count }, (_, i) => ({
      x: Math.random(),
      y: 0.25 + Math.random() * 0.6,
      r: 0.18 + Math.random() * 0.22,
      dir: i % 2 ? 1 : -1,
      speed: 0.4 + Math.random() * 0.8,
    }));

    return {
      draw(ctx, w, h, dt) {
        for (const puff of puffs) {
          puff.x += (puff.dir * (p.speed ?? 0.3) * puff.speed * dt) / 12000;
          if (puff.x > 1.3) puff.x = -0.3;
          if (puff.x < -0.3) puff.x = 1.3;

          // Three soft circles in a row rather than one circular gradient filled into a
          // half-height ellipse. The ellipse cut the gradient off top and bottom while it
          // was still half opaque, so every puff had hard edges and fog read as a stack
          // of lozenges. Circles fade to nothing on every side, in both renderers.
          const cy = puff.y * h;
          const rr = puff.r * w * 0.5;
          const op = (p.opacity ?? 0.25) * 0.7;
          for (const k of [-1, 0, 1]) {
            const cx = puff.x * w + k * rr * 0.9;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
            grad.addColorStop(0, rgba(p.color, op));
            grad.addColorStop(0.55, rgba(p.color, op * 0.45));
            grad.addColorStop(1, rgba(p.color, 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, rr, 0, TAU);
            ctx.fill();
          }
        }
      },
    };
  },

  // Expanding concentric rings, like sound or water.
  ripple(p) {
    const rings = Array.from({ length: p.rings ?? 3 }, (_, i) => ({ r: i / (p.rings ?? 3) }));

    return {
      draw(ctx, w, h, dt, t) {
        ctx.strokeStyle = p.color;
        for (const ring of rings) {
          ring.r += ((p.speed ?? 0.6) * dt) / 2400;
          if (ring.r > 1) ring.r = 0;

          const radius = ring.r * (p.maxRadius ?? 160);
          ctx.globalAlpha = Math.max(0, 0.55 * (1 - ring.r));
          ctx.lineWidth = p.warp ? 3 : 2;
          ctx.beginPath();
          if (p.warp) {
            for (let a = 0; a <= TAU + 0.1; a += 0.1) {
              const wob = radius * (1 + Math.sin(a * 5 + t / 400) * 0.08);
              const x = w / 2 + Math.cos(a) * wob;
              const y = h / 2 + Math.sin(a) * wob;
              a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
          } else {
            ctx.arc(w / 2, h / 2, radius, 0, TAU);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    };
  },

  // RGB-split tearing and scanlines, for cursed dogs.
  glitch(p) {
    let nextTear = 0;
    let tears = [];

    return {
      draw(ctx, w, h, dt, t) {
        const intensity = p.intensity ?? 0.5;

        if (p.scanlines) {
          ctx.fillStyle = rgba(p.color, 0.06 * intensity);
          for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1.5);
        }

        if (t > nextTear) {
          nextTear = t + rand(180, 900) / intensity;
          // Partial-width slices rather than full-width bars: a band spanning the whole
          // frame reads as a painted stripe, not a tear.
          tears = Array.from({ length: Math.ceil(intensity * 4) }, () => ({
            y: Math.random() * h,
            h: rand(3, 14),
            x: rand(-0.1, 0.7),
            w: rand(0.25, 0.7),
            dx: rand(-22, 22) * intensity,
          }));
        }

        for (const tear of tears) {
          ctx.fillStyle = rgba(p.color, 0.32 * intensity);
          ctx.fillRect(tear.x * w + tear.dx, tear.y, tear.w * w, tear.h);
        }

        if (p.tear) {
          ctx.fillStyle = rgba(p.color, 0.08 * intensity);
          ctx.fillRect(0, 0, w, h);
        }
      },
    };
  },

  // A wandering spotlight cone.
  spotlight(p) {
    return {
      draw(ctx, w, h, dt, t) {
        const x = w / 2 + Math.sin((t / 1000) * (p.speed ?? 0.5)) * w * 0.3;
        const y = h / 2 + Math.cos((t / 1400) * (p.speed ?? 0.5)) * h * 0.2;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, p.radius ?? 120);
        grad.addColorStop(0, rgba(p.color, 0.35));
        grad.addColorStop(1, rgba(p.color, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      },
    };
  },

  // Flowing aurora curtains.
  aurora(p) {
    const colors = p.colors ?? ["#34d399", "#22d3ee"];
    return {
      draw(ctx, w, h, dt, t) {
        for (let i = 0; i < (p.bands ?? 3); i++) {
          const color = colors[i % colors.length];
          const phase = (t / 1000) * (p.speed ?? 0.2) + i * 1.3;
          ctx.beginPath();
          ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 8) {
            const y = h * 0.28
              + Math.sin(x / 90 + phase) * 26
              + Math.sin(x / 40 + phase * 1.7) * 10
              + i * 22;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, rgba(color, 0.55));
          grad.addColorStop(1, rgba(color, 0));
          ctx.strokeStyle = grad;
          ctx.lineWidth = 26;
          ctx.globalAlpha = 0.5;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    };
  },

  // Coloured vignette wash.
  vignette(p) {
    return {
      draw(ctx, w, h) {
        const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
        grad.addColorStop(0, rgba(p.color, 0));
        grad.addColorStop(1, rgba(p.color, p.opacity ?? 0.5));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      },
    };
  },
};

// `shake` moves the whole card rather than drawing pixels, so app.js handles it.

// Simple silhouettes drawn behind the dog. Coordinates are relative to the stage, so a
// scene can describe itself as a handful of shapes without knowing the canvas size.
function drawProps(ctx, w, h, props) {
  for (const prop of props) {
    ctx.fillStyle = prop.color;
    ctx.globalAlpha = prop.alpha ?? 1;
    const xs = prop.repeat
      ? Array.from({ length: prop.repeat }, (_, i) =>
          prop.x + (i * (prop.gap ?? 0.2)))
      : [prop.x];

    for (const x of xs) {
      const px = x * w;
      const py = prop.y * h;
      const pw = (prop.w ?? 0.1) * w;
      const ph = (prop.h ?? 0.1) * h;

      ctx.beginPath();
      switch (prop.shape) {
        case "ellipse":
          ctx.ellipse(px, py, pw / 2, ph / 2, 0, 0, TAU);
          break;
        case "tri":
          ctx.moveTo(px - pw / 2, py + ph);
          ctx.lineTo(px, py);
          ctx.lineTo(px + pw / 2, py + ph);
          ctx.closePath();
          break;
        // Any outline, in the same relative coordinates as everything else. Rects,
        // ellipses and triangles can't lean, which is why the listing ship never listed.
        case "poly": {
          const pts = prop.points ?? [];
          pts.forEach(([ax, ay], i) => {
            const X = (ax - prop.x) * w + px, Y = ay * h;
            if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
          });
          ctx.closePath();
          break;
        }
        case "hills": {
          ctx.moveTo(0, h);
          for (let i = 0; i <= w; i += 6) {
            const t = i / w;
            const y = py - Math.sin(t * Math.PI * (prop.waves ?? 2)) * ph;
            ctx.lineTo(i, y);
          }
          ctx.lineTo(w, h);
          ctx.closePath();
          break;
        }
        default:
          ctx.rect(px - pw / 2, py, pw, ph);
      }
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// Exposed so tests can assert every effect the content references actually exists -- an
// unknown type is silently skipped at runtime, which just looks like "no visual".
export const EFFECT_TYPES = new Set(Object.keys(EFFECTS));

export const DOM_EFFECTS = new Set(["shake"]);

// Effects come in three classes, which is what gives a scene any depth:
//   back    -- the world behind the dog (sky, weather, distant light)
//   front   -- stuff dumped on top, passing between you and the dog
//   subject -- CSS applied to the dog photo itself, so effects visibly touch it
//
// Subject effects are plain CSS rather than canvas work: cheap, and they alter the actual
// photo instead of decorating around it.
export const SUBJECT_STYLES = {
  tint: (p) => ({ filter: `sepia(${p.sepia ?? 0.5}) hue-rotate(${p.hue ?? 0}deg) saturate(${p.saturate ?? 1.2})` }),
  drain: (p) => ({ filter: `grayscale(${p.amount ?? 0.85}) contrast(1.1)` }),
  blur: (p) => ({ filter: `blur(${p.amount ?? 1.5}px)` }),
  halo: (p) => ({ filter: `drop-shadow(0 0 ${p.size ?? 14}px ${p.color ?? "#fcd34d"}) brightness(${p.brightness ?? 1.1})` }),
  invert: (p) => ({ filter: `invert(${p.amount ?? 0.85}) hue-rotate(180deg)` }),
  chromatic: (p) => ({
    filter: `drop-shadow(${p.offset ?? 3}px 0 0 rgba(239,68,68,.8)) drop-shadow(-${p.offset ?? 3}px 0 0 rgba(34,211,238,.8))`,
  }),
  ghost: (p) => ({ opacity: String(p.opacity ?? 0.55), filter: `blur(${p.blur ?? 0.6}px)` }),
  wobble: (p) => ({ animation: `subject-wobble ${p.period ?? 700}ms ease-in-out infinite` }),
  spin: (p) => ({ animation: `subject-spin ${p.period ?? 4000}ms linear infinite` }),
  squish: (p) => ({ animation: `subject-squish ${p.period ?? 1400}ms ease-in-out infinite` }),
  bounce: (p) => ({ animation: `subject-bounce ${p.period ?? 900}ms ease-in-out infinite` }),
};

// Merges every subject effect on a dog into one set of inline styles. Multiple filters
// concatenate, which is how a blessed-and-haunted dog gets both.
export function subjectStyle(effects) {
  const out = { filter: "", animation: "", opacity: "" };
  for (const e of effects) {
    if (!e || e.layer !== "subject" || !SUBJECT_STYLES[e.type]) continue;
    const style = SUBJECT_STYLES[e.type](e.params ?? {});
    if (style.filter) out.filter += (out.filter ? " " : "") + style.filter;
    if (style.animation) out.animation = style.animation;
    if (style.opacity) out.opacity = style.opacity;
  }
  return out;
}

// Builds the effect instances for one layer. Shared with the headless card renderer.
export function createLayers(effects, layer) {
  return effects
    .filter((e) => e && EFFECTS[e.type] && !DOM_EFFECTS.has(e.type) && (e.layer ?? "back") === layer)
    .map((e) => EFFECTS[e.type](e.params ?? {}));
}

// Paints the world behind the dog: sky, scenery, ground, horizon haze, contact shadow.
export function paintWorld(ctx, w, h, { sky, ground, props = [] }) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, sky[0]);
  grad.addColorStop(1, sky[1] ?? sky[0]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Scenery sits behind the ground when it's sky-side, so draw it first.
  drawProps(ctx, w, h, props.filter((p) => p.layer === "sky"));

  if (ground) {
    const horizon = h * HORIZON;
    const gGrad = ctx.createLinearGradient(0, horizon, 0, h);
    gGrad.addColorStop(0, ground);
    gGrad.addColorStop(1, shade(ground, -0.35));
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, horizon, w, h - horizon);

    // A soft haze along the horizon stops it reading as a hard colour seam.
    const haze = ctx.createLinearGradient(0, horizon - h * 0.09, 0, horizon + h * 0.05);
    haze.addColorStop(0, rgba(sky[1] ?? sky[0], 0));
    haze.addColorStop(0.6, rgba(sky[1] ?? sky[0], 0.5));
    haze.addColorStop(1, rgba(sky[1] ?? sky[0], 0));
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon - h * 0.09, w, h * 0.14);

    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.beginPath();
    ctx.ellipse(w / 2, horizon + 6, w * 0.22, h * 0.035, 0, 0, TAU);
    ctx.fill();
  }

  drawProps(ctx, w, h, props.filter((p) => p.layer !== "sky"));
}

export class Scene {
  constructor(canvas, layer = "back") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.layer = layer;
    this.layers = [];
    this.sky = ["#1e293b", "#334155"];
    this.ground = null;
    this.running = false;
    this.last = 0;
  }

  setScene({ sky, ground, effects, props }) {
    this.sky = sky ?? this.sky;
    this.ground = ground ?? null;
    this.props = props ?? [];
    this.layers = createLayers(effects, this.layer);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = rect.width;
    this.h = rect.height;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    this.last = performance.now();

    const frame = (now) => {
      if (!this.running) return;
      // rAF timestamps mark the frame's start, which can predate the performance.now()
      // captured in start() -- without the floor, the first frame steps everything backwards.
      const dt = Math.max(0, Math.min(now - this.last, 64));
      this.last = now;
      this.render(dt, now);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  stop() {
    this.running = false;
  }

  render(dt, t) {
    const { ctx, w, h } = this;
    if (!w || !h) return;

    ctx.clearRect(0, 0, w, h);

    // Only the back layer paints the world; the front layer stays transparent so the dog
    // shows through everywhere its effects aren't.
    if (this.layer === "back") {
      paintWorld(ctx, w, h, { sky: this.sky, ground: this.ground, props: this.props });
    }

    for (const layer of this.layers) layer.draw(ctx, w, h, dt, t);
  }
}
