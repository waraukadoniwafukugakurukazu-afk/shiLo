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


// Song lottery — one-click deep links to the artist's verified Eggs song pages.
const randomTrackButton = document.getElementById('shuffle-track');
const randomTrackLabel = document.getElementById('shuffle-result');
const randomTrackLink = document.getElementById('shuffle-open');
if (randomTrackButton && randomTrackLabel && randomTrackLink) {
  const tracks = [
    { name: 'サマーガール', url: 'https://eggs.mu/artist/shiLo46/song/c4673099-8b70-4224-81ff-d453a118e8b1' },
    { name: 'Quest', url: 'https://eggs.mu/artist/shiLo46/song/6c1e52df-85f5-4a70-bd8d-8661b2e7ef18' },
    { name: 'JUMP', url: 'https://eggs.mu/artist/shiLo46/song/ba1a1a9b-63e5-4b26-83ff-fa3852bae551' },
    { name: 'Desire', url: 'https://eggs.mu/artist/shiLo46/song/22705183-6853-4823-b80b-c483117b46cc' }
  ];
  let previousChoice = -1;
  randomTrackButton.addEventListener('click', () => {
    // Never repeat the immediately previous pick when another option exists.
    let next = Math.floor(Math.random() * (previousChoice < 0 ? tracks.length : tracks.length - 1));
    if (previousChoice >= 0 && next >= previousChoice) next++;
    previousChoice = next;
    const song = tracks[next].name;
    randomTrackLabel.textContent = '♪ 今日は「' + song + '」！';
    randomTrackLink.href = tracks[next].url;
    randomTrackLink.hidden = false;
    randomTrackButton.querySelector('span').textContent = '↻';
  });
}
