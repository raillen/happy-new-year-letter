// LÓGICA DE PERSONALIZAÇÃO MIGRADA PARA loadCustomization()

/**
 * LÓGICA DE INTERAÇÃO (ENVELOPE E 3D)
 */
const scene = document.getElementById('scene');
const envelope = document.getElementById('envelope');
const letterPreview = document.getElementById('letter-preview');
const readingOverlay = document.getElementById('reading-overlay');
const closeLetterBtn = document.getElementById('close-letter');
const hintText = document.getElementById('hint-text');

let isOpen = false;
let fireworksInterval;
let sceneScale = 1; // Zoom do envelope
let sceneRotateX = 0;
let sceneRotateY = 0;

// Helper para aplicar transformações (Combina Rotação + Escala)
function updateSceneTransform() {
    scene.style.transform = `scale(${sceneScale}) rotateX(${sceneRotateX}deg) rotateY(${sceneRotateY}deg)`;
}

// 3D Parallax Effect
document.addEventListener('mousemove', (e) => {
    if (isOpen && readingOverlay.classList.contains('active')) return;

    // Remove animação idle
    if (scene.classList.contains('is-floating')) {
        scene.classList.remove('is-floating');
    }

    const x = (window.innerWidth / 2 - e.pageX) / 20;
    const y = (window.innerHeight / 2 - e.pageY) / 20;

    sceneRotateX = Math.max(-25, Math.min(25, y));
    sceneRotateY = Math.max(-25, Math.min(25, -x));

    updateSceneTransform();

    // Atualiza foil
    const foil = document.getElementById('foil-layer');
    if (foil) {
        foil.style.backgroundPosition = `${(e.pageX / window.innerWidth) * 100}% ${(e.pageY / window.innerHeight) * 100}%`;
        foil.style.opacity = '1';
    }
});

// Zoom no Envelope (Scroll)
document.addEventListener('wheel', (e) => {
    if (!isOpen) { // Só funciona se não estiver lendo a carta
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        sceneScale = Math.min(2, Math.max(0.5, sceneScale + delta)); // Limites 0.5x a 2x
        updateSceneTransform();
    }
}, { passive: false });

// Zoom no Envelope (Mobile Pinch)
let initialPinchDistance = null;
let initialScale = 1;

document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2 && !isOpen) {
        initialPinchDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
        initialScale = sceneScale;
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && !isOpen && initialPinchDistance) {
        e.preventDefault(); // Evita zoom da página
        const currentDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );

        const scaleFactor = currentDistance / initialPinchDistance;
        sceneScale = Math.min(2, Math.max(0.5, initialScale * scaleFactor));
        updateSceneTransform();
    }
}, { passive: false });

document.addEventListener('touchend', () => {
    initialPinchDistance = null;
});

// Suporte a Giroscópio
if (window.DeviceOrientationEvent && 'ontouchstart' in window) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // ... (lógica de permissão ignorada por simplicidade aqui)
    } else {
        window.addEventListener('deviceorientation', (e) => {
            if (isOpen && readingOverlay.classList.contains('active')) return;
            if (e.beta === null || e.gamma === null) return;

            sceneRotateX = Math.min(30, Math.max(-30, e.beta - 45));
            sceneRotateY = Math.min(30, Math.max(-30, e.gamma));

            updateSceneTransform();
        });
    }
}

// Abrir Envelope
scene.addEventListener('click', () => {
    if (!isOpen) {
        initAudio();
        if (!isMuted) bgMusic.play().catch(() => { }); // Tenta tocar música se não estiver mudo
        isOpen = true;
        scene.classList.add('is-open');
        scene.classList.remove('is-floating'); // Garante remoção ao abrir
        hintText.style.opacity = '0';
        playPaperSound();
        createFireworks(window.innerWidth / 2, window.innerHeight / 3);
    }
});

// Variável fireworksInterval movida para o topo

