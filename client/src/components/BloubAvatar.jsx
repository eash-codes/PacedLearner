import React, { useEffect, useRef, useState, useId } from 'react';
import { BotEngine } from '../bot/engine.js';
import { clamp, easings } from '../bot/math.js';
import { lookTarget, TURN_TIME } from '../bot/gaze.js';
import { DEFAULT_EXPRESSION, EXPRESSION_BY_ID } from '../bot/expressions.js';
import { DEFAULT_SHAPE, SHAPE_BY_ID, mixHex } from '../bot/skins.js';
import { DEMI_VIEWBOX, RAYON } from '../bot/repere.js';
import { STATE_BY_ID } from '../bot/states.js';

const R = RAYON;
const VB = DEMI_VIEWBOX;

/**
 * BloubAvatar — Pure B&W Mathematical SVG Circle Mascot
 * Ported from jeremy-prt/bloub and tailored for PacedLearner's RawBlock B&W UI.
 *
 * Features:
 * - 3D Orthographic Spherical Eye Projection (capsule eyes foreshorten near the limb)
 * - Real SVG <mask> cutouts for the eyes and notification notch
 * - Global 60fps cursor tracking (`follow={true}`) with organic gaze drift & blink calendar
 * - 16 Expressive moods & 15 morphing states
 * - Strictly Monochrome B&W (`ink` & `paper`) with high-contrast orbital ring casing
 */
