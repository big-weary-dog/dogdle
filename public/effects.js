// Canvas effect engine. Every background and modifier declares { type, params }; each type
// below is a distinct renderer, parameterized enough that two modifiers sharing a type
// (say two different `fall` effects) still read as clearly different on screen.

const TAU = Math.PI * 2;

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
          if (part.y > 1.1) { part.y = -0.1; part.x = Math.random(); }
          part.rot += part.spin * dt * 0.06;

          const sway = Math.sin(t / 900 + part.phase) * (p.sway ?? 0) * 0.02;
          const angle = p.angle ?? 0;
          const x = (part.x + sway + part.y * angle) * w;
          drawShape(ctx, p.shape ?? "dot", x % w, part.y * h, (p.size ?? 4) * part.s, part.rot);
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
          if (part.y < -0.1) { part.y = 1.1; part.x = Math.random(); }

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

  // Drifting horizontal mist bands.
  fog(p) {
    const bands = Array.from({ length: p.bands ?? 3 }, (_, i) => ({
      y: (i + 0.5) / (p.bands ?? 3),
      off: rand(0, 1), dir: i % 2 ? 1 : -1, h: rand(0.12, 0.28),
    }));

    return {
      draw(ctx, w, h, dt, t) {
        for (const b of bands) {
          b.off += (b.dir * (p.speed ?? 0.3) * dt) / 9000;
          const x = ((b.off % 1) + 1) % 1;
          const grad = ctx.createLinearGradient(0, 0, w, 0);
          grad.addColorStop(0, rgba(p.color, 0));
          grad.addColorStop(Math.min(0.99, x), rgba(p.color, p.opacity ?? 0.25));
          grad.addColorStop(1, rgba(p.color, 0));
          ctx.fillStyle = grad;
          ctx.fillRect(0, (b.y - b.h / 2) * h, w, b.h * h);
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
          tears = Array.from({ length: Math.ceil(intensity * 4) }, () => ({
            y: Math.random() * h, h: rand(4, 26), dx: rand(-22, 22) * intensity,
          }));
        }

        for (const tear of tears) {
          ctx.fillStyle = rgba(p.color, 0.5 * intensity);
          ctx.fillRect(tear.dx, tear.y, w, tear.h);
        }

        if (p.tear) {
          ctx.fillStyle = rgba(p.color, 0.08 * intensity);
          ctx.fillRect(0, 0, w, h);
        }
      },
    };
  },

  // Emoji sprites orbiting the dog.
  orbit(p) {
    const count = p.count ?? 3;
    return {
      draw(ctx, w, h, dt, t) {
        ctx.font = `${p.size ?? 15}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = 0; i < count; i++) {
          const a = (t / 1000) * (p.speed ?? 0.8) + (i / count) * TAU;
          const wobble = Math.sin(t / 500 + i) * 8;
          const x = w / 2 + Math.cos(a) * ((p.radius ?? 80) + wobble);
          const y = h / 2 + Math.sin(a) * ((p.radius ?? 80) * 0.45 + wobble);
          ctx.fillText(p.emoji ?? "🐾", x, y);
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
export const DOM_EFFECTS = new Set(["shake"]);

export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.layers = [];
    this.sky = ["#1e293b", "#334155"];
    this.ground = null;
    this.running = false;
    this.last = 0;
  }

  setScene({ sky, ground, effects }) {
    this.sky = sky ?? this.sky;
    this.ground = ground ?? null;
    this.layers = effects
      .filter((e) => e && EFFECTS[e.type] && !DOM_EFFECTS.has(e.type))
      .map((e) => EFFECTS[e.type](e.params ?? {}));
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
      const dt = Math.min(now - this.last, 64);
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

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, this.sky[0]);
    grad.addColorStop(1, this.sky[1] ?? this.sky[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (this.ground) {
      ctx.fillStyle = this.ground;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 1.02, w * 0.75, h * 0.22, 0, 0, TAU);
      ctx.fill();
    }

    for (const layer of this.layers) layer.draw(ctx, w, h, dt, t);
  }
}
