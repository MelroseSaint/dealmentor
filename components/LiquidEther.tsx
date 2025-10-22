import React, { useRef, useEffect } from 'react';

interface LiquidEtherProps {
  colors?: string[];
  mouseForce?: number;
  cursorSize?: number;
  isViscous?: boolean;
  viscous?: number;
  iterationsViscous?: number;
  iterationsPoisson?: number;
  resolution?: number;
  isBounce?: boolean;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
  takeoverDuration?: number;
  autoResumeDelay?: number;
  autoRampDuration?: number;
}

const LiquidEther: React.FC<LiquidEtherProps> = ({
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  mouseForce = 20,
  cursorSize = 100,
  isBounce = false,
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  resolution = 0.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // FIX: Initialize useRef with null to provide an initial value, resolving the error.
  const animationFrameId = useRef<number | null>(null);
  const particles = useRef<any[]>([]);
  const mouse = useRef({ x: -9999, y: -9999, isActive: false });
  const autoDemoState = useRef({ angle: 0 });
  const lastInteractionTime = useRef(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const particleCount = Math.floor((width * height) / (2000 / Math.max(0.1, resolution)));

    particles.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      radius: 1 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      originalX: Math.random() * width,
      originalY: Math.random() * height,
    }));

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY, isActive: true };
      lastInteractionTime.current = Date.now();
    };
    
    const handleMouseLeave = () => {
        mouse.current.isActive = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      const isAuto = autoDemo && (Date.now() - lastInteractionTime.current > 2000);

      if (isAuto) {
         autoDemoState.current.angle += 0.001 * autoSpeed;
      }
      
      particles.current.forEach(p => {
        let forceX = 0;
        let forceY = 0;

        if (mouse.current.isActive && !isAuto) {
          const dx = p.x - mouse.current.x;
          const dy = p.y - mouse.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < cursorSize) {
            const angle = Math.atan2(dy, dx);
            const force = (cursorSize - dist) / cursorSize;
            forceX += Math.cos(angle) * force * mouseForce;
            forceY += Math.sin(angle) * force * mouseForce;
          }
        }
        
        if (isAuto) {
            const angle = autoDemoState.current.angle + p.originalX * 0.01;
            forceX += Math.cos(angle) * autoIntensity;
            forceY += Math.sin(angle * 0.8) * autoIntensity;
        }

        // Force to return to original position
        forceX += (p.originalX - p.x) * 0.005;
        forceY += (p.originalY - p.y) * 0.005;

        p.vx += forceX * 0.01;
        p.vy += forceY * 0.01;

        // Damping
        p.vx *= 0.95;
        p.vy *= 0.95;

        p.x += p.vx;
        p.y += p.vy;
        
        if (isBounce) {
            if (p.x < p.radius || p.x > width - p.radius) p.vx *= -1;
            if (p.y < p.radius || p.y > height - p.radius) p.vy *= -1;
        } else {
            if (p.x < -50) p.x = width + 50;
            if (p.x > width + 50) p.x = -50;
            if (p.y < -50) p.y = height + 50;
            if (p.y > height + 50) p.y = -50;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    const resizeObserver = new ResizeObserver(() => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    });
    resizeObserver.observe(canvas);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      resizeObserver.disconnect();
    };
  }, [colors, mouseForce, cursorSize, isBounce, autoDemo, autoSpeed, autoIntensity, resolution]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: 0.3,
        pointerEvents: 'none',
      }}
    />
  );
};

export default LiquidEther;