export default function BloubAvatar({
  size = 96,
  shape = DEFAULT_SHAPE,
  expression = DEFAULT_EXPRESSION,
  state = 'idle',
  follow = true,
  inverted = false,
  ink: customInk,
  paper: customPaper,
  frozenAt,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onRapidMouseShake,
  style,
  className = '',
  ariaLabel = 'Pacey Algorithmic Companion'
}) {
  const rawUid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const maskId = `bloub-mask-${rawUid}`;

  const ink = customInk || (inverted ? '#FFFFFF' : '#000000');
  const paper = customPaper || (inverted ? '#000000' : '#FFFFFF');

  const svgRef = useRef(null);
  const engineRef = useRef(null);
  const clockRef = useRef(0);
  const pointerRef = useRef(null);
  const aimingRef = useRef(false);
  const turnSinceRef = useRef(0);
  const shakeEnergyRef = useRef(0);
  const lastShakeTriggerRef = useRef(0);

  if (!engineRef.current) {
    const initialRadii = SHAPE_BY_ID.get(shape)?.radii ?? null;
    const initialExpr = EXPRESSION_BY_ID.get(expression) ?? null;
    engineRef.current = new BotEngine(R, state, initialRadii, initialExpr);
  }

  const [frame, setFrame] = useState(() =>
    engineRef.current.sample(frozenAt !== undefined ? frozenAt : 0)
  );

  // Sync shape prop
  useEffect(() => {
    const radii = SHAPE_BY_ID.get(shape)?.radii ?? null;
    engineRef.current.setShape(radii, clockRef.current);
    if (frozenAt !== undefined) {
      setFrame(engineRef.current.sample(frozenAt));
    }
  }, [shape, frozenAt]);

  // Sync expression prop
  useEffect(() => {
    const expr = EXPRESSION_BY_ID.get(expression) ?? null;
    engineRef.current.setExpression(expr, clockRef.current);
    if (frozenAt !== undefined) {
      setFrame(engineRef.current.sample(frozenAt));
    }
  }, [expression, frozenAt]);

  // Sync state prop
  useEffect(() => {
    if (engineRef.current.state !== state) {
      engineRef.current.setState(state, clockRef.current);
      if (frozenAt !== undefined) {
        setFrame(engineRef.current.sample(frozenAt));
      }
    }
  }, [state, frozenAt]);

  // Pointer tracking listener
  useEffect(() => {
    if (!follow || frozenAt !== undefined) {
      pointerRef.current = null;
      if (aimingRef.current) {
        engineRef.current.setLook(null, clockRef.current, TURN_TIME);
        aimingRef.current = false;
      }
      return;
    }

    const handlePointerMove = (e) => {
      if (e.pointerType === 'touch') return;
      const prev = pointerRef.current;
      const next = { x: e.clientX, y: e.clientY, t: performance.now() };
      pointerRef.current = next;

      // Detect rapid cursor shake near the mascot
      if (prev && onRapidMouseShake && svgRef.current) {
        const box = svgRef.current.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        const dist = Math.hypot(next.x - cx, next.y - cy);
        if (dist < 280) {
          const speed = Math.hypot(next.x - prev.x, next.y - prev.y);
          shakeEnergyRef.current = shakeEnergyRef.current * 0.88 + speed;
          if (shakeEnergyRef.current > 420 && next.t - lastShakeTriggerRef.current > 4000) {
            lastShakeTriggerRef.current = next.t;
            shakeEnergyRef.current = 0;
            onRapidMouseShake();
          }
        }
      }
    };

    const handlePointerLeave = () => {
      pointerRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [follow, frozenAt, onRapidMouseShake]);

  // Main 60fps animation loop
  useEffect(() => {
    if (frozenAt !== undefined) {
      setFrame(engineRef.current.sample(frozenAt));
      return;
    }

    let rafId = 0;
    let lastMs = 0;

    const tick = (ms) => {
      rafId = requestAnimationFrame(tick);
      if (document.visibilityState === 'hidden') {
        lastMs = ms;
        return;
      }
      const dt = lastMs ? Math.min((ms - lastMs) / 1000, 0.064) : 0;
      lastMs = ms;
      clockRef.current += dt;
      const clock = clockRef.current;
      const engine = engineRef.current;

      if (follow) {
        const currentStateDef = STATE_BY_ID.get(engine.state);
        if (!currentStateDef?.baseFace) {
          if (aimingRef.current) {
            engine.setLook(null, clock, TURN_TIME);
            aimingRef.current = false;
          }
        } else if (svgRef.current) {
          const box = svgRef.current.getBoundingClientRect();
          if (box.width > 0 && box.height > 0) {
            if (!aimingRef.current) turnSinceRef.current = clock;
            const halfW = Math.max(180, window.innerWidth * 0.42);
            const halfH = Math.max(160, window.innerHeight * 0.42);
            const ptr = pointerRef.current;
            const nx = ptr ? clamp((ptr.x - (box.left + box.width / 2)) / halfW, -1, 1) : 0;
            const ny = ptr ? clamp((ptr.y - (box.top + box.height / 2)) / halfH, -1, 1) : 0;
            const tour = easings.easeOutQuint(clamp((clock - turnSinceRef.current) / TURN_TIME));
            engine.setLook(
              lookTarget({
                nx,
                ny,
                tour,
                pointer: ptr !== null
              }),
              clock
            );
            aimingRef.current = true;
          }
        }
      }

      setFrame(engine.sample(clock));
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [follow, frozenAt]);

  const handleClick = (e) => {
    engineRef.current.triggerBlink(clockRef.current);
    if (onClick) onClick(e);
  };

  const renderDot = (dot, keyPrefix, idx) => {
    const fill =
      dot.color ?? (dot.depth === undefined ? ink : mixHex(paper, ink, dot.depth));
    if (dot.d) {
      return (
        <path
          key={`${keyPrefix}-${idx}`}
          d={dot.d}
          fill={fill}
          opacity={dot.opacity}
          transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})`}
        />
      );
    }
    return (
      <circle
        key={`${keyPrefix}-${idx}`}
        cx={dot.x}
        cy={dot.y}
        r={dot.r}
        fill={fill}
        opacity={dot.opacity}
      />
    );
  };

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}
      role="img"
      aria-label={ariaLabel}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`bloub-avatar-svg ${className}`.trim()}
      style={{
        display: 'block',
        userSelect: 'none',
        overflow: 'visible',
        ...style
      }}
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={-VB}
          y={-VB}
          width={VB * 2}
          height={VB * 2}
        >
          <path d={frame.bodyPath} fill="#fff" />
          {frame.eyes.map((eye, i) => (
            <path
              key={i}
              d={eye.d}
              transform={eye.matrix}
              opacity={eye.alpha}
              fill="#000"
            />
          ))}
          {frame.notch && (
            <circle
              cx={frame.notch.x}
              cy={frame.notch.y}
              r={frame.notch.r}
              fill="#000"
            />
          )}
        </mask>
      </defs>

      {/* Back half of 3D orbits (occluded behind the sphere) */}
      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) =>
          arc.back ? (
            <path
              key={`b-${arc.id}`}
              d={arc.back}
              stroke={ink}
              strokeWidth={arc.width}
              opacity={arc.opacity}
            />
          ) : null
        )}
      </g>

      {/* Burst particles passing behind the core */}
      {frame.dotsBehind && (
        <g>{frame.dots.map((dot, i) => renderDot(dot, 'pb', i))}</g>
      )}

      {/* Main Spherical Body with Masked Eye Cutouts */}
      <g opacity={frame.bodyAlpha}>
        {/* Paper backing so back-arcs don't show through the eye holes */}
        <path d={frame.bodyPath} fill={paper} />
        <g mask={`url(#${maskId})`}>
          <rect x={-VB} y={-VB} width={VB * 2} height={VB * 2} fill={ink} />
        </g>
      </g>

      {/* Foreground dots (thinking dots, exclamation dot) */}
      {!frame.dotsBehind && (
        <g>{frame.dots.map((dot, i) => renderDot(dot, 'pf', i))}</g>
      )}

      {/* Notification badge */}
      {frame.notif && (
        <circle
          cx={frame.notif.x}
          cy={frame.notif.y}
          r={frame.notif.r}
          fill={ink}
        />
      )}

      {/* Front half of 3D orbits — with crisp B&W paper casing so rings slice cleanly across the sphere */}
      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) =>
          arc.front ? (
            <React.Fragment key={`f-${arc.id}`}>
              <path
                d={arc.front}
                stroke={paper}
                strokeWidth={arc.width + 5}
                opacity={arc.opacity}
              />
              <path
                d={arc.front}
                stroke={ink}
                strokeWidth={arc.width}
                opacity={arc.opacity}
              />
            </React.Fragment>
          ) : null
        )}
      </g>
    </svg>
  );
}
