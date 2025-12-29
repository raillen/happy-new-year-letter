import { state } from './state.js';
import { updateBodyBackground, adjustColorBrightness } from './utils.js';

export function startTypewriter() {
    const p = document.querySelector('.full-letter p');
    if (p.dataset.typed === 'true') return;

    const originalText = p.innerText;
    p.innerText = '';
    p.classList.add('typing-cursor');

    let i = 0;
    const speed = 30;

    function type() {
        if (i < originalText.length) {
            p.innerText += originalText.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            p.classList.remove('typing-cursor');
            p.dataset.typed = 'true';
        }
    }
    setTimeout(type, 500);
}

export function startCountdown() {
    const container = document.getElementById('countdown-container');
    const now = new Date();
    let nextYear = now.getFullYear() + 1;
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
    update();
}

export function loadCustomization() {
    const params = new URLSearchParams(window.location.search);
    const inputName = document.getElementById('input-name');
    const inputColor = document.getElementById('input-color');
    const inputBadge = document.getElementById('input-badge');
    const colorHexDisplay = document.getElementById('color-hex');

    const n = params.get('n') || params.get('nome');
    if (n) {
        document.getElementById('recipient-title').innerText = `Feliz Ano Novo, ${n}!`;
        document.title = `Para ${n} - Feliz Ano Novo`;
        if (inputName) inputName.value = n;
    }

    const m = params.get('m');
    if (m) {
        const fullLetterP = document.querySelector('.full-letter p');
        fullLetterP.innerText = m;
        document.querySelector('.letter-body-preview').innerText = m.substring(0, 80) + '...';
    }

    const c = params.get('c');
    if (c) {
        document.documentElement.style.setProperty('--envelope-color', c);
        document.documentElement.style.setProperty('--envelope-flap-color', adjustColorBrightness(c, 10));
        if (inputColor) inputColor.value = c;
        if (colorHexDisplay) colorHexDisplay.innerText = c;
        updateBodyBackground(c);
    }

    const d = params.get('d');
    if (d) {
        document.querySelector('.wax-seal').innerText = d.substring(0, 3);
        if (inputBadge) inputBadge.value = d;
    }
}
