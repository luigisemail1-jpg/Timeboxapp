import React, { useEffect, useRef } from 'react';

// Full-screen day-change transition: a kraft-paper planet spinning in space,
// in the planner's palette. Mounted briefly by App when the date changes.

const DURATION_MS = 1150;

// Fixed pseudo-random starfield, rendered as one box-shadow
const STARS = Array.from({ length: 46 }, (_, i) => {
  const x = (i * 73 + 17) % 100;
  const y = (i * 37 + 11) % 100;
  const size = i % 3 === 0 ? 2 : 1;
  const alpha = i % 4 === 0 ? 0.85 : 0.4;
  return `${x}vw ${y}vh 0 ${size}px rgba(245,238,223,${alpha})`;
}).join(', ');

export default function DayFlip({ label, onDone }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="day-flip"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes dfIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dfOut { from { opacity: 1; } to { opacity: 0; } }
        .day-flip { animation: dfIn 0.12s ease-out, dfOut 0.28s ease-in 0.87s forwards; }

        /* The zoom-in from the clip */
        @keyframes dfPlanetIn { from { transform: scale(0.78); } to { transform: scale(1); } }
        .day-flip-planet {
          width: 150px; height: 150px;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
          background: #EAC289;                 /* kraft ocean */
          border: 2px solid #F5EEDF;
          animation: dfPlanetIn 1.1s ease-out;
        }

        /* Continents drift across the sphere = rotation */
        @keyframes dfSpin { from { background-position-x: 0; } to { background-position-x: -300px; } }
        .day-flip-land {
          position: absolute; inset: 0;
          background-image:
            radial-gradient(ellipse 52px 34px at 60px 48px,  #B5532A 0 62%, transparent 63%),
            radial-gradient(ellipse 38px 26px at 150px 102px, #6B7F3A 0 62%, transparent 63%),
            radial-gradient(ellipse 30px 42px at 228px 56px,  #B5532A 0 62%, transparent 63%),
            radial-gradient(ellipse 44px 22px at 280px 118px, #6B7F3A 0 62%, transparent 63%),
            radial-gradient(ellipse 24px 16px at 116px 130px, #C28F2C 0 62%, transparent 63%);
          background-size: 300px 150px;
          background-repeat: repeat-x;
          animation: dfSpin 2.6s linear infinite;
        }
        .day-flip-clouds {
          position: absolute; inset: 0;
          background-image:
            radial-gradient(ellipse 56px 12px at 90px 30px,  rgba(245,238,223,0.85) 0 60%, transparent 61%),
            radial-gradient(ellipse 70px 14px at 210px 84px, rgba(245,238,223,0.7) 0 60%, transparent 61%),
            radial-gradient(ellipse 44px 10px at 30px 116px, rgba(245,238,223,0.75) 0 60%, transparent 61%);
          background-size: 300px 150px;
          background-repeat: repeat-x;
          animation: dfSpin 1.9s linear infinite;
        }
        /* Sphere shading on top of everything */
        .day-flip-shade {
          position: absolute; inset: 0;
          border-radius: 50%;
          box-shadow:
            inset -30px -20px 52px rgba(10,10,10,0.6),
            inset 8px 8px 26px rgba(255,255,255,0.22);
        }

        @keyframes dfLabel { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .day-flip-label { animation: dfLabel 0.4s ease-out 0.25s backwards; }
      `}</style>

      <div style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, boxShadow: STARS }} />

      <div className="day-flip-planet">
        <div className="day-flip-land" />
        <div className="day-flip-clouds" />
        <div className="day-flip-shade" />
      </div>

      <div
        className="mono day-flip-label"
        style={{ color: '#F5EEDF', fontSize: 12, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase' }}
      >
        {label}
      </div>
    </div>
  );
}
