(() => {
  // client/src/bot/math.js
  var TAU = Math.PI * 2;
  var clamp = (v, lo = 0, hi = 1) => v < lo ? lo : v > hi ? hi : v;
  var lerp = (a, b, t) => a + (b - a) * t;
  var easings = {
    easeOutCubic: (t) => 1 - (1 - t) ** 3,
    easeInOutCubic: (t) => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
    easeOutQuint: (t) => 1 - (1 - t) ** 5
  };
  function loopNoise(t, period, seed = 0) {
    const p = t / period * TAU;
    return 0.55 * Math.sin(p + seed) + 0.3 * Math.sin(2 * p + seed * 1.7 + 1.1) + 0.15 * Math.sin(3 * p + seed * 2.3 + 2.4);
  }
  function createRng(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var r2 = (v) => Math.round(v * 100) / 100;

  // client/src/bot/decor.js
  function monoShade(hue, s = 0, l = 0.08) {
    const h = (hue % 360 + 360) % 360;
    const v = Math.round((0.02 + 0.12 * (0.5 + 0.5 * Math.sin(h / 360 * TAU))) * 255);
    const hex = v.toString(16).padStart(2, "0");
    return `#${hex}${hex}${hex}`;
  }
  function arcRender(seed, t, scale, id, opacity = 1) {
    const spin2 = seed.phase + t * seed.speed * TAU;
    const cu = Math.cos(seed.tilt);
    const su = Math.sin(seed.tilt);
    const kz = Math.sqrt(Math.max(0, 1 - seed.k * seed.k));
    const N = 64;
    const span = seed.sweep * TAU;
    let front = "";
    let back = "";
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const th = spin2 + i / N * span;
      const ct = Math.cos(th);
      const st = Math.sin(th);
      const x = seed.a * (ct * cu + st * -su * seed.k) + seed.cx;
      const y = seed.a * (ct * su + st * cu * seed.k) + seed.cy;
      const z = seed.a * st * kz;
      const behind = z < 0;
      const sx = r2(x * scale);
      const sy = r2(y * scale);
      const cmd = behind !== prev ? "M" : "L";
      if (behind) back += `${cmd}${sx} ${sy}`;
      else front += `${cmd}${sx} ${sy}`;
      prev = behind;
    }
    const gx = Math.cos(seed.tilt) * seed.a * scale;
    const gy = Math.sin(seed.tilt) * seed.a * scale;
    return {
      id,
      front,
      back,
      width: seed.width * scale,
      opacity,
      grad: {
        x1: r2(seed.cx * scale - gx),
        y1: r2(seed.cy * scale - gy),
        x2: r2(seed.cx * scale + gx),
        y2: r2(seed.cy * scale + gy),
        stops: [
          monoShade(seed.hue),
          monoShade(seed.hue + seed.hueSpan * 0.5),
          monoShade(seed.hue + seed.hueSpan)
        ]
      }
    };
  }
  var RING_RNG = createRng(659918);
  var RINGS = Array.from({ length: 6 }, (_, i) => ({
    a: 1.3 + RING_RNG() * 0.1,
    k: 0.05 + RING_RNG() * 0.4,
    tilt: i / 6 * Math.PI + RING_RNG() * 0.5,
    speed: 3 + RING_RNG() * 0.7,
    phase: RING_RNG() * TAU,
    sweep: 0.6 + RING_RNG() * 0.25,
    hue: i * 360 / 6 + RING_RNG() * 30,
    hueSpan: 60 + RING_RNG() * 60,
    width: 0.05 + RING_RNG() * 0.012,
    cx: 0,
    cy: 0.1
  }));
  var SWOOSH = Array.from({ length: 4 }, (_, i) => ({
    a: 0.78 + i * 0.2,
    k: 0.05 + i * 0.02,
    tilt: -0.62 + i * 0.05,
    speed: 0.3,
    phase: 0.06 * i,
    sweep: 0.4,
    hue: 95 + i * 62,
    hueSpan: 100,
    width: 0.05,
    cx: 0,
    cy: -0.12
  }));
  var DOT_X = [-0.557, -0.013, 0.532];
  var DOT_R = 0.165;
  var DOT_PEAK = 1.25;
  var P_RNG = createRng(48879);
  var PARTICLES = Array.from({ length: 5 }, (_, i) => ({
    birth: i * 0.2,
    angle: P_RNG() * TAU,
    rho: 0.58 + P_RNG() * 0.18
  }));
  function particles(t, scale) {
    const out = [];
    for (const p of PARTICLES) {
      const u = t - p.birth;
      if (u < 0 || u > 0.62) continue;
      const rho = p.rho * Math.pow(0.75, u * 10);
      const a = p.angle + u * 100 * Math.PI / 180;
      out.push({
        x: Math.cos(a) * rho * scale,
        y: Math.sin(a) * rho * scale,
        r: (0.04 + 0.028 * clamp(u / 0.55)) * scale,
        depth: clamp(1 - rho / 0.8),
        opacity: clamp(u / 0.06) * clamp((0.62 - u) / 0.08)
      });
    }
    return out;
  }
  var COMET_RNG = createRng(49383);
  var COMET_RIBBONS = Array.from({ length: 4 }, (_, i) => {
    const d = i - 1.5;
    return {
      a: 0.85 * (1 + d * 0.03),
      k: 0.15 / 0.85 * (1 + d * 0.16),
      tilt: 34 * Math.PI / 180 + d * 0.035,
      speed: 210 / 360,
      phase: -i * 0.045 + COMET_RNG() * 0.012,
      sweep: 0.34,
      hue: i * 85 + COMET_RNG() * 20,
      hueSpan: 80,
      width: 0.095,
      cx: 0,
      cy: 0
    };
  });
  var COMET_DOT = 0.129;
  var NOTIF_ANGLE = -42;
  var NOTIF_DIST = 1.003;
  var NOTIF_R = 0.15;
  var NOTIF_POP = 1.14;
  var NOTIF_MARGIN = 0.054;

  // client/src/bot/face.js
  var EYE_SPLIT = 15.46;
  var EYE_W = 0.186;
  var EYE_H = 0.412;
  var REST_GAZE = { yaw: 28.49, pitch: 28.62, roll: -13 };
  var deg = (d) => d * Math.PI / 180;
  function spin(u, v, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s],
      [v[0] * c - u[0] * s, v[1] * c - u[1] * s, v[2] * c - u[2] * s]
    ];
  }
  function eyePoses(gaze, scale, split = EYE_SPLIT) {
    let f = [0, 0, 1];
    let right = [1, 0, 0];
    let down = [0, 1, 0];
    [f, right] = spin(f, right, deg(gaze.yaw));
    [down, f] = spin(down, f, deg(gaze.pitch));
    [right, down] = spin(right, down, deg(gaze.roll));
    const build = (side) => {
      const [ef, er] = spin(f, right, deg(split * side));
      return {
        x: ef[0] * scale,
        y: ef[1] * scale,
        a: er[0],
        b: er[1],
        c: down[0],
        d: down[1],
        depth: ef[2]
      };
    };
    return [build(-1), build(1)];
  }
  var BLINK_RNG = createRng(24301);
  var BLINKS = (() => {
    const out = [];
    let t = 1.4;
    while (t < 900) {
      out.push(t);
      t += 1.9 + BLINK_RNG() * 2.7;
      if (BLINK_RNG() < 0.18) {
        out.push(t);
        t += 0.24;
      }
    }
    return out;
  })();
  var BLINK_DUR = 0.18;
  function blinkLid(t) {
    const wrapped = (t % 880 + 880) % 880;
    for (let i = 0; i < BLINKS.length; i++) {
      const start = BLINKS[i];
      if (wrapped < start) break;
      const k = (wrapped - start) / BLINK_DUR;
      if (k >= 0 && k <= 1) {
        return k < 0.45 ? 1 - k / 0.45 : (k - 0.45) / 0.55;
      }
    }
    return 1;
  }
  function liveliness(t, opt = {}) {
    const { wander = 1, blink = true, float = true } = opt;
    return {
      dYaw: (loopNoise(t, 11.3, 0.4) * 5.5 + loopNoise(t, 3.7, 2.1) * 1.6) * wander,
      dPitch: (loopNoise(t, 9.1, 1.3) * 4.2 + loopNoise(t, 4.3, 0.7) * 1.3) * wander,
      dRoll: loopNoise(t, 13.7, 3.2) * 2.2 * wander,
      lid: blink ? blinkLid(t) : 1,
      driftX: float ? loopNoise(t, 7.9, 1.9) * 6e-3 : 0,
      driftY: float ? loopNoise(t, 5.3, 0.3) * 7e-3 : 0,
      breath: float ? 1 + Math.sin(t / 3.4 * Math.PI * 2) * 5e-3 : 1
    };
  }
  function blinkScale(lid) {
    return 0.06 + 0.94 * clamp(lid);
  }

  // client/src/bot/expressions.js
  var eye = (w, h, tilt = 0, open = 1) => ({ w, h, tilt, open });
  var pair = (w, h, tilt = 0, open = 1) => [
    eye(w, h, tilt, open),
    eye(w, h, -tilt, open)
  ];
  var EXPRESSIONS = [
    {
      id: "neutre",
      label: "NEUTRAL",
      gaze: { ...REST_GAZE },
      split: EYE_SPLIT,
      eyes: [eye(EYE_W, EYE_H), eye(EYE_W, EYE_H)]
    },
    {
      id: "attentif",
      label: "ATTENTIVE",
      gaze: { yaw: 4, pitch: 5, roll: -4 },
      split: 16,
      eyes: pair(0.21, 0.44)
    },
    {
      id: "surpris",
      label: "SURPRISED",
      gaze: { yaw: 3, pitch: -3, roll: 0 },
      split: 19,
      eyes: pair(0.45, 0.47)
    },
    {
      id: "excite",
      label: "EXCITED",
      gaze: { yaw: 6, pitch: -14, roll: 0 },
      split: 19.5,
      eyes: pair(0.4, 0.56, -10)
    },
    {
      id: "heureux",
      label: "HAPPY",
      gaze: { yaw: 5, pitch: 9, roll: 0 },
      split: 17,
      eyes: pair(0.27, 0.17, 14)
    },
    {
      id: "hilare",
      label: "LAUGHING",
      gaze: { yaw: 4, pitch: 14, roll: 0 },
      split: 18,
      eyes: pair(0.34, 0.13, 20)
    },
    {
      id: "colere",
      label: "FIERCE",
      gaze: { yaw: 3, pitch: 7, roll: 0 },
      split: 17,
      eyes: pair(0.34, 0.15, 30)
    },
    {
      id: "triste",
      label: "SAD",
      gaze: { yaw: 3, pitch: -13, roll: 0 },
      split: 16,
      eyes: pair(0.22, 0.4, -28)
    },
    {
      id: "effraye",
      label: "SHOCKED",
      gaze: { yaw: 2, pitch: -20, roll: 0 },
      split: 20.5,
      eyes: pair(0.4, 0.6)
    },
    {
      id: "mefiant",
      label: "SUSPICIOUS",
      gaze: { yaw: 12, pitch: 6, roll: -6 },
      split: 16,
      eyes: [eye(0.21, 0.4), eye(0.22, 0.15)]
    },
    {
      id: "confus",
      label: "CONFUSED",
      gaze: { yaw: -14, pitch: 3, roll: 8 },
      split: 16.5,
      eyes: [eye(0.2, 0.44, -18), eye(0.28, 0.17, 14)]
    },
    {
      id: "curieux",
      label: "CURIOUS",
      gaze: { yaw: 16, pitch: -9, roll: -15 },
      split: 16.5,
      eyes: [eye(0.24, 0.46, -8), eye(0.2, 0.38, -8)]
    },
    {
      id: "fier",
      label: "PROUD",
      gaze: { yaw: 5, pitch: 17, roll: 0 },
      split: 17,
      eyes: pair(0.3, 0.15, 18)
    },
    {
      id: "timide",
      label: "SHY",
      gaze: { yaw: -19, pitch: -14, roll: -7 },
      split: 14,
      eyes: pair(0.17, 0.3)
    },
    {
      id: "blase",
      label: "UNIMPRESSED",
      gaze: { yaw: -22, pitch: 2, roll: 0 },
      split: 16,
      eyes: pair(0.3, 0.12)
    },
    {
      id: "somnolent",
      label: "SLEEPY",
      gaze: { yaw: 6, pitch: -9, roll: -3 },
      split: 16,
      eyes: pair(0.2, 0.42, 0, 0.42)
    }
  ];
  var EXPRESSION_BY_ID = new Map(EXPRESSIONS.map((e) => [e.id, e]));
  var lerpEyeCfg = (a, b, t) => ({
    w: lerp(a.w, b.w, t),
    h: lerp(a.h, b.h, t),
    tilt: lerp(a.tilt ?? 0, b.tilt ?? 0, t),
    open: lerp(a.open, b.open, t)
  });
  function blendExpression(a, b, t) {
    return {
      id: b.id,
      label: b.label,
      gaze: {
        yaw: lerp(a.gaze.yaw, b.gaze.yaw, t),
        pitch: lerp(a.gaze.pitch, b.gaze.pitch, t),
        roll: lerp(a.gaze.roll, b.gaze.roll, t)
      },
      split: lerp(a.split, b.split, t),
      eyes: [lerpEyeCfg(a.eyes[0], b.eyes[0], t), lerpEyeCfg(a.eyes[1], b.eyes[1], t)]
    };
  }

  // client/src/bot/profiles.js
  var PROFILE_SAMPLES = 64;
  var PROFILES = {
    egg: [0.8369, 0.8424, 0.8497, 0.8585, 0.8674, 0.8775, 0.8878, 0.8983, 0.9089, 0.9185, 0.9288, 0.9374, 0.9445, 0.9504, 0.9543, 0.9559, 0.9555, 0.9519, 0.9466, 0.9389, 0.9302, 0.9193, 0.9085, 0.8969, 0.8852, 0.8734, 0.8625, 0.8513, 0.8411, 0.8325, 0.8243, 0.8179, 0.8137, 0.8112, 0.8102, 0.8128, 0.8178, 0.8262, 0.8374, 0.8518, 0.8702, 0.8922, 0.9169, 0.9446, 0.9741, 1.0023, 1.0267, 1.0433, 1.0481, 1.0393, 1.0216, 0.997, 0.9697, 0.9418, 0.9169, 0.8949, 0.876, 0.8604, 0.849, 0.8394, 0.8337, 0.8314, 0.8305, 0.8326],
    hexagon: [0.921, 0.9282, 0.9441, 0.9706, 0.9984, 1.0059, 0.9896, 0.9562, 0.929, 0.9124, 0.9047, 0.9058, 0.9157, 0.9349, 0.9642, 0.9873, 0.9882, 0.9665, 0.9336, 0.9105, 0.8968, 0.8918, 0.8955, 0.908, 0.9293, 0.9611, 0.982, 0.9812, 0.959, 0.9282, 0.9089, 0.8978, 0.8964, 0.9026, 0.9189, 0.9439, 0.9778, 0.999, 0.9964, 0.9713, 0.9439, 0.9274, 0.9196, 0.9206, 0.9308, 0.9502, 0.9799, 1.0121, 1.0226, 1.0071, 0.9752, 0.951, 0.9366, 0.9316, 0.9351, 0.9485, 0.9711, 1.0026, 1.0213, 1.0155, 0.9863, 0.9547, 0.9347, 0.9232],
    triangle: [0.7819, 0.8211, 0.8747, 0.944, 1.0223, 1.096, 1.1401, 1.134, 1.0808, 1.0047, 0.9265, 0.8603, 0.8104, 0.773, 0.745, 0.7273, 0.7151, 0.7118, 0.7148, 0.7245, 0.7427, 0.768, 0.8037, 0.8518, 0.9148, 0.9876, 1.0583, 1.1073, 1.1109, 1.0667, 0.994, 0.9164, 0.8482, 0.7948, 0.7555, 0.7261, 0.7056, 0.6925, 0.6859, 0.6869, 0.6938, 0.7084, 0.7305, 0.7615, 0.804, 0.8595, 0.9311, 1.0092, 1.0791, 1.1171, 1.1054, 1.0501, 0.9779, 0.905, 0.845, 0.799, 0.7656, 0.7413, 0.7258, 0.716, 0.7146, 0.7204, 0.733, 0.7528]
  };

  // client/src/bot/shape.js
  var ANGLES = Array.from({ length: PROFILE_SAMPLES }, (_, i) => i / PROFILE_SAMPLES * TAU);
  var COS = ANGLES.map(Math.cos);
  var SIN = ANGLES.map(Math.sin);
  function silhouette(name, pose = {}) {
    return {
      radii: [...PROFILES[name]],
      rot: 0,
      cx: 0,
      cy: 0,
      sx: 1,
      sy: 1,
      ...pose
    };
  }
  function circle(radius, pose = {}) {
    return {
      radii: new Array(PROFILE_SAMPLES).fill(radius),
      rot: 0,
      cx: 0,
      cy: 0,
      sx: 1,
      sy: 1,
      ...pose
    };
  }
  function blend(a, b, t, out) {
    const dst = out ?? { radii: new Array(PROFILE_SAMPLES), rot: 0, cx: 0, cy: 0, sx: 1, sy: 1 };
    for (let i = 0; i < PROFILE_SAMPLES; i++) {
      dst.radii[i] = lerp(a.radii[i] ?? 1, b.radii[i] ?? 1, t);
    }
    let dRot = b.rot - a.rot;
    while (dRot > Math.PI) dRot -= TAU;
    while (dRot < -Math.PI) dRot += TAU;
    dst.rot = a.rot + dRot * t;
    dst.cx = lerp(a.cx, b.cx, t);
    dst.cy = lerp(a.cy, b.cy, t);
    dst.sx = lerp(a.sx, b.sx, t);
    dst.sy = lerp(a.sy, b.sy, t);
    return dst;
  }
  function toPoints(s, scale, out = []) {
    const cr = Math.cos(s.rot);
    const sr = Math.sin(s.rot);
    for (let i = 0; i < PROFILE_SAMPLES; i++) {
      const r = s.radii[i] ?? 1;
      const x = r * (COS[i] ?? 0);
      const y = r * (SIN[i] ?? 0);
      const rx = x * cr - y * sr;
      const ry = x * sr + y * cr;
      const p = out[i] ?? { x: 0, y: 0 };
      p.x = (rx * s.sx + s.cx) * scale;
      p.y = (ry * s.sy + s.cy) * scale;
      out[i] = p;
    }
    out.length = PROFILE_SAMPLES;
    return out;
  }
  function closedPath(pts, tension = 1 / 6) {
    const n = pts.length;
    if (n < 3) return "";
    const first = pts[0];
    let d = `M${r2(first.x)} ${r2(first.y)}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      const c1x = p1.x + (p2.x - p0.x) * tension;
      const c1y = p1.y + (p2.y - p0.y) * tension;
      const c2x = p2.x - (p3.x - p1.x) * tension;
      const c2y = p2.y - (p3.y - p1.y) * tension;
      d += `C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(p2.x)} ${r2(p2.y)}`;
    }
    return `${d}Z`;
  }
  function profileFromPolygon(poly, cx, cy) {
    const radii = new Array(PROFILE_SAMPLES).fill(0);
    const n = poly.length;
    for (let k = 0; k < PROFILE_SAMPLES; k++) {
      const dx = COS[k] ?? 0;
      const dy = SIN[k] ?? 0;
      let best = 0;
      for (let i = 0; i < n; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % n];
        const ex = b.x - a.x;
        const ey = b.y - a.y;
        const den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const px = a.x - cx;
        const py = a.y - cy;
        const t = (px * ey - py * ex) / den;
        const u = (px * dy - py * dx) / den;
        if (t > best && u >= 0 && u <= 1) best = t;
      }
      radii[k] = best;
    }
    return radii;
  }
  function hullOfCircles(x1, y1, r1, x2, y2, r2v, steps = 96) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const base2 = Math.atan2(dy, dx);
    const spread = Math.acos(Math.max(-1, Math.min(1, (r1 - r2v) / dist)));
    const pts = [];
    for (let i = 0; i <= steps / 2; i++) {
      const a = base2 + spread + (TAU - 2 * spread) * i / (steps / 2);
      pts.push({ x: x1 + Math.cos(a) * r1, y: y1 + Math.sin(a) * r1 });
    }
    for (let i = 0; i <= steps / 2; i++) {
      const a = base2 - spread + 2 * spread * i / (steps / 2);
      pts.push({ x: x2 + Math.cos(a) * r2v, y: y2 + Math.sin(a) * r2v });
    }
    return pts;
  }
  function radiusAtAngle(radii, angle) {
    const n = radii.length;
    const t = (angle / TAU % 1 + 1) % 1 * n;
    const i = Math.floor(t);
    return lerp(radii[i % n] ?? 1, radii[(i + 1) % n] ?? 1, t - i);
  }
  function superellipseProfile(n, sx = 1, sy = 1) {
    return ANGLES.map((_, i) => {
      const c = Math.abs((COS[i] ?? 0) / sx) ** n;
      const s = Math.abs((SIN[i] ?? 0) / sy) ** n;
      return (c + s) ** (-1 / n);
    });
  }
  function unionOfCirclesProfile(circles) {
    const out = new Array(PROFILE_SAMPLES).fill(0);
    for (let i = 0; i < PROFILE_SAMPLES; i++) {
      const dx = COS[i] ?? 0;
      const dy = SIN[i] ?? 0;
      let best = 0;
      for (const c of circles) {
        const b = dx * c.x + dy * c.y;
        const disc = b * b - (c.x * c.x + c.y * c.y - c.r * c.r);
        if (disc < 0) continue;
        const t = b + Math.sqrt(disc);
        if (t > best) best = t;
      }
      out[i] = best;
    }
    return out;
  }
  function roundedPolygon(verts, rc, arcSteps = 10) {
    const n = verts.length;
    const out = [];
    const normal = (a, b) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      return Math.atan2(-dx / len, dy / len);
    };
    for (let i = 0; i < n; i++) {
      const prev = verts[(i - 1 + n) % n];
      const cur = verts[i];
      const next = verts[(i + 1) % n];
      const a0 = normal(prev, cur);
      const a1 = normal(cur, next);
      let d = a1 - a0;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      for (let k = 0; k <= arcSteps; k++) {
        const a = a0 + d * k / arcSteps;
        out.push({ x: cur.x + Math.cos(a) * rc, y: cur.y + Math.sin(a) * rc });
      }
    }
    return out;
  }
  function regularPolygonProfile(sides, radius, rc, rotationDeg = 0) {
    const rot = rotationDeg * Math.PI / 180;
    const verts = Array.from({ length: sides }, (_, i) => {
      const a = rot + i / sides * TAU;
      return { x: Math.cos(a) * (radius - rc), y: Math.sin(a) * (radius - rc) };
    });
    return profileFromPolygon(roundedPolygon(verts, rc), 0, 0);
  }
  function polyPath(pts, scale = 1) {
    if (pts.length < 3) return "";
    let d = "";
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      d += `${i === 0 ? "M" : "L"}${r2(p.x * scale)} ${r2(p.y * scale)}`;
    }
    return `${d}Z`;
  }
  function capsulePath(w, h) {
    const hw = Math.max(w, 0.01) / 2;
    const hh = Math.max(h, 0.01) / 2;
    const r = Math.min(hw, hh);
    return `M${r2(-hw)} ${r2(-hh + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(-hw + r)} ${r2(-hh)}L${r2(hw - r)} ${r2(-hh)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(hw)} ${r2(-hh + r)}L${r2(hw)} ${r2(hh - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(hw - r)} ${r2(hh)}L${r2(-hw + r)} ${r2(hh)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(-hw)} ${r2(hh - r)}Z`;
  }

  // client/src/bot/skins.js
  function normalize(radii, max = 1) {
    const peak = Math.max(...radii);
    if (peak <= 0) return radii;
    const k = max / peak;
    return radii.map((r) => r * k);
  }
  var ANGLES2 = Array.from({ length: PROFILE_SAMPLES }, (_, i) => i / PROFILE_SAMPLES * Math.PI * 2);
  var pebble = normalize(
    ANGLES2.map((a) => 1 + 0.075 * Math.cos(2 * a + 0.5) + 0.035 * Math.cos(3 * a + 2.1)),
    1.02
  );
  var cloud = normalize(
    unionOfCirclesProfile([
      { x: -0.44, y: 0.2, r: 0.54 },
      { x: 0.46, y: 0.2, r: 0.5 },
      { x: 0.02, y: 0.3, r: 0.6 },
      { x: -0.24, y: -0.3, r: 0.48 },
      { x: 0.3, y: -0.24, r: 0.44 }
    ]),
    1.02
  );
  var droplet = normalize(
    profileFromPolygon(hullOfCircles(0, 0.28, 0.66, 0, -0.96, 0.05), 0, 0),
    1.04
  );
  var capsule = profileFromPolygon(hullOfCircles(-0.42, 0, 0.62, 0.42, 0, 0.62), 0, 0);
  var SHAPES = [
    { id: "cercle", radii: new Array(PROFILE_SAMPLES).fill(1) },
    { id: "galet", radii: pebble },
    { id: "squircle", radii: normalize(superellipseProfile(4.2), 1.15) },
    { id: "capsule", radii: capsule },
    { id: "triangle", radii: regularPolygonProfile(3, 1.12, 0.34, -90) },
    { id: "hexagone", radii: regularPolygonProfile(6, 1.04, 0.26, 0) },
    { id: "nuage", radii: cloud },
    { id: "goutte", radii: droplet }
  ];
  var SHAPE_BY_ID = new Map(SHAPES.map((s) => [s.id, s]));
  var DEFAULT_SHAPE = "cercle";
  var COLORS = [
    { id: "encre", hex: "#000000" },
    { id: "blanc", hex: "#FFFFFF" },
    { id: "gris", hex: "#555555" }
  ];
  var COLOR_BY_ID = new Map(COLORS.map((c) => [c.id, c]));
  function mixHex(from, to, t) {
    const parse = (h) => {
      const clean = h.startsWith("#") ? h.slice(1) : "000000";
      const v = parseInt(clean, 16);
      return [v >> 16 & 255, v >> 8 & 255, v & 255];
    };
    const a = parse(from);
    const b = parse(to);
    const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
    return `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  }

  // client/src/bot/states.js
  var pair2 = (w, h) => [
    { w, h, open: 1 },
    { w, h, open: 1 }
  ];
  function base(over = {}) {
    return {
      sil: circle(1),
      offX: 0,
      offY: 0,
      gaze: { ...REST_GAZE },
      split: EYE_SPLIT,
      eyes: pair2(EYE_W, EYE_H),
      eyeAlpha: 1,
      bodyAlpha: 1,
      dots: [],
      arcs: [],
      notif: null,
      dotsBehind: false,
      ...over
    };
  }
  var BAR_UPRIGHT_CY = -0.1875;
  var BAR_UPRIGHT = profileFromPolygon(
    hullOfCircles(0, -0.505, 0.132, 0, 0.13, 0.075),
    0,
    BAR_UPRIGHT_CY
  );
  var BAR_ITALIC = profileFromPolygon(hullOfCircles(0, -0.2535, 0.1345, 0, 0.2535, 0.1345), 0, 0);
  var barUpright = (pose = {}) => ({
    radii: [...BAR_UPRIGHT],
    rot: 0,
    cx: 0,
    cy: BAR_UPRIGHT_CY,
    sx: 1,
    sy: 1,
    ...pose
  });
  var barItalic = (pose = {}) => ({
    radii: [...BAR_ITALIC],
    rot: 0,
    cx: 0,
    cy: 0,
    sx: 1,
    sy: 1,
    ...pose
  });
  var TEAR = polyPath(hullOfCircles(0, 0, 0.118, 0, 0.172, 0.012));
  var TRI_ORBIT = 0.213;
  function spinningTriangle(rot) {
    return silhouette("triangle", {
      rot,
      cx: -TRI_ORBIT * Math.sin(rot),
      cy: TRI_ORBIT * Math.cos(rot)
    });
  }
  function dotPulse(t, index) {
    const p = ((t - index * 0.5) / 1.5 % 1 + 1) % 1;
    const k = p < 0.5 ? 0.5 - 0.5 * Math.cos(p * TAU) : 0;
    return clamp(k * 2);
  }
  var STATES = [
    {
      id: "idle",
      label: "IDLE",
      duration: 2.4,
      morph: 0.45,
      blinkIn: false,
      baseFace: true,
      baseBody: true,
      pose: () => base()
    },
    {
      id: "thinking",
      label: "THINKING",
      duration: 2.6,
      morph: 0.4,
      baseFace: false,
      baseBody: false,
      blinkIn: true,
      pose: (t) => {
        const mid = dotPulse(t, 1);
        const emerge = 0.3 + 0.7 * easings.easeOutCubic(clamp(t / 0.3));
        return base({
          sil: circle(DOT_R * (1 + (DOT_PEAK - 1) * mid), { cx: DOT_X[1] }),
          eyeAlpha: 0,
          dots: [0, 2].map((i) => {
            const k = dotPulse(t, i);
            return {
              x: DOT_X[i] * emerge,
              y: 0,
              r: DOT_R * (1 + (DOT_PEAK - 1) * k),
              opacity: 0.55 + 0.45 * k
            };
          })
        });
      }
    },
    {
      id: "wink",
      label: "WINK",
      duration: 1.6,
      morph: 0.3,
      blinkIn: true,
      baseFace: false,
      baseBody: true,
      pose: () => base({
        gaze: { yaw: -5.37, pitch: 4.55, roll: 6.7 },
        split: 16.25,
        eyes: [
          { w: 0.236, h: 0.464, open: 1 },
          { w: 0.447, h: 0.089, open: 1 }
        ]
      })
    },
    {
      id: "wide",
      label: "WIDE",
      duration: 1.8,
      morph: 0.55,
      blinkIn: true,
      baseFace: false,
      baseBody: true,
      pose: () => base({
        gaze: { yaw: 6.92, pitch: -21.96, roll: 11.6 },
        split: 18.43,
        eyes: pair2(0.356, 0.875)
      })
    },
    {
      id: "alert",
      label: "ALERT",
      duration: 2.4,
      minDuration: 2,
      morph: 0.45,
      baseFace: false,
      baseBody: false,
      blinkIn: false,
      pose: (t) => {
        const p = clamp(t / 1.5);
        const travel = easings.easeInOutCubic(p) * 0.82 - 0.087;
        const back = t > 1.6 ? clamp((t - 1.6) / 0.4) : 0;
        const x = travel * (1 - back) + 0.1 * back;
        const buzz = Math.sin(t * 2.5 * TAU) * 5e-3;
        const tilt = 17.7 * Math.PI / 180;
        return base({
          sil: barItalic({ rot: tilt, cx: x, cy: -0.325 - buzz }),
          eyeAlpha: 0,
          dots: [
            {
              x: x - Math.sin(tilt) * 0.58,
              y: -0.325 + Math.cos(tilt) * 0.58 + buzz * 2.8,
              r: 0.118,
              d: TEAR,
              rot: tilt * 180 / Math.PI,
              opacity: 1
            }
          ]
        });
      }
    },
    {
      id: "notify",
      label: "PING",
      duration: 2.2,
      morph: 0.5,
      blinkIn: true,
      baseFace: false,
      baseBody: true,
      pose: (t) => {
        const p = clamp(t / 0.45);
        const pop = 1 + (NOTIF_POP - 1) * Math.sin(p * Math.PI) * (1 - p * 0.35);
        const r = NOTIF_R * (p < 1 ? pop : 1);
        const a = NOTIF_ANGLE * Math.PI / 180;
        return base({
          gaze: { yaw: -21.94, pitch: -5.82, roll: -12.2 },
          split: 18.89,
          eyes: pair2(0.505, 0.498),
          notif: {
            x: Math.cos(a) * NOTIF_DIST,
            y: Math.sin(a) * NOTIF_DIST,
            r,
            notch: r + NOTIF_MARGIN
          }
        });
      }
    },
    {
      id: "exclaim",
      label: "EXCLAIM",
      duration: 2,
      morph: 0.45,
      baseFace: false,
      baseBody: false,
      blinkIn: false,
      pose: () => base({
        sil: barUpright(),
        eyeAlpha: 0,
        dots: [{ x: -0.012, y: 0.526, r: 0.113, opacity: 1 }]
      })
    },
    {
      id: "sleep",
      label: "PULSE",
      duration: 2.4,
      morph: 0.5,
      baseFace: false,
      baseBody: false,
      blinkIn: false,
      pose: (t) => base({
        sil: circle(0.1585, { cy: 0.11 + Math.sin(t * (TAU / 0.6)) * 0.19 }),
        eyeAlpha: 0
      })
    },
    {
      id: "egg",
      label: "EGG",
      duration: 1.8,
      morph: 0.4,
      baseFace: false,
      baseBody: false,
      blinkIn: true,
      pose: () => base({
        sil: silhouette("egg"),
        gaze: { yaw: 19.97, pitch: 26.01, roll: -17.1 },
        split: 11.07,
        eyes: pair2(0.164, 0.385)
      })
    },
    {
      id: "hexagon",
      label: "HEX",
      duration: 1.6,
      morph: 0.4,
      baseFace: false,
      baseBody: false,
      blinkIn: true,
      pose: () => base({
        sil: silhouette("hexagon"),
        gaze: { yaw: 23.11, pitch: 24.42, roll: -13.3 },
        split: 13.37,
        eyes: pair2(0.177, 0.411)
      })
    },
    {
      id: "play",
      label: "PLAY",
      duration: 2,
      morph: 0.5,
      baseFace: false,
      baseBody: false,
      blinkIn: true,
      pose: (t) => {
        const fade = clamp(t / 0.35) * clamp((2.2 - t) / 0.5);
        return base({
          sil: spinningTriangle(0),
          gaze: { yaw: 12, pitch: -8, roll: -6 },
          split: 15,
          eyes: pair2(0.18, 0.34),
          arcs: SWOOSH.map((s, i) => ({
            id: `sw${i}`,
            seed: { ...s, cx: 0.45 - t * 0.42 },
            t,
            opacity: fade
          }))
        });
      }
    },
    {
      id: "orbit",
      label: "ORBIT",
      duration: 3.4,
      minDuration: 2.5,
      morph: 0.6,
      baseFace: false,
      baseBody: false,
      blinkIn: false,
      pose: (t) => {
        const ramp = easings.easeInOutCubic(clamp(t / 0.35));
        const rot = -TAU * 1.25 * t * ramp;
        const back = easings.easeInOutCubic(clamp((t - 1.6) / 0.9));
        const tri = spinningTriangle(rot);
        const ball = circle(1, { rot });
        const sil = {
          radii: tri.radii.map((r, i) => r + (ball.radii[i] - r) * back),
          rot,
          cx: tri.cx * (1 - back),
          cy: tri.cy * (1 - back),
          sx: 1,
          sy: 1
        };
        const fade = clamp(t / 0.8) * clamp((3.6 - t) / 0.9);
        return base({
          sil,
          gaze: {
            yaw: REST_GAZE.yaw + Math.sin(t * 6.5) * 65 * (1 - back),
            pitch: -4 + back * 32,
            roll: -13
          },
          eyes: pair2(0.18, 0.34 + back * 0.07),
          arcs: RINGS.map((s, i) => ({
            id: `rg${i}`,
            seed: s,
            t,
            opacity: fade * clamp((t - i * 0.13) / 0.3)
          }))
        });
      }
    },
    {
      id: "swirl",
      label: "SWIRL",
      duration: 1.3,
      minDuration: 1.3,
      morph: 0.3,
      baseFace: true,
      baseBody: true,
      blinkIn: true,
      pose: (t) => base({
        arcs: RINGS.slice(0, 3).map((s, i) => ({
          id: `sw${i}`,
          seed: s,
          t,
          opacity: clamp((t - i * 0.06) / 0.14) * clamp((1.22 - t) / 0.34)
        }))
      })
    },
    {
      id: "burst",
      label: "BURST",
      duration: 2.6,
      minDuration: 2.4,
      morph: 0.4,
      baseFace: false,
      baseBody: false,
      blinkIn: false,
      pose: (t) => {
        const collapse = 1 - 0.834 * easings.easeOutQuint(clamp(t / 0.7));
        const regrow = easings.easeOutQuint(clamp((t - 1.7) / 0.7));
        return base({
          sil: circle(collapse + (1 - collapse) * regrow),
          eyeAlpha: clamp((t - 1.85) / 0.4),
          dots: particles(t, 1),
          dotsBehind: true
        });
      }
    },
    {
      id: "comet",
      label: "COMET",
      duration: 2.4,
      minDuration: 2.4,
      morph: 0.45,
      baseFace: false,
      baseBody: false,
      blinkIn: false,
      pose: (t) => {
        const collapse = 1 - (1 - COMET_DOT) * easings.easeOutQuint(clamp(t / 0.55));
        const regrow = easings.easeOutQuint(clamp((t - 1.85) / 0.6));
        const fade = clamp((t - 0.15) / 0.25) * clamp((1.95 - t) / 0.3);
        return base({
          sil: circle(collapse + (1 - collapse) * regrow, {
            cy: Math.sin(clamp(t / 1.7) * Math.PI) * 0.035
          }),
          eyeAlpha: clamp((t - 2) / 0.35),
          arcs: COMET_RIBBONS.map((s, i) => ({ id: `cm${i}`, seed: s, t, opacity: fade }))
        });
      }
    }
  ];
  var STATE_BY_ID = new Map(STATES.map((s) => [s.id, s]));

  // client/src/bot/eyefit.js
  var R = 100;
  var DERIVE_YAW = 5.5 + 1.6;
  var DERIVE_PITCH = 4.2 + 1.3;
  var DERIVE_X = 6e-3;
  var DERIVE_Y = 7e-3;
  function empreintes(visage, sil, radii) {
    const out = [];
    const poses = eyePoses(visage.gaze, R, visage.split);
    for (let i = 0; i < 2; i++) {
      const e = poses[i];
      if (e.depth <= 0.02) continue;
      const cfg = visage.eyes[i];
      const phi = (cfg.tilt ?? 0) * Math.PI / 180;
      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      const ax = e.a * cp + e.c * sp;
      const ay = e.b * cp + e.d * sp;
      const cx = -e.a * sp + e.c * cp;
      const cy = -e.b * sp + e.d * cp;
      const hw = Math.max(cfg.w * R, 0.01) / 2;
      const hh = Math.max(cfg.h * R, 0.01) / 2;
      const r = Math.min(hw, hh);
      const long = hh > hw;
      const demi = long ? hh - r : hw - r;
      const fit = radiusAtAngle(radii, Math.atan2(e.y, e.x) - sil.rot);
      out.push({
        x: e.x * fit,
        y: e.y * fit,
        ax: (long ? cx : ax) * demi,
        ay: (long ? cy : ay) * demi,
        r,
        m: [ax, ay, cx, cy]
      });
    }
    return out;
  }
  function approche(pts, x0, y0, x1, y1) {
    const sx = x1 - x0;
    const sy = y1 - y0;
    const len2 = sx * sx + sy * sy;
    let best = Infinity;
    let vx = 0;
    let vy = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      let t = len2 > 0 ? ((p.x - x0) * sx + (p.y - y0) * sy) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = x0 + t * sx - p.x;
      const ey = y0 + t * sy - p.y;
      const d2 = ex * ex + ey * ey;
      if (d2 < best) {
        best = d2;
        vx = ex;
        vy = ey;
      }
    }
    const d = Math.sqrt(best);
    return { d, ux: d > 1e-9 ? vx / d : 0, uy: d > 1e-9 ? vy / d : 0 };
  }
  var FLOTTEMENT = Math.hypot(DERIVE_X, DERIVE_Y) * R;
  function pire(pts, emps, tx, ty) {
    let marge = Infinity;
    let ux = 0;
    let uy = 0;
    for (const e of emps) {
      const x = e.x + tx;
      const y = e.y + ty;
      const a = approche(pts, x - e.ax, y - e.ay, x + e.ax, y + e.ay);
      const [m0, m1, m2, m3] = e.m;
      const rayon = e.r * Math.hypot(m0 * a.ux + m1 * a.uy, m2 * a.ux + m3 * a.uy) + FLOTTEMENT;
      if (a.d - rayon < marge) {
        marge = a.d - rayon;
        ux = a.ux;
        uy = a.uy;
      }
    }
    return { marge, ux, uy };
  }
  var DIRECTIONS = 12;
  var DICHOTOMIE = 8;
  function resous(epreuves) {
    if (!epreuves.length) return { x: 0, y: 0 };
    const marge = (tx, ty) => {
      let m = Infinity;
      for (const ep of epreuves) m = Math.min(m, pire(ep.contour, ep.empreintes, tx, ty).marge);
      return m;
    };
    let requis = Infinity;
    for (const ep of epreuves) {
      requis = Math.min(requis, pire(ep.calContour, ep.reference, 0, 0).marge);
    }
    let mx = 0;
    let my = 0;
    const emps = epreuves[0].empreintes;
    for (const e of emps) {
      mx -= e.x / emps.length;
      my -= e.y / emps.length;
    }
    const course = Math.max(0.35 * R, Math.hypot(mx, my) * 1.25);
    requis = Math.min(requis, marge(mx, my));
    const depart = marge(0, 0);
    if (depart >= requis && depart >= 0) return { x: 0, y: 0 };
    const cible = Math.max(requis, 0);
    let meilleurX = 0;
    let meilleurY = 0;
    let meilleureNorme = Infinity;
    let secoursX = 0;
    let secoursY = 0;
    let secours = depart;
    for (let d = 0; d < DIRECTIONS; d++) {
      const a = d / DIRECTIONS * Math.PI * 2;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      if (marge(ux * course, uy * course) < cible) {
        for (const k of [0.3, 0.6, 1]) {
          const m = marge(ux * course * k, uy * course * k);
          if (m > secours) {
            secours = m;
            secoursX = ux * course * k;
            secoursY = uy * course * k;
          }
        }
        continue;
      }
      let bas = 0;
      let haut = course;
      for (let i = 0; i < DICHOTOMIE; i++) {
        const mid = (bas + haut) / 2;
        if (marge(ux * mid, uy * mid) >= cible) haut = mid;
        else bas = mid;
      }
      if (haut < meilleureNorme) {
        meilleureNorme = haut;
        meilleurX = ux * haut;
        meilleurY = uy * haut;
      }
    }
    const x = meilleureNorme === Infinity ? secoursX : meilleurX;
    const y = meilleureNorme === Infinity ? secoursY : meilleurY;
    return { x: +(x / R).toFixed(6), y: +(y / R).toFixed(6) };
  }
  function visageDe(def, pose, expr) {
    if (def.baseFace && expr) return { gaze: expr.gaze, split: expr.split, eyes: expr.eyes };
    return { gaze: pose.gaze, split: pose.split, eyes: pose.eyes };
  }
  function dates(def) {
    const signature = (p) => JSON.stringify([p.gaze, p.split, p.eyes, p.sil.rot, p.sil.cx, p.sil.cy, p.sil.sx, p.sil.sy]);
    if (signature(def.pose(0)) === signature(def.pose(def.duration))) return [0];
    const n = 3;
    return Array.from({ length: n }, (_, i) => i / (n - 1) * def.duration);
  }
  function decalagePour(def, radii, expr) {
    const epreuves = [];
    for (const t of dates(def)) {
      const pose = def.pose(t);
      const contour = toPoints({ ...pose.sil, radii }, R);
      const calContour = toPoints(pose.sil, R);
      const v = visageDe(def, pose, expr);
      const coins = [];
      for (const dy of [-DERIVE_YAW, DERIVE_YAW]) {
        for (const dp of [-DERIVE_PITCH, DERIVE_PITCH]) {
          coins.push({
            ...v,
            gaze: { yaw: v.gaze.yaw + dy, pitch: v.gaze.pitch + dp, roll: v.gaze.roll }
          });
        }
      }
      for (const c of coins) {
        epreuves.push({
          empreintes: empreintes(c, pose.sil, radii),
          reference: empreintes(c, pose.sil, pose.sil.radii),
          contour,
          calContour
        });
      }
    }
    return resous(epreuves);
  }
  var NUL = { x: 0, y: 0 };
  var clef = (state, expr) => `${state}|${expr ?? ""}`;
  function batir() {
    return new Map(
      SHAPES.map((forme) => {
        const par = /* @__PURE__ */ new Map();
        if (forme.id === "cercle") return [forme.radii, par];
        for (const def of STATES) {
          if (!def.baseBody) continue;
          const expressions = def.baseFace ? [null, ...EXPRESSIONS] : [null];
          for (const expr of expressions) {
            par.set(clef(def.id, expr?.id ?? null), decalagePour(def, forme.radii, expr));
          }
        }
        return [forme.radii, par];
      })
    );
  }
  var DECALAGES = batir();
  function decalageDesYeux(radii, state, expr) {
    if (!radii) return NUL;
    const par = DECALAGES.get(radii);
    if (!par) return NUL;
    return par.get(clef(state, expr)) ?? par.get(clef(state, null)) ?? NUL;
  }

  // client/src/bot/engine.js
  var NO_LOOK = { yaw: 0, pitch: 0, mix: 0, spin: 0, wander: 1 };
  var lerpLook = (a, b, t) => ({
    yaw: lerp(a.yaw, b.yaw, t),
    pitch: lerp(a.pitch, b.pitch, t),
    mix: lerp(a.mix, b.mix, t),
    spin: lerp(a.spin, b.spin, t),
    wander: lerp(a.wander, b.wander, t)
  });
  var lerpEye = (a, b, t) => ({
    w: lerp(a.w, b.w, t),
    h: lerp(a.h, b.h, t),
    open: lerp(a.open, b.open, t),
    tilt: lerp(a.tilt ?? 0, b.tilt ?? 0, t)
  });
  function blendPose(a, b, t) {
    const out = 1 - t;
    return {
      sil: blend(a.sil, b.sil, t),
      offX: lerp(a.offX, b.offX, t),
      offY: lerp(a.offY, b.offY, t),
      gaze: {
        yaw: lerp(a.gaze.yaw, b.gaze.yaw, t),
        pitch: lerp(a.gaze.pitch, b.gaze.pitch, t),
        roll: lerp(a.gaze.roll, b.gaze.roll, t)
      },
      split: lerp(a.split, b.split, t),
      eyes: [lerpEye(a.eyes[0], b.eyes[0], t), lerpEye(a.eyes[1], b.eyes[1], t)],
      eyeAlpha: lerp(a.eyeAlpha, b.eyeAlpha, t),
      bodyAlpha: lerp(a.bodyAlpha, b.bodyAlpha, t),
      dots: [
        ...a.dots.map((d) => ({ ...d, opacity: d.opacity * out })),
        ...b.dots.map((d) => ({ ...d, opacity: d.opacity * t }))
      ],
      arcs: [
        ...a.arcs.map((r) => ({ ...r, id: `a${r.id}`, opacity: r.opacity * out })),
        ...b.arcs.map((r) => ({ ...r, id: `b${r.id}`, opacity: r.opacity * t }))
      ],
      notif: t < 0.5 ? a.notif : b.notif,
      dotsBehind: t < 0.5 ? a.dotsBehind : b.dotsBehind
    };
  }
  var BotEngine = class _BotEngine {
    static SHAPE_MORPH = 0.45;
    static LOOK_MORPH = 0.18;
    constructor(scale = 100, initial = "idle", shape = null, expression = null) {
      this.scale = scale;
      this.cur = initial;
      this.prev = null;
      this.departFige = null;
      this.tCur = 0;
      this.tPrev = 0;
      this.blinkAt = -10;
      this.pts = [];
      this.shape = shape;
      this.shapePrev = null;
      this.shapeAt = -10;
      this.expr = expression;
      this.exprPrev = null;
      this.exprAt = -10;
      this.look = NO_LOOK;
      this.lookPrev = NO_LOOK;
      this.lookAt = -10;
      this.lookMorph = _BotEngine.LOOK_MORPH;
    }
    get state() {
      return this.cur;
    }
    triggerBlink(now = 0) {
      this.blinkAt = now;
    }
    setExpression(expression, now = 0) {
      if (expression === this.expr) return;
      this.exprPrev = this.expr;
      this.expr = expression;
      this.exprAt = now;
    }
    exprAtTime(now) {
      const to = this.expr;
      const from = this.exprPrev;
      if (!to || !from) return to;
      const k = (now - this.exprAt) / _BotEngine.SHAPE_MORPH;
      if (k >= 1) return to;
      return blendExpression(from, to, easings.easeOutQuint(clamp(k)));
    }
    setShape(radii, now = 0) {
      if (radii === this.shape) return;
      this.shapePrev = this.shape;
      this.shape = radii;
      this.shapeAt = now;
    }
    shapeAtTime(now) {
      const to = this.shape;
      const from = this.shapePrev;
      if (!to || !from) return to;
      const k = (now - this.shapeAt) / _BotEngine.SHAPE_MORPH;
      if (k >= 1) return to;
      const t = easings.easeOutQuint(clamp(k));
      return to.map((r, i) => lerp(from[i] ?? r, r, t));
    }
    setLook(look, now, morph = _BotEngine.LOOK_MORPH) {
      if (look && !Number.isFinite(look.yaw + look.pitch + look.mix + look.spin + look.wander)) {
        return;
      }
      this.lookPrev = this.lookAtTime(now);
      this.look = look ?? NO_LOOK;
      this.lookAt = now;
      this.lookMorph = morph;
    }
    lookAtTime(now) {
      const k = (now - this.lookAt) / this.lookMorph;
      if (k >= 1) return this.look;
      return lerpLook(this.lookPrev, this.look, easings.easeOutQuint(clamp(k)));
    }
    posed(def, t, shape, expr) {
      let pose = def.pose(t);
      if (def.baseBody && shape) {
        pose = { ...pose, sil: { ...pose.sil, radii: shape } };
      }
      if (def.baseFace && expr) {
        pose = { ...pose, gaze: expr.gaze, split: expr.split, eyes: expr.eyes };
      }
      return pose;
    }
    decalageAtTime(now, state) {
      const surAxe = (debut, duree, a, b) => {
        if (a === b) return b;
        const k = (now - debut) / duree;
        if (k >= 1) return b;
        const t = easings.easeOutQuint(clamp(k));
        return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
      };
      const parForme = (radii) => surAxe(
        this.exprAt,
        _BotEngine.SHAPE_MORPH,
        decalageDesYeux(radii, state, this.exprPrev?.id ?? null),
        decalageDesYeux(radii, state, this.expr?.id ?? null)
      );
      return surAxe(
        this.shapeAt,
        _BotEngine.SHAPE_MORPH,
        parForme(this.shapePrev),
        parForme(this.shape)
      );
    }
    reset(id, now) {
      this.cur = id;
      this.prev = null;
      this.departFige = null;
      this.tCur = now;
      this.tPrev = now;
      this.blinkAt = -10;
    }
    origine(now, shape, expr) {
      if (this.departFige) return this.departFige;
      if (!this.prev) return null;
      const prevDef = STATE_BY_ID.get(this.prev);
      return this.posed(prevDef, Math.max(0, now - this.tPrev), shape, expr);
    }
    poseComposee(now) {
      const def = STATE_BY_ID.get(this.cur);
      const shape = this.shapeAtTime(now);
      const expr = this.exprAtTime(now);
      const pose = this.posed(def, Math.max(0, now - this.tCur), shape, expr);
      const since = now - this.tCur;
      if (since >= def.morph) return pose;
      const origine = this.origine(now, shape, expr);
      if (!origine) return pose;
      return blendPose(origine, pose, easings.easeOutQuint(clamp(since / def.morph)));
    }
    setState(id, now) {
      if (id === this.cur) return;
      const morph = STATE_BY_ID.get(this.cur).morph;
      const enPleinFondu = this.prev !== null && now - this.tCur < morph;
      this.departFige = enPleinFondu ? this.poseComposee(now) : null;
      this.prev = this.cur;
      this.tPrev = this.tCur;
      this.cur = id;
      this.tCur = now;
      if (STATE_BY_ID.get(id)?.blinkIn) this.blinkAt = now;
    }
    sample(now) {
      const R3 = this.scale;
      const def = STATE_BY_ID.get(this.cur) || STATE_BY_ID.get("idle");
      const shape = this.shapeAtTime(now);
      const expr = this.exprAtTime(now);
      let pose = this.posed(def, Math.max(0, now - this.tCur), shape, expr);
      let decalage = this.decalageAtTime(now, this.cur);
      const since = now - this.tCur;
      const origine = since < def.morph ? this.origine(now, shape, expr) : null;
      if (origine) {
        const ratio = easings.easeOutQuint(clamp(since / def.morph));
        pose = blendPose(origine, pose, ratio);
        const quitte = this.prev;
        if (quitte) {
          const avant = this.decalageAtTime(now, quitte);
          decalage = {
            x: lerp(avant.x, decalage.x, ratio),
            y: lerp(avant.y, decalage.y, ratio)
          };
        }
      }
      const alive = pose.eyeAlpha > 0.01;
      const look = this.lookAtTime(now);
      const life = liveliness(now, { wander: alive ? look.wander : 0, blink: alive });
      const gaze = {
        yaw: lerp(pose.gaze.yaw, look.yaw, look.mix) + life.dYaw - look.spin,
        pitch: lerp(pose.gaze.pitch, look.pitch, look.mix) + life.dPitch,
        roll: pose.gaze.roll + life.dRoll
      };
      const forced = clamp((now - this.blinkAt) / 0.2);
      const forcedLid = forced < 1 ? Math.abs(forced * 2 - 1) : 1;
      const lid = Math.min(life.lid, forcedLid);
      const cursorNudgeX = look.yaw / 38 * 0.045 * look.mix;
      const cursorNudgeY = -look.pitch / 30 * 0.045 * look.mix;
      const offX = pose.offX + life.driftX + cursorNudgeX;
      const offY = pose.offY + life.driftY + cursorNudgeY;
      const sil = {
        ...pose.sil,
        cx: pose.sil.cx + offX,
        cy: pose.sil.cy + offY,
        sy: pose.sil.sy * life.breath
      };
      const bodyPath = closedPath(toPoints(sil, R3, this.pts));
      const bodyRadius = (x, y) => radiusAtAngle(pose.sil.radii, Math.atan2(y, x) - pose.sil.rot);
      const eyes = [];
      if (pose.eyeAlpha > 0.01) {
        const poses = eyePoses(gaze, R3, pose.split);
        for (let i = 0; i < 2; i++) {
          const e = poses[i];
          if (e.depth <= 0.02) continue;
          const cfg = pose.eyes[i];
          const fit = bodyRadius(e.x, e.y);
          const phi = (cfg.tilt ?? 0) * Math.PI / 180;
          const cp = Math.cos(phi);
          const sp = Math.sin(phi);
          const ax = e.a * cp + e.c * sp;
          const ay = e.b * cp + e.d * sp;
          const cx2 = -e.a * sp + e.c * cp;
          const cy2 = -e.b * sp + e.d * cp;
          const k = blinkScale(Math.min(lid, cfg.open));
          eyes.push({
            d: capsulePath(cfg.w * R3, cfg.h * R3),
            matrix: `matrix(${r2(ax)},${r2(ay * k)},${r2(cx2)},${r2(cy2 * k)},${r2(e.x * fit + (offX + decalage.x) * R3)},${r2(e.y * fit + (offY + decalage.y) * R3)})`,
            alpha: pose.eyeAlpha * clamp(e.depth / 0.12)
          });
        }
      }
      const dots = pose.dots.filter((p) => p.opacity > 0.01 && p.r > 5e-4).map((p) => ({ ...p, x: (p.x + offX) * R3, y: (p.y + offY) * R3, r: p.r * R3 }));
      const nFit = pose.notif ? bodyRadius(pose.notif.x, pose.notif.y) : 1;
      const nx = pose.notif ? (pose.notif.x * nFit + offX) * R3 : 0;
      const ny = pose.notif ? (pose.notif.y * nFit + offY) * R3 : 0;
      const notif = pose.notif ? { x: nx, y: ny, r: pose.notif.r * R3 } : null;
      const notch = pose.notif ? { x: nx, y: ny, r: pose.notif.notch * R3 } : null;
      return {
        bodyPath,
        bodyAlpha: pose.bodyAlpha,
        eyes,
        dots,
        dotsBehind: pose.dotsBehind,
        arcs: pose.arcs.filter((a) => a.opacity > 0.01).map((a) => arcRender(a.seed, a.t, R3, a.id, a.opacity)),
        notif,
        notch
      };
    }
  };

  // client/src/bot/gaze.js
  var YAW_MAX = 38;
  var PITCH_MAX = 30;
  var PITCH_BASE = 8;
  var SPIN = 360;
  var TURN_TIME = 0.9;
  function lookTarget({ nx, ny, tour = 1, pointer = true }) {
    return {
      yaw: nx * YAW_MAX,
      // Positive pitch looks up, whereas screen Y grows downward
      pitch: PITCH_BASE - ny * PITCH_MAX,
      mix: tour,
      spin: SPIN * (1 - tour),
      wander: pointer ? 0.12 : 1
    };
  }

  // client/src/bot/repere.js
  var RAYON = 100;
  var DEMI_VIEWBOX = 158;

  // extension/src-pacey-entry.js
  var R2 = RAYON;
  var VB = DEMI_VIEWBOX;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var instanceCounter = 0;
  function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== void 0 && v !== null) {
        el.setAttribute(k, String(v));
      }
    }
    return el;
  }
  function mountPacey(container, options = {}) {
    if (!container) return null;
    instanceCounter += 1;
    const maskId = `pacey-ext-mask-${instanceCounter}-${Math.random().toString(36).slice(2, 7)}`;
    let size = options.size || 96;
    let shape = options.shape || DEFAULT_SHAPE;
    let expression = options.expression || "attentif";
    let state = options.state || "idle";
    let follow = options.follow !== false;
    let inverted = Boolean(options.inverted);
    const getInk = () => options.ink || (inverted ? "#FFFFFF" : "#000000");
    const getPaper = () => options.paper || (inverted ? "#000000" : "#FFFFFF");
    const initialRadii = SHAPE_BY_ID.get(shape)?.radii ?? null;
    const initialExpr = EXPRESSION_BY_ID.get(expression) ?? null;
    const engine = new BotEngine(R2, state, initialRadii, initialExpr);
    let clock = 0;
    let pointer = null;
    let gazeOverride = null;
    let aiming = false;
    let turnSince = 0;
    let shakeEnergy = 0;
    let lastShakeTrigger = 0;
    let rafId = 0;
    let lastMs = 0;
    let destroyed = false;
    const svg = createSvgEl("svg", {
      width: size,
      height: size,
      viewBox: `${-VB} ${-VB} ${VB * 2} ${VB * 2}`,
      role: "img",
      "aria-label": options.ariaLabel || "Pacey Algorithmic Companion",
      class: `pl-pacey-svg ${options.className || ""}`.trim()
    });
    svg.style.display = "block";
    svg.style.userSelect = "none";
    svg.style.overflow = "visible";
    const defs = createSvgEl("defs");
    const mask = createSvgEl("mask", {
      id: maskId,
      maskUnits: "userSpaceOnUse",
      x: -VB,
      y: -VB,
      width: VB * 2,
      height: VB * 2
    });
    const maskBodyPath = createSvgEl("path", { fill: "#fff" });
    const maskEyesGroup = createSvgEl("g");
    const maskNotchCircle = createSvgEl("circle", { fill: "#000", r: 0 });
    mask.appendChild(maskBodyPath);
    mask.appendChild(maskEyesGroup);
    mask.appendChild(maskNotchCircle);
    defs.appendChild(mask);
    svg.appendChild(defs);
    const backArcsGroup = createSvgEl("g", { fill: "none", "stroke-linecap": "round" });
    const behindDotsGroup = createSvgEl("g");
    const bodyGroup = createSvgEl("g");
    const paperBodyPath = createSvgEl("path", { fill: getPaper() });
    const maskedInkGroup = createSvgEl("g", { mask: `url(#${maskId})` });
    const inkRect = createSvgEl("rect", {
      x: -VB,
      y: -VB,
      width: VB * 2,
      height: VB * 2,
      fill: getInk()
    });
    maskedInkGroup.appendChild(inkRect);
    bodyGroup.appendChild(paperBodyPath);
    bodyGroup.appendChild(maskedInkGroup);
    const frontDotsGroup = createSvgEl("g");
    const notifCircle = createSvgEl("circle", { r: 0, fill: getInk() });
    const frontArcsGroup = createSvgEl("g", { fill: "none", "stroke-linecap": "round" });
    svg.appendChild(backArcsGroup);
    svg.appendChild(behindDotsGroup);
    svg.appendChild(bodyGroup);
    svg.appendChild(frontDotsGroup);
    svg.appendChild(notifCircle);
    svg.appendChild(frontArcsGroup);
    container.innerHTML = "";
    container.appendChild(svg);
    function renderDotMarkup(dot, ink, paper) {
      const fill = dot.color ?? (dot.depth === void 0 ? ink : mixHex(paper, ink, dot.depth));
      if (dot.d) {
        return `<path d="${dot.d}" fill="${fill}" opacity="${dot.opacity}" transform="translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R2})" />`;
      }
      return `<circle cx="${dot.x}" cy="${dot.y}" r="${dot.r}" fill="${fill}" opacity="${dot.opacity}" />`;
    }
    function applyFrame(frame) {
      const ink = getInk();
      const paper = getPaper();
      paperBodyPath.setAttribute("fill", paper);
      inkRect.setAttribute("fill", ink);
      maskBodyPath.setAttribute("d", frame.bodyPath);
      paperBodyPath.setAttribute("d", frame.bodyPath);
      bodyGroup.setAttribute("opacity", String(frame.bodyAlpha));
      while (maskEyesGroup.childNodes.length < frame.eyes.length) {
        maskEyesGroup.appendChild(createSvgEl("path", { fill: "#000" }));
      }
      while (maskEyesGroup.childNodes.length > frame.eyes.length) {
        maskEyesGroup.removeChild(maskEyesGroup.lastChild);
      }
      for (let i = 0; i < frame.eyes.length; i++) {
        const eye2 = frame.eyes[i];
        const pathEl = maskEyesGroup.childNodes[i];
        pathEl.setAttribute("d", eye2.d);
        pathEl.setAttribute("transform", eye2.matrix);
        pathEl.setAttribute("opacity", String(eye2.alpha));
      }
      if (frame.notch) {
        maskNotchCircle.setAttribute("cx", String(frame.notch.x));
        maskNotchCircle.setAttribute("cy", String(frame.notch.y));
        maskNotchCircle.setAttribute("r", String(frame.notch.r));
      } else {
        maskNotchCircle.setAttribute("r", "0");
      }
      if (frame.notif) {
        notifCircle.setAttribute("cx", String(frame.notif.x));
        notifCircle.setAttribute("cy", String(frame.notif.y));
        notifCircle.setAttribute("r", String(frame.notif.r));
        notifCircle.setAttribute("fill", ink);
      } else {
        notifCircle.setAttribute("r", "0");
      }
      if (frame.arcs.length === 0) {
        if (backArcsGroup.innerHTML !== "") backArcsGroup.innerHTML = "";
        if (frontArcsGroup.innerHTML !== "") frontArcsGroup.innerHTML = "";
      } else {
        let backHtml = "";
        let frontHtml = "";
        for (const arc of frame.arcs) {
          if (arc.back) {
            backHtml += `<path d="${arc.back}" stroke="${ink}" stroke-width="${arc.width}" opacity="${arc.opacity}" />`;
          }
          if (arc.front) {
            frontHtml += `<path d="${arc.front}" stroke="${paper}" stroke-width="${arc.width + 5}" opacity="${arc.opacity}" />`;
            frontHtml += `<path d="${arc.front}" stroke="${ink}" stroke-width="${arc.width}" opacity="${arc.opacity}" />`;
          }
        }
        backArcsGroup.innerHTML = backHtml;
        frontArcsGroup.innerHTML = frontHtml;
      }
      if (frame.dots.length === 0) {
        if (behindDotsGroup.innerHTML !== "") behindDotsGroup.innerHTML = "";
        if (frontDotsGroup.innerHTML !== "") frontDotsGroup.innerHTML = "";
      } else {
        const dotsHtml = frame.dots.map((d) => renderDotMarkup(d, ink, paper)).join("");
        if (frame.dotsBehind) {
          behindDotsGroup.innerHTML = dotsHtml;
          if (frontDotsGroup.innerHTML !== "") frontDotsGroup.innerHTML = "";
        } else {
          frontDotsGroup.innerHTML = dotsHtml;
          if (behindDotsGroup.innerHTML !== "") behindDotsGroup.innerHTML = "";
        }
      }
    }
    const handlePointerMove = (e) => {
      if (e.pointerType === "touch") return;
      const prev = pointer;
      const next = { x: e.clientX, y: e.clientY, t: performance.now() };
      pointer = next;
      if (prev && options.onRapidMouseShake) {
        const box = svg.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        const dist = Math.hypot(next.x - cx, next.y - cy);
        if (dist < 260) {
          const speed = Math.hypot(next.x - prev.x, next.y - prev.y);
          shakeEnergy = shakeEnergy * 0.88 + speed;
          if (shakeEnergy > 420 && next.t - lastShakeTrigger > 4e3) {
            lastShakeTrigger = next.t;
            shakeEnergy = 0;
            options.onRapidMouseShake();
          }
        }
      }
    };
    const handlePointerLeave = () => {
      pointer = null;
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);
    svg.addEventListener("click", (e) => {
      engine.triggerBlink(clock);
      if (options.onClick) options.onClick(e);
    });
    svg.addEventListener("dblclick", (e) => {
      if (options.onDoubleClick) options.onDoubleClick(e);
    });
    function tick(ms) {
      if (destroyed) return;
      rafId = requestAnimationFrame(tick);
      if (document.visibilityState === "hidden") {
        lastMs = ms;
        return;
      }
      const dt = lastMs ? Math.min((ms - lastMs) / 1e3, 0.064) : 0;
      lastMs = ms;
      clock += dt;
      if (follow) {
        const currentStateDef = STATE_BY_ID.get(engine.state);
        if (!currentStateDef?.baseFace) {
          if (aiming) {
            engine.setLook(null, clock, TURN_TIME);
            aiming = false;
          }
        } else {
          const box = svg.getBoundingClientRect();
          if (box.width > 0 && box.height > 0) {
            if (!aiming) turnSince = clock;
            const halfW = Math.max(160, window.innerWidth * 0.42);
            const halfH = Math.max(140, window.innerHeight * 0.42);
            let targetPt = pointer;
            if (gazeOverride) {
              if (performance.now() < gazeOverride.untilMs) {
                targetPt = { x: gazeOverride.x, y: gazeOverride.y };
              } else {
                gazeOverride = null;
              }
            }
            const nx = targetPt ? clamp((targetPt.x - (box.left + box.width / 2)) / halfW, -1, 1) : 0;
            const ny = targetPt ? clamp((targetPt.y - (box.top + box.height / 2)) / halfH, -1, 1) : 0;
            const tour = easings.easeOutQuint(clamp((clock - turnSince) / TURN_TIME));
            engine.setLook(
              lookTarget({
                nx,
                ny,
                tour,
                pointer: targetPt !== null
              }),
              clock
            );
            aiming = true;
          }
        }
      }
      applyFrame(engine.sample(clock));
    }
    applyFrame(engine.sample(0));
    rafId = requestAnimationFrame(tick);
    return {
      svg,
      setExpression(exprId) {
        if (!EXPRESSION_BY_ID.has(exprId)) return;
        expression = exprId;
        engine.setState("idle", clock);
        state = "idle";
        engine.setExpression(EXPRESSION_BY_ID.get(exprId), clock);
      },
      triggerState(stateId, afterExprId = null) {
        if (!STATE_BY_ID.has(stateId)) return;
        state = stateId;
        engine.setState(stateId, clock);
        if (afterExprId && EXPRESSION_BY_ID.has(afterExprId)) {
          expression = afterExprId;
          engine.setExpression(EXPRESSION_BY_ID.get(afterExprId), clock);
        }
      },
      lookAtPoint(clientX, clientY, holdMs = 2800) {
        if (!aiming) turnSince = clock;
        gazeOverride = {
          x: clientX,
          y: clientY,
          untilMs: performance.now() + holdMs
        };
      },
      lookAtElement(selectorOrEl, holdMs = 3e3) {
        const el = typeof selectorOrEl === "string" ? document.querySelector(selectorOrEl) : selectorOrEl;
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        this.lookAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, holdMs);
        return true;
      },
      clearLookOverride() {
        gazeOverride = null;
      },
      triggerBlink() {
        engine.triggerBlink(clock);
      },
      setInverted(val) {
        inverted = Boolean(val);
      },
      getLabel() {
        if (state !== "idle") {
          return STATE_BY_ID.get(state)?.label || state.toUpperCase();
        }
        return EXPRESSION_BY_ID.get(expression)?.label || expression.toUpperCase();
      },
      getState() {
        return state;
      },
      getExpression() {
        return expression;
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(rafId);
        window.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerleave", handlePointerLeave);
      }
    };
  }
  window.PaceyEngine = {
    mount: mountPacey,
    EXPRESSIONS,
    EXPRESSION_BY_ID,
    STATES,
    STATE_BY_ID
  };
})();
