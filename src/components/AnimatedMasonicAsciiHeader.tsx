import React, { useEffect, useRef } from 'react';

interface AnimatedMasonicAsciiHeaderProps {
  className?: string;
  intensity?: 'subtle' | 'medium' | 'vibrant';
}

/**
 * Animated Masonic & Supabase Select-inspired ASCII Banner Background
 * Renders undulating, rhythmic nested brackets, sacred geometric glyphs,
 * and glowing golden/cyan light sweeps across the header canvas.
 */
export const AnimatedMasonicAsciiHeader: React.FC<AnimatedMasonicAsciiHeaderProps> = ({
  className = '',
  intensity = 'medium',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let time = 0;

    const updateSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      
      width = rect.width;
      height = rect.height;
      
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      ctx.scale(dpr, dpr);
    };

    updateSize();
    const resizeObserver = new ResizeObserver(() => updateSize());
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mousePosRef.current.active = false;
    };

    const parentElem = canvas.parentElement;
    if (parentElem) {
      parentElem.addEventListener('mousemove', handleMouseMove);
      parentElem.addEventListener('mouseleave', handleMouseLeave);
    }

    // Bracket hierarchy: [ { < ( [ { <
    const brackets = [
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '<', close: '>' },
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '<', close: '>' },
    ];

    const sacredGlyphs = ['∴', '⟡', '◇', '◈', '✦', ' '];

    const fontSize = 12.5;
    const charWidth = 7.8;
    const lineHeight = 15;

    const render = () => {
      time += 0.022;
      ctx.clearRect(0, 0, width, height);

      const numRows = Math.max(3, Math.ceil(height / lineHeight));
      const numCols = Math.ceil(width / charWidth) + 6;

      ctx.font = `600 ${fontSize}px "JetBrains Mono", "Fira Code", "SF Mono", Menlo, Monaco, Consolas, monospace`;
      ctx.textBaseline = 'middle';

      const mouse = mousePosRef.current;

      // Period / width of each bracket cluster
      const clusterPeriod = 42;

      for (let r = 0; r < numRows; r++) {
        const y = (r + 0.5) * (height / numRows);
        const rowOffset = r * 3.5;
        const rowSpeed = 1 + (r % 2) * 0.15;

        for (let c = 0; c < numCols; c++) {
          const x = c * charWidth;

          // Wave motion shifting bracket center
          const waveShift = Math.sin(time * 1.2 * rowSpeed + (c * 0.06) + r * 0.7) * 4.5;
          const globalPulse = Math.sin(time * 0.7 + r) * 2;

          // Relative position inside the repeating cluster
          const localPos = ((c + Math.floor(waveShift + globalPulse + rowOffset)) % clusterPeriod + clusterPeriod) % clusterPeriod;
          const halfCluster = clusterPeriod / 2;
          const distFromClusterCenter = localPos - halfCluster;

          let char = ' ';
          const depth = Math.floor(Math.abs(distFromClusterCenter));

          if (depth < 1) {
            // Heart of the cluster
            const glyphIdx = Math.floor(Math.abs(Math.sin(time * 0.5 + c * 0.1) * sacredGlyphs.length)) % sacredGlyphs.length;
            char = sacredGlyphs[glyphIdx];
          } else if (depth <= brackets.length) {
            const bracketIdx = (depth - 1) % brackets.length;
            if (distFromClusterCenter < 0) {
              char = brackets[bracketIdx].open;
            } else {
              char = brackets[bracketIdx].close;
            }
          } else {
            // Outer nested repetition
            const bracketIdx = (depth - 1) % brackets.length;
            char = distFromClusterCenter < 0 ? brackets[bracketIdx].open : brackets[bracketIdx].close;
          }

          // Mouse distance for interactive glow
          let mouseDist = 999;
          if (mouse.active) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            mouseDist = Math.sqrt(dx * dx + dy * dy);
          }
          const mouseInfluence = mouse.active ? Math.max(0, 1 - mouseDist / 130) : 0;

          // Horizontal sweep of luminous light
          const sweep = Math.sin(time * 1.8 - (x * 0.007) + r * 0.4) * 0.5 + 0.5;
          const sweepAmber = Math.cos(time * 1.4 + (x * 0.005) - r * 0.3) * 0.5 + 0.5;

          // Base Alpha
          const baseAlpha = intensity === 'vibrant' ? 0.38 : intensity === 'subtle' ? 0.14 : 0.24;
          let alpha = (baseAlpha * (0.35 + 0.65 * sweep)) + (mouseInfluence * 0.45);

          // Edge falloff
          const edgeFade = Math.min(1, Math.min(x / 70, (width - x) / 70));
          alpha *= edgeFade;

          // Color styling matching Masonic dark mode with gold and cyan
          if (mouseInfluence > 0.25 || (sweep > 0.88 && sweepAmber > 0.6)) {
            // Bright Gold Glow
            ctx.fillStyle = `rgba(251, 191, 36, ${Math.min(0.95, alpha * 2.6)})`;
            ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
            ctx.shadowBlur = 5;
          } else if (sweepAmber > 0.72) {
            // Warm Amber
            ctx.fillStyle = `rgba(245, 158, 11, ${alpha * 1.8})`;
            ctx.shadowBlur = 0;
          } else if (sweep > 0.7) {
            // Cyan Accents
            ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 1.5})`;
            ctx.shadowBlur = 0;
          } else {
            // Deep Muted Slate / Bronze
            ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`;
            ctx.shadowBlur = 0;
          }

          ctx.fillText(char, x, y);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (parentElem) {
        parentElem.removeEventListener('mousemove', handleMouseMove);
        parentElem.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [intensity]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* Background canvas rendering animated brackets */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-85 transition-opacity duration-500"
      />

      {/* Subtle ambient light glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-72 h-16 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 w-72 h-16 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Lateral gradient masks for seamless integration */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 via-transparent to-slate-900/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-slate-900/45 pointer-events-none" />
    </div>
  );
};
