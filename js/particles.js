import { playFireworksRealSound } from './audio.js';
import { state } from './state.js';

const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let width, height;
let particles = [];
let stars = [];

class Particle {
    constructor(x, y, color, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = color;
        this.alpha = 1;

        if (type === 'firework') {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.gravity = 0.08;
            this.friction = 0.96;
            this.life = 100 + Math.random() * 60;
            this.size = Math.random() * 2 + 1;
            this.decay = Math.random() * 0.015 + 0.005;
        } else {
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5 - 1;
            this.gravity = 0;
            this.friction = 0.98;
            this.life = 50;
            this.size = Math.random() * 2 + 0.5;
            this.decay = 0.03;
        }
    }

    update() {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        this.life--;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;

        if (this.type === 'firework') {
            ctx.beginPath();
            ctx.globalAlpha = Math.max(0, this.alpha * 0.3);
            ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = Math.max(0, this.alpha);
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export function initStars() {
    stars = [];
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.5,
            alpha: Math.random(),
            speed: Math.random() * 0.02
        });
    }
}

export function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    initStars();
}

export function createFireworks(x, y) {
    if (!state.isMuted) playFireworksRealSound();
    const colors = ['#d4af37', '#ffd700', '#ffec8b', '#ffffff', '#e6c200', '#ff4500', '#00ff00', '#00ffff'];

    for (let i = 0; i < 120; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, color, 'firework'));
    }
}

export function addTrail(x, y) {
    particles.push(new Particle(x, y, '#d4af37', 'trail'));
}

export function animate() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        star.alpha += star.speed * (Math.random() > 0.5 ? 1 : -1);
        if (star.alpha < 0) star.alpha = 0;
        if (star.alpha > 0.8) star.alpha = 0.8;
        ctx.globalAlpha = star.alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.alpha <= 0 || p.life <= 0) {
            particles.splice(i, 1);
        }
    }
    requestAnimationFrame(animate);
}