// Abrir Carta (Zoom)
letterPreview.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) {
        readingOverlay.classList.add('active');
        // Reset zoom state
        zoomLevel = 1;
        updateZoom();

        // Fogos iniciais
        createFireworks(window.innerWidth * 0.2, window.innerHeight * 0.3);
        setTimeout(() => createFireworks(window.innerWidth * 0.8, window.innerHeight * 0.4), 400);

        // Loop contínuo de fogos enquanto a carta estiver aberta
        // Garante que limpa qualquer anterior
        if (fireworksInterval) clearInterval(fireworksInterval);
        fireworksInterval = setInterval(() => {
            // Posição aleatória, evitando levemente o centro absoluto onde está o texto
            const y = Math.random() * (window.innerHeight * 0.6); // Mais na parte superior
            createFireworks(x, y);
        }, 1200); // A cada 1.2 segundos

        // Inicia efeito Typewriter na carta
        startTypewriter();
    }
});

// LÓGICA DE FECHAMENTO (RESET TOTAL)
const closeAction = () => {
    // Para os fogos
    if (fireworksInterval) clearInterval(fireworksInterval);

    // Fecha o Overlay de Leitura
    readingOverlay.classList.remove('active');

    // Reseta o Envelope (Fecha tudo e guarda a carta)
    if (isOpen) {
        isOpen = false;
        scene.classList.remove('is-open'); // Inicia animação de volta ao envelope

        // Mostra o texto de ajuda novamente após a animação
        setTimeout(() => {
            if (!isOpen) hintText.style.opacity = '0.7';
        }, 800);
    }
};

closeLetterBtn.addEventListener('click', closeAction);

// Fecha clicando fora da carta (NOVA LÓGICA DE ZOOM)
readingOverlay.addEventListener('click', (e) => {
    // Verifica se clicou no fundo (overlay ou container do zoom)
    if (e.target === readingOverlay || e.target.id === 'zoom-container') {

        // Se o zoom estiver grande (> 1.1), apenas reseta o zoom para o padrão
        if (zoomLevel > 1.1) {
            zoomLevel = 1;
            updateZoom();
        } else {
            // Se estiver em zoom-out (normal ou pequeno), fecha tudo e volta pro envelope
            closeAction();
        }
    }
});

/**
 * LÓGICA DE ZOOM
 */
const zoomSlider = document.getElementById('zoom-slider');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const fullLetterContent = document.getElementById('full-letter-content');
let zoomLevel = 1;

function updateZoom() {
    fullLetterContent.style.transform = `scale(${zoomLevel})`;
    zoomSlider.value = zoomLevel;
}

zoomSlider.addEventListener('input', (e) => {
    zoomLevel = parseFloat(e.target.value);
    fullLetterContent.style.transform = `scale(${zoomLevel})`;
});

zoomInBtn.addEventListener('click', () => {
    if (zoomLevel < 1.5) {
        zoomLevel = Math.min(1.5, zoomLevel + 0.1);
        updateZoom();
    }
});

zoomOutBtn.addEventListener('click', () => {
    if (zoomLevel > 0.5) {
        zoomLevel = Math.max(0.5, zoomLevel - 0.1);
        updateZoom();
    }
});

// Zoom com roda do mouse
readingOverlay.addEventListener('wheel', (e) => {
    if (readingOverlay.classList.contains('active')) {
        e.preventDefault(); // Evita scroll da página
        if (e.deltaY < 0) { // Scroll Up (Zoom In)
            if (zoomLevel < 1.5) {
                zoomLevel = Math.min(1.5, zoomLevel + 0.05);
            }
        } else { // Scroll Down (Zoom Out)
            if (zoomLevel > 0.5) {
                zoomLevel = Math.max(0.5, zoomLevel - 0.05);
            }
        }
        updateZoom();
    }
}, { passive: false });


/**
 * LÓGICA DE ÁUDIO (HTML5 + Web Audio)
 */
