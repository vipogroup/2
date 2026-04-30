'use client';

import { useState, useEffect, useMemo } from 'react';

// Floating particle - small white/cyan circles
function Particle({ delay, size, x, y, duration }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        background: `radial-gradient(circle, rgba(255, 255, 255, ${size > 4 ? 0.4 : 0.7}), transparent)`,
        opacity: 0,
        animation: `particleFloat ${duration}s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [phase, setPhase] = useState(0);
  const [strokeProgress, setStrokeProgress] = useState(0);

  const particles = useMemo(() => 
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      delay: Math.random() * 3,
      size: 2 + Math.random() * 4,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 4 + Math.random() * 4,
    }))
  , []);

  useEffect(() => {
    const p1 = setTimeout(() => setPhase(1), 200);
    
    let rafId;
    const startTime = Date.now() + 400;
    const duration = 1800;
    const animateStroke = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 0) { rafId = requestAnimationFrame(animateStroke); return; }
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setStrokeProgress(eased * 100);
      if (progress < 1) rafId = requestAnimationFrame(animateStroke);
    };
    rafId = requestAnimationFrame(animateStroke);

    const p2 = setTimeout(() => setPhase(2), 2400);
    const p3 = setTimeout(() => setPhase(3), 2900);

    const exit = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setIsLoading(false), 600);
    }, 3600);

    return () => {
      clearTimeout(p1); clearTimeout(p2); clearTimeout(p3); clearTimeout(exit);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-all duration-600 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #0e7490 50%, #0891b2 80%, #22d3ee 100%)',
      }}
    >
      {/* Subtle light overlay */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(255,255,255,0.08) 0%, transparent 70%)',
      }} />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map(p => <Particle key={p.id} {...p} />)}
      </div>

      {/* Light sweep */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 60%, transparent 100%)',
        animation: 'lightSweep 3.5s ease-in-out 1s infinite',
      }} />

      {/* Main content */}
      <div className={`relative z-10 text-center transition-all duration-700 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* VIPO text with writing reveal + glossy per-letter */}
        <div className="mb-0 relative" style={{ height: '80px' }}>
          {/* Clip-path reveal left to right */}
          <div className="flex items-center justify-center h-full" dir="ltr" style={{
            clipPath: `inset(0 ${100 - strokeProgress}% 0 0)`,
          }}>
            {/* Not a page heading — avoid stealing H1 from route content (SEO) */}
            <div
              aria-hidden="true"
              className="select-none"
              style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 'clamp(4rem, 16vw, 6rem)',
              lineHeight: 1,
              margin: 0,
              whiteSpace: 'nowrap',
              letterSpacing: '0.08em',
              background: 'linear-gradient(180deg, #ffffff 0%, #e0f2fe 35%, #bae6fd 55%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))',
            }}
            >
              VIPO
            </div>
          </div>

          {/* Writing cursor */}
          {strokeProgress > 2 && strokeProgress < 96 && (
            <div 
              className="absolute w-[3px] h-12 rounded-full"
              style={{
                background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.9), transparent)',
                left: `${strokeProgress * 0.8 + 10}%`,
                top: '50%',
                transform: 'translateY(-50%)',
                boxShadow: '0 0 10px rgba(255,255,255,0.5)',
                transition: 'left 0.06s linear',
              }}
            />
          )}
        </div>

        {/* Elegant thin line */}
        <div className="mx-auto transition-all duration-700 ease-out" style={{
          width: strokeProgress >= 95 ? '80px' : '0px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
        }} />

        {/* Tagline */}
        <div className="mt-5 transition-all duration-700 ease-out" style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(12px)',
        }}>
          <p style={{
            fontFamily: "'Assistant', sans-serif",
            fontWeight: 300,
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.35em',
          }}>
            ביחד ננצח
          </p>
        </div>

        {/* Loading dots */}
        <div className="mt-12 flex justify-center items-center gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/30"
              style={{
                animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes particleFloat {
          0%, 100% { opacity: 0; transform: translateY(0) scale(0.5); }
          30% { opacity: 0.5; }
          50% { opacity: 0.3; transform: translateY(-25px) scale(1); }
          70% { opacity: 0.4; }
        }
        @keyframes lightSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.6); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
