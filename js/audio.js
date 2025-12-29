import { state } from './state.js';

let bgMusic = new Audio('assets/christmas-song.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.4;

let fireworksSfx = new Audio('assets/fireworks-sfx.mp3');
fireworksSfx.volume = 0.6;
let audioCtx;

export function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

export function toggleMuteState(iconSpeaker, audioBtn) {
    if (state.isMuted) {
        iconSpeaker.innerHTML = '<line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4M9 9L5 5H2v6h3l4 4"></path>';
        audioBtn.style.opacity = '0.5';
        bgMusic.pause();
        // Para todos os sfx ativos imediatamente
        state.activeSfx.forEach(sfx => {
            try { sfx.pause(); sfx.currentTime = 0; } catch (e) { }
        });
        state.activeSfx = [];
    } else {
        iconSpeaker.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
        audioBtn.style.opacity = '1';
        bgMusic.play().catch(() => console.log("Aguardando interação"));
    }
}

export function playBgMusic() {
    if (!state.isMuted) bgMusic.play().catch(() => { });
}

export function playPaperSound() {
    if (state.isMuted) return;
    initAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(t + 0.3);
}

export function playFireworksRealSound() {
    if (state.isMuted) return;
    const sfx = fireworksSfx.cloneNode();
    sfx.volume = 0.5;

    state.activeSfx.push(sfx);
    sfx.onended = () => {
        const idx = state.activeSfx.indexOf(sfx);
        if (idx > -1) state.activeSfx.splice(idx, 1);
    };

    sfx.play().catch(() => { });
}
