'use strict';
// shiLo BACKSTAGE: DESIGN PREVIEW ONLY.
// No login, no authentication, no API calls, no public content updates.
// Everything is kept in this browser's localStorage to review the UI.
(() => {
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'shilo-backstage-design-preview-v1';
  const sections = {
    events: { title: 'LIVE', number: '01', eyebrow: 'LIVE / MAKE SOME NOISE', description: '日程・会場・チケット情報を追加、編集する画面。', symbol: '♪', label: 'ライブ', fields: [
      { key:'title', label:'イベント名', type:'text', required:true, max:120, wide:true, placeholder:'ライブのタイトル' },
      { key:'date', label:'開催日', type:'date' }, { key:'time', label:'開演時間', type:'time' },
      { key:'venue', label:'会場', type:'text', max:120, wide:true, placeholder:'会場名を入力' },
      { key:'ticketUrl', label:'チケット・詳細URL', type:'url', max:600, wide:true, placeholder:'https://...' },
      { key:'note', label:'出演情報・ひとこと', type:'textarea', max:700, wide:true, placeholder:'当日の詳細など' }
    ]},
    news: { title:'NEWS', number:'02', eyebrow:'NEWS / THE LATEST FROM shiLo', description:'ライブ告知やお知らせの文章を編集する画面。', symbol:'!', label:'お知らせ', fields:[
      { key:'title', label:'見出し', type:'text', required:true, max:120, wide:true, placeholder:'お知らせのタイトル' },
      { key:'date', label:'日付', type:'date' },
      { key:'body', label:'本文', type:'textarea', max:1400, wide:true, placeholder:'ここにお知らせの本文' },
      { key:'url', label:'関連リンク', type:'url', max:600, wide:true, placeholder:'https://...' }
    ]},
    members: { title:'MEMBER', number:'03', eyebrow:'MEMBER / WHO MAKES THE NOISE?', description:'メンバーの名前・担当・紹介文・写真を編集する画面。', symbol:'☺', label:'メンバー', fields:[
      { key:'name', label:'メンバー名', type:'text', required:true, max:80, wide:true, placeholder:'名前を入力' },
      { key:'role', label:'担当パート', type:'text', max:100, wide:true, placeholder:'Vocal / Guitar など' },
      { key:'bio', label:'プロフィール', type:'textarea', max:800, wide:true },
      { key:'imageUrl', label:'メンバー写真', type:'image', wide:true }
    ]},
    goods: { title:'GOODS', number:'04', eyebrow:'GOODS / MERCHANDISE DEPARTMENT', description:'グッズの写真・価格・販売リンクを編集する画面。', symbol:'✦', label:'グッズ', fields:[
      { key:'name', label:'グッズ名', type:'text', required:true, max:120, wide:true, placeholder:'商品名' },
      { key:'price', label:'価格（表示する文字）', type:'text', max:50, placeholder:'¥1,000' },
      { key:'status', label:'販売状況', type:'select', options:['販売準備中','販売中','売り切れ','販売終了'] },
      { key:'description', label:'商品説明', type:'textarea', max:850, wide:true },
      { key:'imageUrl', label:'商品写真', type:'image', wide:true },
      { key:'link', label:'販売・詳細ページURL', type:'url', max:600, wide:true, placeholder:'https://...' }
    ]}
  };
  const categories = Object.keys(sections);
  const demo = () => ({
    events:[{id:'demo-event',title:'【サンプル】LIVEイベント',date:'',time:'',venue:'会場名を入力',ticketUrl:'',note:'表示確認のための仮データです。',published:false}],
    news:[{id:'demo-news',title:'【サンプル】お知らせタイトル',date:'',body:'ここに新曲や出演情報を書いていくイメージです。',url:'',published:false}],
    members:[{id:'demo-member',name:'【サンプル】メンバー名',role:'担当パートを入力',bio:'プロフィールのサンプルです。',imageUrl:'',published:false}],
    goods:[{id:'demo-good',name:'【サンプル】グッズ名',price:'価格未定',status:'販売準備中',description:'商品情報が決まったら差し替えられます。',imageUrl:'',link:'',published:false}],
    settings:{tagline:'日常に、おしゃぽっぷなBGMを。',about:'Tokyo pop rock band「shiLo（しろ）」。\n真っ白なキャンバスに、おしゃポップでロックな楽曲を描く。'}
  });

  let data = demo();
  let currentView = 'dashboard';
  let filter = 'all';
  let editingId = null;
  let imageInForm = '';
  let lastFocus = null;

  function deepCopy(object) { return JSON.parse(JSON.stringify(object)); }
  function readStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      if (!categories.every(key => Array.isArray(parsed[key])) || !parsed.settings || typeof parsed.settings !== 'object') return;
      data = parsed;
    } catch { /* Private mode and blocked storage: use temporary in-memory preview. */ }
  }
  function saveStorage() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
    catch { return false; }
  }
  function toast(message, error = false) {
    const el = $('feedback');
    el.textContent = message;
    el.classList.toggle('is-error', error);
    el.hidden = !message;
  }
  function textEl(tag, value, className) {
    const el = document.createElement(tag);
    el.textContent = value == null ? '' : String(value);
    if (className) el.className = className;
    return el;
  }
  function validUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    if (/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(value) && value.length < 1500000) return value;
    try {
      const u = new URL(value.trim());
      return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
    } catch { return ''; }
  }
  function headingFor(section, record) {
    return (section === 'members' || section === 'goods' ? record.name : record.title) || 'タイトル未入力';
  }
  function sublineFor(section, record) {
    if (section === 'events') return [record.date,record.time,record.venue].filter(Boolean).join(' / ') || '日付・会場は未入力';
    if (section === 'news') return [record.date,record.body].filter(Boolean).join(' / ') || 'お知らせ本文は未入力';
    if (section === 'members') return [record.role,record.bio].filter(Boolean).join(' / ') || 'プロフィールは未入力';
    return [record.price,record.status,record.description].filter(Boolean).join(' / ') || 'グッズ情報は未入力';
  }
  function navigate(view) {
    if (view !== 'dashboard' && view !== 'settings' && !categories.includes(view)) return;
    currentView = view;
    toast('');
    ['dashboard','collection','settings'].forEach(k => $(k + '-view').hidden = k === 'collection' ? !categories.includes(view) : view !== k);
    document.querySelectorAll('[data-view],[data-mobile-view]').forEach(button => {
      const isActive = (button.dataset.view || button.dataset.mobileView) === view;
      if (isActive) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
      if (button.matches('[data-view]')) button.classList.toggle('active',isActive);
    });
    if (categories.includes(view)) {
      const section = sections[view];
      $('section-title').textContent = section.title;
      const dot = textEl('span','.');
      $('section-title').append(dot);
      $('section-eyebrow').textContent = section.eyebrow;
      $('section-description').textContent = section.description;
      $('section-number').textContent = section.number;
      filter = 'all';
      document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.filter === 'all')));
      renderList();
    } else if (view === 'settings') {
      $('setting-tagline').value = data.settings.tagline || '';
      $('setting-about').value = data.settings.about || '';
    } else renderOverview();
    window.scrollTo({top:0,behavior:'auto'});
  }
  function renderOverview() {
    const root = $('overview-cards');
    root.replaceChildren();
    categories.forEach(key => {
      const section = sections[key];
      const button = document.createElement('button');
      button.type = 'button';button.className = 'overview-card';
      button.setAttribute('aria-label',section.label + 'を編集');
      button.append(textEl('span',section.symbol,'card-symbol'));
      button.append(textEl('strong',String(data[key].length).padStart(2,'0'),'card-number'));
      const foot = textEl('span','','card-foot');
      const label = document.createElement('span');
      label.append(textEl('span',section.title,'card-title'),textEl('div',section.label + 'の登録件数','card-label'));
      foot.append(label,textEl('span','↗','card-arrow'));
      button.append(foot);
      button.addEventListener('click',() => navigate(key));
      root.append(button);
    });
    document.querySelectorAll('[data-count]').forEach(b => {b.textContent = String(data[b.dataset.count].length);});
  }
  function renderList() {
    const root = $('collection-list');
    root.replaceChildren();
    const records = data[currentView].filter(item =>
      filter === 'all' || (filter === 'published' ? item.published : !item.published)
    );
    if (!records.length) {
      const empty = textEl('div','','empty-state');
      empty.append(textEl('span','✳'),textEl('h3','まだ情報がありません'),textEl('p','「＋ 新しく追加」から登録してみよう。'));
      root.append(empty);return;
    }
    for (const entry of records) {
      const article = textEl('article','','entry');
      const main = textEl('div','','entry-main');
      const top = textEl('div','','entry-top');
      top.append(textEl('h3',headingFor(currentView,entry),'entry-name'));
      top.append(textEl('span',entry.published ? '公開イメージ' : '下書き','item-tag' + (entry.published ? '' : ' draft')));
      main.append(top,textEl('p',sublineFor(currentView,entry),'entry-subtitle'));
      const actions = textEl('div','','entry-buttons');
      const edit = textEl('button','編集');
      edit.type='button'; edit.addEventListener('click',() => openEditor(entry));
      const remove = textEl('button','削除','remove');
      remove.type='button'; remove.addEventListener('click',() => {
        if (!window.confirm('「' + headingFor(currentView,entry) + '」をプレビューから削除しますか？')) return;
        data[currentView] = data[currentView].filter(x => x.id !== entry.id);
        const persisted = saveStorage();
        renderList();renderOverview();
        toast(persisted ? 'プレビューから削除しました。公式サイトには影響しません。' : '削除しましたが、ブラウザへの仮保存はできませんでした。',!persisted);
      });
      actions.append(edit,remove);
      article.append(main,actions);
      root.append(article);
    }
  }
  function createFormField(field, previous) {
    const label = document.createElement('label');
    if (field.wide || field.type === 'image' || field.type === 'textarea') label.className = 'wide';
    const id = 'field-' + field.key;
    label.append(textEl('span',field.label));
    let input;
    if (field.type === 'textarea') {
      input = document.createElement('textarea');input.rows = 4;
    } else if(field.type === 'select') {
      input = document.createElement('select');
      field.options.forEach(value => {const option = document.createElement('option');option.value = value;option.textContent = value;input.append(option);});
    } else {
      input = document.createElement('input'); input.type = field.type === 'image' ? 'url' : field.type;
    }
    input.name = field.key; input.id = id;
    if (field.max) input.maxLength = field.max;
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.required) input.required = true;
    let initial = previous?.[field.key] || '';
    if (field.type === 'image' && initial.startsWith('data:image/')) initial = '';
    input.value = initial;
    label.append(input);
    if (field.type === 'image') {
      const hint = textEl('small','画像URLを入力、または下から写真を選んでプレビューできます。','field-hint');
      label.append(hint);
      const picker = document.createElement('input');
      picker.type = 'file'; picker.accept = 'image/png,image/jpeg,image/webp';
      picker.name = 'previewFile';
      picker.setAttribute('aria-label',field.label + 'を選ぶ');
      const preview = textEl('div','','image-preview');
      const img = document.createElement('img'); img.alt = '選択した画像のプレビュー';
      const helper = textEl('span','写真はこの端末での表示確認用です。実際のアップロードは後から接続します。');
      preview.append(img,helper);
      function updatePreview() {
        const url = imageInForm || validUrl(input.value);
        preview.hidden = !url;
        if (url) img.src = url;
        else img.removeAttribute('src');
      }
      picker.addEventListener('change', async () => {
        const file = picker.files && picker.files[0];
        if (!file) return;
        try {
          imageInForm = await resizePreview(file);
          input.value = '';
          updatePreview();
          toast('写真をプレビューに追加しました。公式サイトには反映されません。');
        } catch(error) {toast(error.message,true);}
      });
      input.addEventListener('input',() => {imageInForm = ''; updatePreview();});
      label.append(picker,preview);
      updatePreview();
    }
    return label;
  }
  async function resizePreview(file) {
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw Error('JPEG・PNG・WebPの画像を選んでください。');
    if (file.size > 9_000_000) throw Error('プレビュー画像は9MB以下にしてください。');
    const source = await new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('画像を読み込めませんでした。'));
      reader.readAsDataURL(file);
    });
    const image = await new Promise((resolve,reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('画像形式を確認してください。'));
      img.src = source;
    });
    const maxSide = 650;
    const ratio = Math.min(1, maxSide / Math.max(image.width,image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1,Math.round(image.width*ratio));canvas.height = Math.max(1,Math.round(image.height*ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('画像プレビューを作成できませんでした。');
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',.68);
  }
  function openEditor(entry) {
    if (!categories.includes(currentView)) return;
    lastFocus = document.activeElement;
    editingId = entry ? entry.id : null;
    imageInForm = entry && typeof entry.imageUrl === 'string' && entry.imageUrl.startsWith('data:image/') ? entry.imageUrl : '';
    $('editor-kicker').textContent = sections[currentView].title + ' / DESIGN PREVIEW';
    $('editor-heading').textContent = entry ? '情報を編集する' : '新しく追加する';
    const root = $('editor-fields');
    root.replaceChildren();
    sections[currentView].fields.forEach(field => root.append(createFormField(field,entry)));
    $('editor-form').elements.namedItem('published').checked = !!entry?.published;
    $('editor-overlay').hidden = false;
    document.body.classList.add('modal-open');
    $('editor-close').focus();
  }
  function closeEditor() {
    $('editor-overlay').hidden = true;
    document.body.classList.remove('modal-open');
    editingId = null;
    imageInForm = '';
    if (lastFocus && typeof lastFocus.focus === 'function' && lastFocus.isConnected) lastFocus.focus();
  }
  function submitEditor(event) {
    event.preventDefault();
    if (!categories.includes(currentView)) return;
    const form = event.currentTarget;
    const previous = editingId ? data[currentView].find(x => x.id === editingId) : null;
    const next = {id: previous?.id || ('preview-' + Date.now() + '-' + Math.random().toString(36).slice(2,8))};
    for (const field of sections[currentView].fields) {
      const el = form.elements.namedItem(field.key);
      if (!el) continue;
      const v = el.value.trim();
      if (field.type === 'url' && v && !validUrl(v)) {toast(field.label + 'に正しいURLを入力してください。',true);el.focus();return;}
      if (field.type === 'image') next[field.key] = imageInForm || validUrl(v);
      else next[field.key] = v;
      if (field.required && !v) {toast(field.label + 'を入力してください。',true);el.focus();return;}
    }
    next.published = form.elements.namedItem('published').checked;
    const records = data[currentView];
    const index = records.findIndex(x => x.id === editingId);
    if (index >= 0) records[index] = next;
    else records.unshift(next);
    const saved = saveStorage();
    closeEditor();renderList();renderOverview();
    toast(saved ? '仮保存しました。公式サイトには反映されません。' : '画面には反映しましたが、端末への仮保存ができませんでした。',!saved);
  }
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click',() => navigate(b.dataset.view)));
  document.querySelectorAll('[data-mobile-view]').forEach(b => b.addEventListener('click',() => navigate(b.dataset.mobileView)));
  document.querySelectorAll('[data-quick-view]').forEach(b => b.addEventListener('click',() => {navigate(b.dataset.quickView);openEditor();}));
  document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click',() => {
    filter = b.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x === b)));
    renderList();
  }));
  $('add-item').addEventListener('click',() => openEditor());
  $('editor-close').addEventListener('click',closeEditor);
  $('editor-cancel').addEventListener('click',closeEditor);
  $('editor-backdrop').addEventListener('click',closeEditor);
  $('editor-form').addEventListener('submit',submitEditor);
  document.addEventListener('keydown',event => {if(event.key === 'Escape' && !$('editor-overlay').hidden) closeEditor();});
  $('settings-form').addEventListener('submit',event => {
    event.preventDefault();
    data.settings = {tagline:$('setting-tagline').value.trim(),about:$('setting-about').value.trim()};
    const saved = saveStorage();
    toast(saved ? '文章を仮保存しました。公式サイトには反映されません。' : '画面には反映しましたが、ブラウザへの仮保存はできませんでした。',!saved);
  });
  $('reset-demo').addEventListener('click',() => {
    if (!window.confirm('このブラウザで試した編集を消して、サンプルに戻しますか？')) return;
    data = demo();
    const saved = saveStorage();
    navigate('dashboard');
    toast(saved ? 'デザイン用サンプルに戻しました。' : 'サンプルに戻しました。端末への保存はできませんでした。',!saved);
  });

  readStorage();
  renderOverview();
  navigate('dashboard');
})();
