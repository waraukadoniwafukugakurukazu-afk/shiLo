'use strict';
// Published GOODS come from the authenticated management API (public read endpoint).
// If the API is not configured, the existing COMING SOON design remains in place.
(async () => {
  const grid = document.getElementById('goods-list');
  const empty = document.getElementById('goods-placeholder');
  if (!grid || !empty) return;
  let GOODS_ITEMS = [];
  try {
    const response = await fetch('./api/content', {cache:'no-store'});
    if (!response.ok) return;
    const published = await response.json();
    GOODS_ITEMS = Array.isArray(published.goods) ? published.goods : [];
  } catch { return; }
  if (!GOODS_ITEMS.length) return;

  function textElement(tag, contents, cls) {
    const el = document.createElement(tag);
    el.textContent = String(contents || '');
    if (cls) el.className = cls;
    return el;
  }
  function safeUrl(value, localImage = false) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value.trim(), window.location.href);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      if (!localImage && url.origin !== window.location.origin && url.protocol !== 'https:') return '';
      if (localImage && url.origin !== window.location.origin && url.protocol !== 'https:') return '';
      return url.href;
    } catch {
      return '';
    }
  }
  let count = 0;
  GOODS_ITEMS.forEach((item, index) => {
    if (!item || typeof item !== 'object' || !String(item.name || '').trim()) return;
    const card = document.createElement('article');
    card.className = 'goods-product';

    const visual = document.createElement('div');
    visual.className = 'goods-product-media';
    const imageUrl = safeUrl(item.imageUrl, true);
    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = String(item.name);
      img.loading = 'lazy';
      img.decoding = 'async';
      visual.appendChild(img);
    } else {
      visual.appendChild(textElement('span', 'shiLo GOODS ✳', 'goods-no-photo'));
    }

    const body = document.createElement('div');
    body.className = 'goods-product-body';
    body.appendChild(textElement('p', 'ITEM ' + String(index + 1).padStart(2, '0') + ' / shiLo', 'goods-product-code'));
    body.appendChild(textElement('h3', item.name));
    if (item.price) body.appendChild(textElement('p', item.price, 'goods-product-price'));
    if (item.description) body.appendChild(textElement('p', item.description, 'goods-product-description'));

    const href = safeUrl(item.link);
    if (href && !['販売終了', '売り切れ'].includes(item.status)) {
      const link = textElement('a', item.status || '商品を見る ↗', 'goods-product-link');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', String(item.name) + 'の商品詳細を開く');
      body.appendChild(link);
    } else {
      body.appendChild(textElement('p', item.status || '販売情報準備中', 'goods-product-unavailable'));
    }
    card.append(visual, body);
    grid.appendChild(card);
    count++;
  });
  if (count) {
    grid.hidden = false;
    empty.hidden = true;
  }
})();
