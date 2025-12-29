import { state } from './state.js';
import { initAudio, toggleMuteState, playBgMusic, playPaperSound } from './audio.js';
import { resizeCanvas, animate, createFireworks, addTrail } from './particles.js';
import { startTypewriter, startCountdown, loadCustomization } from './ui.js';
import { updateBodyBackground } from './utils.js';

// Elementos DOM
const scene = document.getElementById('scene');
const letterPreview = document.getElementById('letter-preview');
const readingOverlay = document.getElementById('reading-overlay');
const closeLetterBtn = document.getElementById('close-letter');
const hintText = document.getElementById('hint-text');
const audioBtn = document.getElementById('audio-btn');
const iconSpeaker = document.getElementById('icon-speaker');
const creatorModal = document.getElementById('creator-modal');
const openCreatorBtn = document.getElementById('open-creator-btn');
const closeCreatorBtn = document.getElementById('close-creator-btn');
const generateBtn = document.getElementById('generate-btn');
const fullLetterContent = document.getElementById('full-letter-content');
const zoomSlider = document.getElementById('zoom-slider');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');

// --- CENA & INTERAÇÃO ---

// Scene Transform Helper
function updateSceneTransform() {
    scene.style.transform = `scale(${state.sceneScale}) rotateX(${state.sceneRotateX}deg) rotateY(${state.sceneRotateY}deg)`;
}

// Parallax & Foil
document.addEventListener('mousemove', (e) => {
    if (state.isOpen && readingOverlay.classList.contains('active')) return;

    if (scene.classList.contains('is-floating')) {
        scene.classList.remove('is-floating');
    }

    const x = (window.innerWidth / 2 - e.pageX) / 20;
    const y = (window.innerHeight / 2 - e.pageY) / 20;

    state.sceneRotateX = Math.max(-25, Math.min(25, y));
    state.sceneRotateY = Math.max(-25, Math.min(25, -x));

    updateSceneTransform();

    const foil = document.getElementById('foil-layer');
    if (foil) {
        foil.style.backgroundPosition = `${(e.pageX / window.innerWidth) * 100}% ${(e.pageY / window.innerHeight) * 100}%`;
        foil.style.opacity = '1';
    }

    // Passa para particles trail
    // (Pode ser passado via listener no particles.js tambem, mas centralizamos aqui pra limpeza)
});

// Particles Mouse Trail Hook (Separado do listener de cima pra clareza)
let lastMouseX = 0, lastMouseY = 0;
document.addEventListener('mousemove', (e) => {
    const dist = Math.hypot(e.clientX - lastMouseX, e.clientY - lastMouseY);
    if (dist > 5) {
        addTrail(e.clientX, e.clientY);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

// Envelope Zoom (Scroll)
document.addEventListener('wheel', (e) => {
    if (!state.isOpen) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        state.sceneScale = Math.min(2, Math.max(0.5, state.sceneScale + delta));
        updateSceneTransform();
    }
}, { passive: false });

// Envelope Zoom (Pinch)
let initialPinchDistance = null;
let initialScale = 1;
document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2 && !state.isOpen) {
        initialPinchDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        initialScale = state.sceneScale;
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && !state.isOpen && initialPinchDistance) {
        e.preventDefault();
        const currentDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        const scaleFactor = currentDistance / initialPinchDistance;
        state.sceneScale = Math.min(2, Math.max(0.5, initialScale * scaleFactor));
        updateSceneTransform();
    }
    // Also particles trail
    if (e.touches[0]) addTrail(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

document.addEventListener('touchend', () => { initialPinchDistance = null; });

// Abrir Envelope
if (scene) {
    scene.addEventListener('click', () => {
        if (!state.isOpen) {
            initAudio();
            playBgMusic();
            state.isOpen = true;
            scene.classList.add('is-open');
            scene.classList.remove('is-floating');
            if (hintText) hintText.style.opacity = '0';
            playPaperSound();
            createFireworks(window.innerWidth / 2, window.innerHeight / 3);
        }
    });
}

// Abrir Carta
if (letterPreview) {
    letterPreview.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.isOpen) {
            readingOverlay.classList.add('active');
            updateLetterZoom(1);

            createFireworks(window.innerWidth * 0.2, window.innerHeight * 0.3);
            setTimeout(() => createFireworks(window.innerWidth * 0.8, window.innerHeight * 0.4), 400);

            if (state.fireworksInterval) clearInterval(state.fireworksInterval);
            state.fireworksInterval = setInterval(() => {
                const y = Math.random() * (window.innerHeight * 0.6);
                const x = Math.random() * window.innerWidth;
                createFireworks(x, y);
            }, 1200);

            startTypewriter();
        }
    });
}

