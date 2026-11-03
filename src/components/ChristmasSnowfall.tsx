import React, { useEffect, useRef } from 'react';

interface ChristmasSnowfallProps {
  enabled?: boolean;
  intensity?: 'light' | 'festive' | 'blizzard';
}

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  swaySpeed: number;
  swayAmplitude: number;
  swayAngle: number;
  opacity: number;
  layer: number; // 0: background distant, 1: midground, 2: foreground crystal
  rotation: number;
  rotationSpeed: number;
  isStar?: boolean;
}

export const ChristmasSnowfall: React.FC<ChristmasSnowfallProps> = ({
  enabled = true,
  intensity = 'festive',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Flake count based on intensity
    const flakeCount =
      intensity === 'light' ? 45 : intensity === 'blizzard' ? 175 : 95;

    const flakes: Snowflake[] = [];

    const createFlake = (initialYRandom = false): Snowflake => {
      const layer = Math.random() < 0.5 ? 0 : Math.random() < 0.8 ? 1 : 2;
      const baseRadius = layer === 0 ? 1.2 : layer === 1 ? 2.4 : 3.8;
      const radius = baseRadius + Math.random() * 1.5;
      const isStar = layer === 2 && Math.random() < 0.25;

      return {
        x: Math.random() * width,
        y: initialYRandom ? Math.random() * height : -15,
        radius,
        speedY: (0.6 + Math.random() * 1.2) * (layer === 0 ? 0.7 : layer === 1 ? 1.1 : 1.5),
        speedX: (Math.random() - 0.5) * 0.4,
        swaySpeed: 0.015 + Math.random() * 0.025,
        swayAmplitude: 0.8 + Math.random() * 1.8,
        swayAngle: Math.random() * Math.PI * 2,
        opacity: layer === 0 ? 0.35 + Math.random() * 0.25 : layer === 1 ? 0.65 + Math.random() * 0.25 : 0.85 + Math.random() * 0.15,
        layer,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        isStar,
      };
    };

    // Populate initial field of snow
    for (let i = 0; i < flakeCount; i++) {
      flakes.push(createFlake(true));
    }

    const drawStarFlake = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      r: number,
      rot: number,
      alpha: number
    ) => {
      context.save();
      context.translate(x, y);
      context.rotate(rot);
      context.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      context.lineWidth = 1.2;
      context.beginPath();

      // 6-pointed crystal
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        context.moveTo(0, 0);
        context.lineTo(cos * r * 1.3, sin * r * 1.3);

        // Little branch
        const midX = cos * r * 0.7;
        const midY = sin * r * 0.7;
        const branchAngle1 = angle + Math.PI / 4;
        const branchAngle2 = angle - Math.PI / 4;
        context.moveTo(midX, midY);
        context.lineTo(midX + Math.cos(branchAngle1) * (r * 0.4), midY + Math.sin(branchAngle1) * (r * 0.4));
        context.moveTo(midX, midY);
        context.lineTo(midX + Math.cos(branchAngle2) * (r * 0.4), midY + Math.sin(branchAngle2) * (r * 0.4));
      }
      context.stroke();
      context.restore();
    };

    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 16.67, 2.5); // normalized to 60fps
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < flakes.length; i++) {
        const flake = flakes[i];

        // Physics update
        flake.swayAngle += flake.swaySpeed * delta;
        flake.x += (flake.speedX + Math.sin(flake.swayAngle) * flake.swayAmplitude) * delta;
        flake.y += flake.speedY * delta;
        flake.rotation += flake.rotationSpeed * delta;

        // Wrap around horizontally
        if (flake.x < -20) flake.x = width + 20;
        else if (flake.x > width + 20) flake.x = -20;

        // Recycle if past bottom
        if (flake.y > height + 20) {
          flakes[i] = createFlake(false);
          continue;
        }

        // Render snowflake
        if (flake.isStar) {
          drawStarFlake(ctx, flake.x, flake.y, flake.radius, flake.rotation, flake.opacity);
        } else {
          // Soft radial glow for near snowflakes, sharp dot for distant
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);

          if (flake.layer === 2) {
            // Foreground flake with subtle frosty halo
            const grad = ctx.createRadialGradient(
              flake.x,
              flake.y,
              0,
              flake.x,
              flake.y,
              flake.radius * 1.8
            );
            grad.addColorStop(0, `rgba(255, 255, 255, ${flake.opacity})`);
            grad.addColorStop(0.6, `rgba(224, 247, 250, ${flake.opacity * 0.7})`);
            grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = `rgba(240, 249, 255, ${flake.opacity})`;
          }
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, intensity]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[35] select-none"
      style={{ width: '100vw', height: '100vh' }}
      aria-hidden="true"
    />
  );
};
