import React, { useState } from 'react';

/**
 * Pacey — The Official PacedLearner Algorithmic Companion Mascot
 * Renders an animated, ultra-smooth SVG chibi sprite reacting to problem states.
 * 
 * Moods: 'idle' | 'thinking' | 'celebrating' | 'shocked' | 'reminder' | 'sleeping'
 */
export default function PaceyMascot({
  mood = 'idle',
  size = 56,
  interactive = true,
  speechBubble = null,
  onClick = null
}) {
  const [internalMood, setInternalMood] = useState(null);
  const [bounce, setBounce] = useState(false);
  const timerRef = React.useRef(null);
  const bounceTimerRef = React.useRef(null);
  const activeMood = internalMood || mood;

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
    };
  }, []);

  const handleClick = (e) => {
    if (!interactive) return;
    setBounce(true);
    if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
    bounceTimerRef.current = setTimeout(() => setBounce(false), 600);

    const moods = ['celebrating', 'thinking', 'idle'];
    const next = moods[(moods.indexOf(activeMood) + 1) % moods.length];
    setInternalMood(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setInternalMood(null), 3000);
    if (onClick) onClick(e);
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        cursor: interactive ? 'pointer' : 'default',
        userSelect: 'none'
      }}
      onClick={handleClick}
      title="Pacey — Your Algorithmic Companion"
    >
      {/* Speech Bubble (Cyber Terminal format) */}
      {speechBubble && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            marginBottom: '8px',
            background: 'var(--bg-surface-elevated, #101728)',
            border: '1px solid var(--cyber-cyan-border, rgba(0,240,255,0.35))',
            color: 'var(--text-primary, #f0f6fc)',
            padding: '5px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 12px var(--cyber-cyan-glow, rgba(0,240,255,0.25))',
            animation: 'paceyFloat 3s ease-in-out infinite',
            zIndex: 10
          }}
        >
          <span style={{ color: 'var(--cyber-cyan)', marginRight: '6px' }}>&gt; PACEY://</span>
          {speechBubble}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: '5px',
              borderStyle: 'solid',
              borderColor: 'var(--cyber-cyan-border, rgba(0,240,255,0.35)) transparent transparent transparent'
            }}
          />
        </div>
      )}

      {/* SVG Mascot Character */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          overflow: 'visible',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: bounce ? 'scale(1.15) translateY(-6px)' : 'scale(1)'
        }}
        className={`pacey-root pacey-${activeMood}`}
      >
        <defs>
          {/* Coral Body Gradient */}
          <linearGradient id="paceyBodyGrad" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff7b72" />
            <stop offset="50%" stopColor="#f85149" />
            <stop offset="100%" stopColor="#da3633" />
          </linearGradient>

          {/* Soft Belly Gradient */}
          <linearGradient id="paceyBellyGrad" x1="50" y1="45" x2="50" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffebe9" />
            <stop offset="100%" stopColor="#ffdcd7" />
          </linearGradient>

          {/* Golden Bell / Trophy Gradient */}
          <linearGradient id="paceyGoldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>

          {/* Emerald Checkmark Gradient */}
          <linearGradient id="paceyGreenGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <filter id="paceyShadow" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.2" floodColor="#000" />
          </filter>
        </defs>

        <style>
          {`
            @keyframes paceyBob {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-4px) rotate(1deg); }
            }
            @keyframes paceyCheer {
              0%, 100% { transform: translateY(0px) scale(1); }
              50% { transform: translateY(-8px) scale(1.05); }
            }
            @keyframes paceyTremble {
              0%, 100% { transform: translate(0, 0); }
              20% { transform: translate(-2px, 1px); }
              40% { transform: translate(2px, -1px); }
              60% { transform: translate(-1px, -1px); }
              80% { transform: translate(1px, 1px); }
            }
            @keyframes paceyRinging {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(-12deg); }
              75% { transform: rotate(12deg); }
            }
            @keyframes paceyBlinkEye {
              0%, 90%, 100% { transform: scaleY(1); }
              95% { transform: scaleY(0.1); }
            }
            @keyframes paceyFloat {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-5px); }
            }
            @keyframes paceyConfetti {
              0% { opacity: 1; transform: translateY(0) rotate(0deg); }
              100% { opacity: 0; transform: translateY(-16px) rotate(45deg); }
            }
            .pacey-idle, .pacey-thinking {
              animation: paceyBob 3.2s ease-in-out infinite;
            }
            .pacey-celebrating {
              animation: paceyCheer 0.8s ease-in-out infinite;
            }
            .pacey-shocked {
              animation: paceyTremble 0.25s linear infinite;
            }
            .pacey-eye-blink {
              transform-origin: 50% 50%;
              animation: paceyBlinkEye 4s infinite;
            }
            .pacey-bell-ring {
              transform-origin: 50% 10%;
              animation: paceyRinging 0.5s ease-in-out infinite;
            }
          `}
        </style>

        {/* Holographic Emitter Rings & Floating Shadow */}
        <ellipse cx="50" cy="92" rx="28" ry="6" fill="none" stroke="var(--cyber-cyan, #00f0ff)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        <ellipse cx="50" cy="92" rx="20" ry="4" fill="rgba(0, 240, 255, 0.08)" />
        <ellipse cx="50" cy="92" rx="14" ry="3" fill="rgba(0,0,0,0.25)" />

        {/* Group containing Pacey body */}
        <g filter="url(#paceyShadow)">
          {/* Main Round Chibi Body */}
          <path
            d="M50 14 C28 14 20 34 20 54 C20 74 30 86 50 86 C70 86 80 74 80 54 C80 34 72 14 50 14 Z"
            fill="url(#paceyBodyGrad)"
          />

          {/* Cute Soft Cream Belly */}
          <ellipse cx="50" cy="62" rx="20" ry="18" fill="url(#paceyBellyGrad)" opacity="0.9" />

          {/* Cybernetic Holographic HUD Visor */}
          <g opacity="0.88">
            <rect x="25" y="38" width="50" height="13" rx="3" fill="rgba(0, 240, 255, 0.12)" stroke="var(--cyber-cyan, #00f0ff)" strokeWidth="1.2" />
            <line x1="27" y1="44.5" x2="73" y2="44.5" stroke="var(--cyber-cyan, #00f0ff)" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.75" />
            <circle cx="29" cy="44.5" r="1.2" fill="var(--cyber-green, #00ff66)" />
            <circle cx="71" cy="44.5" r="1.2" fill="var(--cyber-magenta, #ff007f)" />
          </g>

          {/* Soft Blush Cheeks */}
          <ellipse cx="29" cy="56" rx="5" ry="3" fill="#fb7185" opacity="0.6" />
          <ellipse cx="71" cy="56" rx="5" ry="3" fill="#fb7185" opacity="0.6" />

          {/* Small Feet */}
          <ellipse cx="36" cy="86" rx="7" ry="4" fill="#da3633" />
          <ellipse cx="64" cy="86" rx="7" ry="4" fill="#da3633" />

          {/* Hands / Arms */}
          {activeMood === 'celebrating' ? (
            // Raised Joyful Arms
            <g>
              <path d="M22 48 Q10 32 16 26 Q24 28 26 44" fill="#f85149" />
              <path d="M78 48 Q90 32 84 26 Q76 28 74 44" fill="#f85149" />
            </g>
          ) : activeMood === 'thinking' ? (
            // Hand touching chin
            <g>
              <path d="M22 52 Q18 64 26 66 Q28 60 26 52" fill="#f85149" />
              <path d="M78 52 Q66 58 58 56 Q56 50 66 48" fill="#f85149" />
            </g>
          ) : activeMood === 'shocked' ? (
            // Hands on head in shock
            <g>
              <path d="M22 46 Q16 30 28 26 Q32 30 26 46" fill="#f85149" />
              <path d="M78 46 Q84 30 72 26 Q68 30 74 46" fill="#f85149" />
            </g>
          ) : (
            // Resting cute arms
            <g>
              <ellipse cx="21" cy="56" rx="5" ry="7" fill="#f85149" />
              <ellipse cx="79" cy="56" rx="5" ry="7" fill="#f85149" />
            </g>
          )}

          {/* EYES & EXPRESSION BY MOOD */}
          {activeMood === 'celebrating' ? (
            // Happy closed crescent eyes (^_^)
            <g>
              <path d="M32 46 Q40 38 46 46" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <path d="M54 46 Q60 38 68 46" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              {/* Wide open happy mouth */}
              <path d="M42 56 Q50 68 58 56 Z" fill="#991b1b" />
              <ellipse cx="50" cy="62" rx="4" ry="2" fill="#f43f5e" />
            </g>
          ) : activeMood === 'shocked' ? (
            // Wide shocked eyes & mouth
            <g>
              <ellipse cx="38" cy="44" rx="7" ry="8" fill="#ffffff" stroke="#1c1917" strokeWidth="2" />
              <ellipse cx="62" cy="44" rx="7" ry="8" fill="#ffffff" stroke="#1c1917" strokeWidth="2" />
              <circle cx="38" cy="44" r="3" fill="#1c1917" />
              <circle cx="62" cy="44" r="3" fill="#1c1917" />
              {/* Comical sweat drop */}
              <path d="M74 30 Q78 38 74 42 Q70 38 74 30 Z" fill="#38bdf8" />
              {/* Shocked 'O' mouth */}
              <ellipse cx="50" cy="60" rx="4" ry="6" fill="#1c1917" />
            </g>
          ) : activeMood === 'thinking' ? (
            // Inquisitive eyes with glasses
            <g>
              {/* Spectacles */}
              <circle cx="38" cy="44" r="10" stroke="#1c1917" strokeWidth="2" fill="rgba(255,255,255,0.4)" />
              <circle cx="62" cy="44" r="10" stroke="#1c1917" strokeWidth="2" fill="rgba(255,255,255,0.4)" />
              <line x1="48" y1="44" x2="52" y2="44" stroke="#1c1917" strokeWidth="2" />
              {/* Looking up thoughtfully */}
              <circle cx="41" cy="41" r="3.5" fill="#1c1917" />
              <circle cx="65" cy="41" r="3.5" fill="#1c1917" />
              {/* Thinking mouth */}
              <path d="M46 59 Q50 56 54 59" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              {/* Mini lightbulb over head */}
              <g transform="translate(43, -2) scale(0.7)">
                <circle cx="10" cy="10" r="7" fill="#fbbf24" opacity="0.9" />
                <path d="M7 16 H13 V18 H7 Z" fill="#78716c" />
              </g>
            </g>
          ) : (
            // Default Kawaii Glossy Eyes with Blink
            <g className="pacey-eye-blink">
              {/* Left Eye */}
              <circle cx="38" cy="44" r="5.5" fill="#1c1917" />
              <circle cx="36.5" cy="42" r="2" fill="#ffffff" />
              <circle cx="40" cy="46" r="1" fill="#ffffff" />

              {/* Right Eye */}
              <circle cx="62" cy="44" r="5.5" fill="#1c1917" />
              <circle cx="60.5" cy="42" r="2" fill="#ffffff" />
              <circle cx="64" cy="46" r="1" fill="#ffffff" />

              {/* Cute Cat Smile (:3) */}
              <path d="M46 56 Q50 60 54 56" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </g>
          )}

          {/* ACCESSORIES BY MOOD */}
          {activeMood === 'celebrating' && (
            // Green Checkmark Trophy Badge
            <g transform="translate(74, 14)">
              <circle cx="10" cy="10" r="9" fill="url(#paceyGreenGrad)" stroke="#ffffff" strokeWidth="1.5" />
              <path d="M6 10 L9 13 L14 7" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              {/* Confetti Sparks */}
              <circle cx="-6" cy="-4" r="2" fill="#facc15" className="pacey-confetti" />
              <circle cx="22" cy="-2" r="2.5" fill="#38bdf8" className="pacey-confetti" />
              <circle cx="-2" cy="22" r="2" fill="#ec4899" className="pacey-confetti" />
            </g>
          )}

          {activeMood === 'reminder' && (
            // Golden Reminder Bell
            <g className="pacey-bell-ring" transform="translate(68, 52) scale(0.85)">
              <path d="M12 4 Q6 8 6 16 L3 19 H21 L18 16 Q18 8 12 4 Z" fill="url(#paceyGoldGrad)" stroke="#78350f" strokeWidth="1" />
              <circle cx="12" cy="21" r="2" fill="#b45309" />
              {/* Chime waves */}
              <path d="M22 10 Q25 13 22 16" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