// Fechar / Reset
const closeAction = () => {
    if (state.fireworksInterval) clearInterval(state.fireworksInterval);
    if (readingOverlay) readingOverlay.classList.remove('active');
    if (state.isOpen) {
        state.isOpen = false;
        if (scene) scene.classList.remove('is-open');
        setTimeout(() => { if (!state.isOpen && hintText) hintText.style.opacity = '0.7'; }, 800);
    }
};

if (closeLetterBtn) closeLetterBtn.addEventListener('click', closeAction);

if (readingOverlay) {
    readingOverlay.addEventListener('click', (e) => {
        if (e.target === readingOverlay || e.target.id === 'zoom-container') {
            if (state.zoomLevel > 1.1) updateLetterZoom(1);
            else closeAction();
        }
    });
}

// --- ZOOM LOGIC (CARTA) ---
function updateLetterZoom(newLevel) {
    if (newLevel !== undefined) state.zoomLevel = newLevel;
    fullLetterContent.style.transform = `scale(${state.zoomLevel})`;
    if (zoomSlider) zoomSlider.value = state.zoomLevel;
}

function adjustLetterZoom(delta) {
    const newZoom = state.zoomLevel + delta;
    if (newZoom >= 0.5 && newZoom <= 1.5) updateLetterZoom(newZoom);
}

if (zoomInBtn) zoomInBtn.addEventListener('click', () => adjustLetterZoom(0.1));
if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => adjustLetterZoom(-0.1));
if (zoomSlider) zoomSlider.addEventListener('input', (e) => updateLetterZoom(parseFloat(e.target.value)));

readingOverlay.addEventListener('wheel', (e) => {
    if (readingOverlay.classList.contains('active')) {
        e.preventDefault();
        adjustLetterZoom(e.deltaY < 0 ? 0.05 : -0.05);
    }
}, { passive: false });

// --- AUDIO UI ---
audioBtn.addEventListener('click', () => {
    state.isMuted = !state.isMuted;
    toggleMuteState(iconSpeaker, audioBtn);
});

// --- CREATOR MODAL ---
if (openCreatorBtn) openCreatorBtn.addEventListener('click', () => creatorModal.classList.add('active'));
if (closeCreatorBtn) closeCreatorBtn.addEventListener('click', () => creatorModal.classList.remove('active'));

const inputColor = document.getElementById('input-color');
if (inputColor) {
    inputColor.addEventListener('input', (e) => {
        document.getElementById('color-hex').innerText = e.target.value;
        updateBodyBackground(e.target.value);
    });
}

// Generate Link & Copy Logic handled inside UI elements existing in DOM
// but logic is duplicated in main for simplicity or UI module?
// Let's implement basic handlers here to keep it working
if (generateBtn) {
    generateBtn.addEventListener('click', () => {
        const inputName = document.getElementById('input-name');
        const inputMsg = document.getElementById('input-msg');
        const inputBadge = document.getElementById('input-badge');

        const baseUrl = window.location.origin + window.location.pathname;
        const params = new URLSearchParams();
        if (inputName.value.trim()) params.set('n', inputName.value.trim());
        if (inputMsg.value.trim()) params.set('m', inputMsg.value.trim());
        if (inputColor.value !== '#1c2b45') params.set('c', inputColor.value);
        if (inputBadge.value.trim() !== '26') params.set('d', inputBadge.value.trim());

        const finalLink = `${baseUrl}?${params.toString()}`;
        document.getElementById('share-link').value = finalLink;
        document.getElementById('result-area').classList.remove('hidden');

        const waText = `Um convite especial para você: ${finalLink}`;
        document.getElementById('whatsapp-btn').onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
    });
}

const copyBtn = document.getElementById('copy-btn');
if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        document.getElementById('share-link').select();
        document.execCommand('copy');
        copyBtn.innerText = 'Copiado!';
        setTimeout(() => copyBtn.innerText = 'Copiar', 2000);
    });
}

const pixBtn = document.getElementById('pix-btn');
if (pixBtn) {
    pixBtn.addEventListener('click', () => {
        const key = pixBtn.getAttribute('data-key');
        navigator.clipboard.writeText(key).then(() => {
            const msg = document.getElementById('pix-copied-msg');
            msg.classList.add('visible');
            setTimeout(() => msg.classList.remove('visible'), 2000);
        });
    });
}

// --- INIT ---
state.sceneRotateX = 0;
state.sceneRotateY = 0;
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
animate();
loadCustomization();
scene.classList.add('is-floating');
startCountdown();