let bgMusic = new Audio('assets/christmas-song.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.4;

let fireworksSfx = new Audio('assets/fireworks-sfx.mp3');
fireworksSfx.volume = 0.6;
let activeSfx = [];

let isMuted = false; // Começa com som "ligado" (estado visual)
const audioBtn = document.getElementById('audio-btn');
const iconSpeaker = document.getElementById('icon-speaker');

// Configura ícone inicial como ligado
iconSpeaker.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
audioBtn.style.opacity = '1';

// Toggle Audio
audioBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    toggleMuteState();
});

function toggleMuteState() {
    if (isMuted) {
        iconSpeaker.innerHTML = '<line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4M9 9L5 5H2v6h3l4 4"></path>';
        audioBtn.style.opacity = '0.5';
        bgMusic.pause();
        // Para todos os sfx ativos imediatamente
        activeSfx.forEach(sfx => {
            try { sfx.pause(); sfx.currentTime = 0; } catch (e) { }
        });
        activeSfx = [];
    } else {
        iconSpeaker.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
        audioBtn.style.opacity = '1';
        // Tenta tocar apenas se tiver interação prévia, senão será tratado no click do envelope
        bgMusic.play().catch(() => console.log("Aguardando interação para tocar música"));
    }
}

// Som de Papel (Sintetizado simples mantido para interação rápida)
// Ou poderíamos usar arquivo se o usuário tivesse fornecido, mas vamos manter sintetizado para esse som curto
let audioCtx;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playPaperSound() {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Ruído branco simulado com osciladores randômicos (simplificado)
    // Para simplificar e evitar complexidade de buffer de ruído aqui, 
    // vamos usar um som de "slide" suave
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(t + 0.3);
}

function playFireworksRealSound() {
    if (isMuted) return;
    const sfx = fireworksSfx.cloneNode();
    sfx.volume = 0.5;

    // Rastreia o som
    activeSfx.push(sfx);
    sfx.onended = () => {
        // Remove do array quando acabar
        const idx = activeSfx.indexOf(sfx);
        if (idx > -1) activeSfx.splice(idx, 1);
    };

    sfx.play().catch(() => { });
}

/**
 * LÓGICA DO CANVAS (PARTÍCULAS, FOGOS HQ, MOUSE TRAIL)
 */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let width, height;
let particles = [];
let stars = [];

function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    initStars();
}

window.addEventListener('resize', resizeCanvas);

