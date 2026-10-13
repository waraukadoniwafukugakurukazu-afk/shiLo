'use strict';
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
const mascot = document.querySelector('.mascot-button');
const message = document.querySelector('.mascot-message');
if (mascot && message) {
  const phrases = ['見つけてくれて、ありがとう。', '今日のBGM、決まった？', '白い余白に、音符をひとつ。', 'また、聴きにきてね ♪'];
  const symbols = ['♪', '♫', '✦', '♪', '♫'];
  const colors = ['#1837c4', '#d81c79', '#008d8a'];
  let count = 0;
  let lastTap = -Infinity;
  let hideTimer;
  mascot.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastTap < 600) return;
    lastTap = now;
    clearTimeout(hideTimer);
    message.textContent = phrases[count++ % phrases.length];
    message.classList.add('visible');
    mascot.classList.remove('is-playing');
    void mascot.offsetWidth;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      mascot.classList.add('is-playing');
      symbols.forEach((symbol, i) => {
        const note = document.createElement('span');
        note.className = 'note-spark';
        note.setAttribute('aria-hidden', 'true');
        note.textContent = symbol;
        note.style.color = colors[i % colors.length];
        note.style.setProperty('--dx', `${(i - 2) * 29}px`);
        note.style.setProperty('--tilt', `${(i - 2) * 18}deg`);
        note.style.animationDelay = `${i * 35}ms`;
        mascot.appendChild(note);
        setTimeout(() => note.remove(), 1100);
      });
    }
    hideTimer = setTimeout(() => message.classList.remove('visible'), 3000);
  });
  mascot.addEventListener('animationend', (event) => {
    if (event.animationName === 'mascot-hop') mascot.classList.remove('is-playing');
  });
}
