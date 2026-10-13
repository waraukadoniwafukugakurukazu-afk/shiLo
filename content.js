'use strict';
// Add published shiLo updates while preserving the original static website if the API is not configured.
const node = (tag, text, className) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
};
function formatDay(value) {
  if (!value) return 'DATE TBA';
  const date = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }).format(date);
}
function safeLink(url, label, className) {
  if (!url) return null;
  let destination;
  try { destination = new URL(url); } catch { return null; }
  if (!['https:', 'http:'].includes(destination.protocol)) return null;
  const link = node('a', label, className);
  link.href = destination.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}
function showNews(news) {
  const section = document.getElementById('news-section');
  const list = document.getElementById('news-items');
  if (!section || !list || !news.length) return;
  const ordered = [...news].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  for (const item of ordered) {
    const card = node('article', undefined, 'shilo-news-card');
    const meta = node('p', formatDay(item.date), 'shilo-meta');
    const heading = node('h3', item.title);
    card.append(meta, heading);
    if (item.body) card.append(node('p', item.body, 'shilo-detail'));
    const link = safeLink(item.url, 'MORE INFO ↗', 'shilo-more');
    if (link) card.append(link);
    list.append(card);
  }
  section.hidden = false;
}
function showEvents(events) {
  const container = document.getElementById('live-items');
  if (!container || !events.length) return;
  const ordered = [...events].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  for (const item of ordered) {
    const card = node('article', undefined, 'shilo-live-card');
    const date = node('div', formatDay(item.date), 'shilo-live-date');
    const main = node('div');
    main.append(node('h3', item.title));
    const facts = [item.time, item.venue].filter(Boolean).join(' / ');
    if (facts) main.append(node('p', facts, 'shilo-live-facts'));
    if (item.note) main.append(node('p', item.note, 'shilo-live-note'));
    const link = safeLink(item.ticketUrl, 'DETAILS ↗', 'shilo-live-link');
    if (link) main.append(link);
    card.append(date, main);
    container.append(card);
  }
  const placeholder = document.getElementById('live-placeholder');
  if (placeholder) placeholder.hidden = true;
}
function showMembers(members) {
  const section = document.getElementById('members-section');
  const list = document.getElementById('member-items');
  if (!section || !list || !members.length) return;
  for (const item of members) {
    const card = node('article', undefined, 'shilo-member-card');
    if (item.imageUrl && /^https?:\/\//i.test(item.imageUrl)) {
      const photo = document.createElement('img');
      photo.src = item.imageUrl;
      photo.loading = 'lazy';
      photo.alt = item.name + ' の写真';
      card.append(photo);
    } else {
      card.append(node('div', 'shiLo', 'shilo-member-photo-placeholder'));
    }
    const details = node('div', undefined, 'shilo-member-info');
    if (item.role) details.append(node('p', item.role, 'shilo-meta'));
    details.append(node('h3', item.name));
    if (item.bio) details.append(node('p', item.bio, 'shilo-detail'));
    card.append(details);
    list.append(card);
  }
  section.hidden = false;
}
(async () => {
  try {
    const response = await fetch('./api/content', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    if (data.settings && data.settings.tagline) {
      const tagline = document.getElementById('hero-tagline');
      if (tagline) tagline.textContent = data.settings.tagline;
    }
    if (data.settings && data.settings.about) {
      const about = document.getElementById('about-text');
      if (about) about.textContent = data.settings.about;
    }
    showNews(Array.isArray(data.news) ? data.news : []);
    showEvents(Array.isArray(data.events) ? data.events : []);
    showMembers(Array.isArray(data.members) ? data.members : []);
  } catch {
    // GitHub Pages or a temporary API outage: keep the original static content visible.
  }
})();