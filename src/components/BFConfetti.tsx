import { useEffect, useRef } from 'react';

interface Particle {
 x: number;
 y: number;
 vx: number;
 vy: number;
 size: number;
 color: string;
 rotation: number;
 rotationSpeed: number;
 opacity: number;
}

const COLORS = ['#000000', '#0a0a0a', '#111111', '#C4D600', '#b8c900', '#d4e610'];

export default function BFConfetti() {
 const canvasRef = useRef<HTMLCanvasElement>(null);

 useEffect(() => {
 const canvas = canvasRef.current;
 if (!canvas) return;

 const ctx = canvas.getContext('2d');
 if (!ctx) return;

 let animationId: number;
 let particles: Particle[] = [];

 const resize = () => {
 canvas.width = canvas.offsetWidth;
 canvas.height = canvas.offsetHeight;
 };

 const createParticle = (): Particle => ({
 x: Math.random() * canvas.width,
 y: -20 - Math.random() * 100,
 vx: (Math.random() - 0.5) * 2,
 vy: 1.5 + Math.random() * 3,
 size: 4 + Math.random() * 8,
 color: COLORS[Math.floor(Math.random() * COLORS.length)],
 rotation: Math.random() * Math.PI * 2,
 rotationSpeed: (Math.random() - 0.5) * 0.15,
 opacity: 0.7 + Math.random() * 0.3,
 });

 const init = () => {
 resize();
 particles = Array.from({ length: 60 }, createParticle);
 };

 const update = () => {
 ctx.clearRect(0, 0, canvas.width, canvas.height);

 particles.forEach((p, i) => {
 p.x += p.vx;
 p.y += p.vy;
 p.rotation += p.rotationSpeed;
 p.vy += 0.02; // gravity

 // Reset particle when it falls below canvas
 if (p.y > canvas.height + 20) {
 particles[i] = createParticle();
 }

 ctx.save();
 ctx.translate(p.x, p.y);
 ctx.rotate(p.rotation);
 ctx.globalAlpha = p.opacity;
 ctx.fillStyle = p.color;
 ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
 ctx.restore();
 });

 animationId = requestAnimationFrame(update);
 };

 init();
 update();

 window.addEventListener('resize', resize);

 return () => {
 cancelAnimationFrame(animationId);
 window.removeEventListener('resize', resize);
 };
 }, []);

 return (
 <canvas
 ref={canvasRef}
 className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
 aria-hidden="true"
 style={{ opacity: 0.8 }}
 />
 );
}