// Estrelas de fundo
function initStars() {
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

// Classe de Partícula HQ
class Particle {
    constructor(x, y, color, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = color;
        this.alpha = 1;

        if (type === 'firework') {
            const angle = Math.random() * Math.PI * 2;
            // Velocidade explosiva
            const speed = Math.random() * 6 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.gravity = 0.08;
            this.friction = 0.96; // Air resistance
            this.life = 100 + Math.random() * 60;
            this.size = Math.random() * 2 + 1;
            this.decay = Math.random() * 0.015 + 0.005;
        } else {
            // Trail suave
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

        // Renderização Simples e Robusta
        ctx.fillStyle = this.color;

        // Efeito de brilho manual (desenhar maior com alpha menor atrás) se for fogo
        if (this.type === 'firework') {
            // Glow fake simples: desenha círculo maior translúcido atrás
            ctx.beginPath();
            ctx.globalAlpha = Math.max(0, this.alpha * 0.3);
            ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Restaura alpha para o núcleo
            ctx.globalAlpha = Math.max(0, this.alpha);
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

function createFireworks(x, y) {
    if (!isMuted) playFireworksRealSound();

    // Paleta Festiva Premium
    const colors = ['#d4af37', '#ffd700', '#ffec8b', '#ffffff', '#e6c200', '#ff4500', '#00ff00', '#00ffff']; // Mais cores

    // Explosão principal
    for (let i = 0; i < 120; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, color, 'firework'));
    }
}

// Mouse Trail
let lastMouseX = 0, lastMouseY = 0;
document.addEventListener('mousemove', (e) => {
    const dist = Math.hypot(e.clientX - lastMouseX, e.clientY - lastMouseY);
    if (dist > 5) {
        particles.push(new Particle(e.clientX, e.clientY, '#d4af37', 'trail'));
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    particles.push(new Particle(touch.clientX, touch.clientY, '#d4af37', 'trail'));
});

function animate() {
    // Rastro clean (limpar com pouca opacidade cria motion blur, mas queremos clean premium)
    ctx.clearRect(0, 0, width, height);

    // Desenhar Estrelas (Fundo estático)
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

    // Atualizar Partículas
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

resizeCanvas();
animate();
// Forçar click inicial para destravar audio context se user interagir
// audioBtn.click(); // Comentado para não auto-tocar e assustar, user tem que clicar explícito

/**
 * --- MODO CRIADOR & PERSONALIZAÇÃO (LINK GENERATOR) ---
 */
const creatorModal = document.getElementById('creator-modal');
const openCreatorBtn = document.getElementById('open-creator-btn');
const closeCreatorBtn = document.getElementById('close-creator-btn');
const generateBtn = document.getElementById('generate-btn');
const inputName = document.getElementById('input-name');
const inputMsg = document.getElementById('input-msg');
const inputColor = document.getElementById('input-color');
const inputBadge = document.getElementById('input-badge');
const resultArea = document.getElementById('result-area');
const shareLinkInput = document.getElementById('share-link');
const copyBtn = document.getElementById('copy-btn');
const whatsappBtn = document.getElementById('whatsapp-btn');
const colorHexDisplay = document.getElementById('color-hex');

// Abrir Modal
openCreatorBtn.addEventListener('click', () => {
    creatorModal.classList.add('active');
});

// Fechar Modal
closeCreatorBtn.addEventListener('click', () => {
    creatorModal.classList.remove('active');
});

// Atualizar Hex Display e Background Temporário
inputColor.addEventListener('input', (e) => {
    const c = e.target.value;
    colorHexDisplay.innerText = c;
    updateBodyBackground(c); // Preview em tempo real
});

// Helper para mudar background com gradiente
function updateBodyBackground(hex) {
    // Radial gradient: Centro com a cor escolhida (muito escura) -> Bordas quase pretas
    document.body.style.background = `radial-gradient(circle at center, color-mix(in srgb, ${hex}, black 60%) 0%, #090a0f 100%)`;
}

// Gerar Link
generateBtn.addEventListener('click', () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();

    if (inputName.value.trim()) params.set('n', inputName.value.trim());
    if (inputMsg.value.trim()) params.set('m', inputMsg.value.trim());
    if (inputColor.value !== '#1c2b45') params.set('c', inputColor.value); // Só salva se mudar do padrão
    if (inputBadge.value.trim() !== '26') params.set('d', inputBadge.value.trim()); // Só salva se mudar

    const finalLink = `${baseUrl}?${params.toString()}`;

    // Mostra Resultado
    shareLinkInput.value = finalLink;
    resultArea.classList.remove('hidden');

    // Configura WhatsApp
    const waText = `Um convite especial para você: ${finalLink}`;
    whatsappBtn.onclick = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
    };
});

// Copiar Link
copyBtn.addEventListener('click', () => {
    shareLinkInput.select();
    document.execCommand('copy');
    copyBtn.innerText = 'Copiado!';
    setTimeout(() => copyBtn.innerText = 'Copiar', 2000);
});

// Doação PIX
const pixBtn = document.getElementById('pix-btn');
const pixMsg = document.getElementById('pix-copied-msg');

if (pixBtn) {
    pixBtn.addEventListener('click', () => {
        const key = pixBtn.getAttribute('data-key');
        navigator.clipboard.writeText(key).then(() => {
            pixMsg.classList.add('visible');
            setTimeout(() => pixMsg.classList.remove('visible'), 2000);
        });
    });
}

/**
 * LÓGICA DE CARREGAMENTO (LEITURA DA URL)
 */
function loadCustomization() {
    const params = new URLSearchParams(window.location.search);

    // 1. Nome (Título)
    const n = params.get('n') || params.get('nome'); // Suporte a legacy ?nome=
    if (n) {
        document.getElementById('recipient-title').innerText = `Feliz Ano Novo, ${n}!`;
        document.title = `Para ${n} - Feliz Ano Novo`;
        // Preenche input do criador também
        inputName.value = n;
    }

    // 2. Mensagem Personalizada
    const m = params.get('m');
    if (m) {
        // Substitui o conteúdo da carta
        const fullLetterP = document.querySelector('.full-letter p');
        fullLetterP.innerText = m;
        // Atualiza preview (opcional, pega os primeiros 100 chars)
        document.querySelector('.letter-body-preview').innerText = m.substring(0, 80) + '...';
    }

    // 3. Cor do Envelope
    const c = params.get('c');
    if (c) {
        document.documentElement.style.setProperty('--envelope-color', c);
        document.documentElement.style.setProperty('--envelope-flap-color', adjustColorBrightness(c, 10));
        inputColor.value = c;
        colorHexDisplay.innerText = c;
        updateBodyBackground(c); // Sincroniza o fundo
    }

    // 4. Badge Data
    const d = params.get('d');
    if (d) {
        document.querySelector('.wax-seal').innerText = d.substring(0, 3);
        inputBadge.value = d;
    }
}

// Helper para escurecer/clarear cor Hex
function adjustColorBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// Inicializa Customização
loadCustomization();

// Inicia animação idle para chamar atenção
scene.classList.add('is-floating');

// Inicia Countdown
startCountdown();

/**
 * FUNÇÕES DE POLIMENTO (TYPEWRITER & COUNTDOWN)
 */
function startTypewriter() {
    const p = document.querySelector('.full-letter p');
    if (p.dataset.typed === 'true') return; // Já digitou

    // Texto original (salvo ou do HTML)
    const originalText = p.innerText;
    p.innerText = '';
    p.classList.add('typing-cursor');

    let i = 0;
    const speed = 30; // ms por letra

    function type() {
        if (i < originalText.length) {
            p.innerText += originalText.charAt(i);
            i++;
            // Scroll automático se necessário (para textos longos)
            // p.scrollTop = p.scrollHeight; 
            setTimeout(type, speed);
        } else {
            p.classList.remove('typing-cursor');
            p.dataset.typed = 'true';
        }
    }

    // Pequeno delay para começar
    setTimeout(type, 500);
}

function startCountdown() {
    const container = document.getElementById('countdown-container');

    // Data alvo: Próximo Ano Novo (01/01/Ano+1)
    const now = new Date();
    let nextYear = now.getFullYear() + 1;
    // Se hoje for 1 de Jan, conta para o próximo? Ou celebra?
    // Vamos assumir sempre o próximo 1 de Jan.

    const targetDate = new Date(`Jan 1, ${nextYear} 00:00:00`).getTime();

    function update() {
        const current = new Date().getTime();
        const diff = targetDate - current;

        if (diff <= 0) {
            container.innerHTML = '<span style="font-size:1.5em; font-weight:bold;">🎉 Feliz Ano Novo!</span>';
            container.style.opacity = '1';
            return;
        }

        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        container.innerHTML = `
            <div class="countdown-unit"><span class="countdown-number">${d}</span><span class="countdown-label">Dias</span></div>
            <div class="countdown-unit"><span class="countdown-number">${h}</span><span class="countdown-label">Hrs</span></div>
            <div class="countdown-unit"><span class="countdown-number">${m}</span><span class="countdown-label">Min</span></div>
            <div class="countdown-unit"><span class="countdown-number">${s}</span><span class="countdown-label">Seg</span></div>
        `;

        container.style.opacity = '1';
    }

    setInterval(update, 1000);
    update(); // Chamada inicial
}
