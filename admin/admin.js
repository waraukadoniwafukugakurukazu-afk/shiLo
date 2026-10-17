'use strict';
// shiLo BACKSTAGE: authenticated admin for Cloudflare Workers/Pages.
// Server-side session and content API; no local-storage auth or fake saves.
(() => {
  const $ = id => document.getElementById(id);
  const ADMIN_ID = '1017';
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
  const empty = () => ({events:[],news:[],members:[],goods:[],settings:{tagline:'',about:''}});
  let data = empty();
  let revision = 'initial';
  let currentView = 'dashboard';
  let filter = 'all';
  let editingId = null;
  let lastFocus = null;
  let isAuthenticated = false;
  let busy = false;

  function deepCopy(object) { return JSON.parse(JSON.stringify(object)); }
  async function requestApi(path, method = 'GET', payload) {
    const options = {
      method, credentials: 'same-origin', cache:'no-store',
      headers: {'Accept':'application/json',...(payload === undefined ? {} : {'Content-Type':'application/json'})}
    };
    if (payload !== undefined) options.body = JSON.stringify(payload);
    let response;
    try { response = await fetch(path,options); }
    catch { throw new Error('サーバーに接続できません。通信環境を確認してください。'); }
    const result = await response.json().catch(() => null);
    if (!result) throw new Error('管理用APIが応答していません。デプロイ設定を確認してください。');
    if (!response.ok) {
      if (response.status === 401 && path !== '/api/admin/login') showLogin();
      throw new Error(result.error || 'サーバー側でエラーが発生しました。');
    }
    return result;
  }
  async function refreshServer() {
    const result = await requestApi('/api/admin/content');
    data = Object.assign(empty(),result.data || {});
    revision = result.revision;
    renderOverview();
    navigate(currentView);
  }
  async function saveServer(newData) {
    if (busy) throw new Error('保存処理中です。少し待ってから再操作してください。');
    busy = true;
    try {
      const result = await requestApi('/api/admin/content','PUT',{revision,data:newData});
      data = Object.assign(empty(),result.data);
      revision = result.revision;
      renderOverview();
      if (categories.includes(currentView)) renderList();
    } finally { busy = false; }
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
      top.append(textEl('span',entry.published ? '公開中' : '下書き','item-tag' + (entry.published ? '' : ' draft')));
      main.append(top,textEl('p',sublineFor(currentView,entry),'entry-subtitle'));
      const actions = textEl('div','','entry-buttons');
      const edit = textEl('button','編集');
      edit.type='button'; edit.addEventListener('click',() => openEditor(entry));
      const remove = textEl('button','削除','remove');
      remove.type='button'; remove.addEventListener('click',async () => {
        if (!window.confirm('「' + headingFor(currentView,entry) + '」を本番から削除しますか？この変更は公開サイトにも反映されます。')) return;
        remove.disabled = true;
        try {
          const nextData = deepCopy(data);
          nextData[currentView] = nextData[currentView].filter(x => x.id !== entry.id);
          await saveServer(nextData);
          toast('削除しました。公開中の項目はサイトからも削除されます。');
        } catch(error) {toast(error.message,true);}
        finally {remove.disabled = false;}
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
    input.value = previous?.[field.key] || '';
    label.append(input);
    if (field.type === 'image') {
      const hint = textEl('small','現在は HTTPS の画像URLを登録できます。写真のアップロード機能は今後追加予定です。','field-hint');
      label.append(hint);
      const preview = textEl('div','','image-preview');
      const img = document.createElement('img'); img.alt = '写真のプレビュー';
      preview.append(img,textEl('span','URLの画像をここに確認できます。'));
      function previewImage() {
        const url = validUrl(input.value);
        preview.hidden = !url;
        if (url) img.src = url;
        else img.removeAttribute('src');
      }
      input.addEventListener('input',previewImage);
      previewImage();
      label.append(preview);
    }
    return label;
  }
  function openEditor(entry) {
    if (!categories.includes(currentView)) return;
    lastFocus = document.activeElement;
    editingId = entry ? entry.id : null;
    $('editor-kicker').textContent = sections[currentView].title + ' / LIVE EDITOR';
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
    if (lastFocus && typeof lastFocus.focus === 'function' && lastFocus.isConnected) lastFocus.focus();
  }
  async function submitEditor(event) {
    event.preventDefault();
    if (!categories.includes(currentView)) return;
    const form = event.currentTarget;
    const previous = editingId ? data[currentView].find(x => x.id === editingId) : null;
    const next = {id: previous?.id || crypto.randomUUID()};
    for (const field of sections[currentView].fields) {
      const el = form.elements.namedItem(field.key);
      if (!el) continue;
      const v = el.value.trim();
      if (field.type === 'url' && v && !validUrl(v)) {toast(field.label + 'に正しいURLを入力してください。',true);el.focus();return;}
      if (field.type === 'image') next[field.key] = validUrl(v);
      else next[field.key] = v;
      if (field.required && !v) {toast(field.label + 'を入力してください。',true);el.focus();return;}
    }
    next.published = form.elements.namedItem('published').checked;
    const submitButton = form.querySelector('[type=submit]');
    submitButton.disabled = true;
    try {
      const pending = deepCopy(data);
      const records = pending[currentView];
      const index = records.findIndex(x => x.id === editingId);
      if (index >= 0) records[index] = next;
      else records.unshift(next);
      await saveServer(pending);
      closeEditor();
      toast(next.published ? '保存して公開しました。公式サイトを再読み込みして確認してください。' : '下書きを保存しました。');
    } catch(error) {toast(error.message,true);}
    finally {submitButton.disabled = false;}
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
  $('settings-form').addEventListener('submit',async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type=submit]');
    button.disabled = true;
    try {
      const pending = deepCopy(data);
      pending.settings = {tagline:$('setting-tagline').value.trim(),about:$('setting-about').value.trim()};
      await saveServer(pending);
      toast('文章を保存しました。公式サイトに反映されます。');
    } catch(error) {toast(error.message,true);}
    finally {button.disabled = false;}
  });

  const loginForm = $('login-form');
  const loginIdInput = $('login-id');
  const passwordInput = $('login-password');
  const loginError = $('login-error');
  const loginScreen = $('login-screen');
  const workspace = $('workspace');
  function showLogin(message = '') {
    if (!$('editor-overlay').hidden) closeEditor();
    isAuthenticated = false;
    workspace.hidden = true;
    loginScreen.hidden = false;
    loginIdInput.value = ADMIN_ID;
    passwordInput.value = '';
    loginError.textContent = message;
    loginError.hidden = !message;
    toast('');
    window.scrollTo({top:0,behavior:'auto'});
  }
  async function showWorkspace() {
    await refreshServer();
    isAuthenticated = true;
    loginScreen.hidden = true;
    workspace.hidden = false;
    navigate('dashboard');
  }
  loginForm.addEventListener('submit',async event => {
    event.preventDefault();
    const button = loginForm.querySelector('[type=submit]');
    button.disabled = true;
    loginError.hidden = true;
    try {
      if (loginIdInput.value.trim() !== ADMIN_ID) throw Error('管理IDは1017です。');
      await requestApi('/api/admin/login','POST',{id:loginIdInput.value.trim(),password:passwordInput.value});
      passwordInput.value = '';
      await showWorkspace();
      toast('ログインしました。変更内容はサーバーに保存されます。');
    } catch(error) {
      showLogin(error.message);
    } finally {button.disabled = false;}
  });
  $('logout').addEventListener('click',async () => {
    try {await requestApi('/api/admin/logout','POST',{});showLogin();}
    catch(error) {toast(error.message,true);}
  });
  $('reload-data').addEventListener('click',async () => {
    if (!$('editor-overlay').hidden) return;
    try {await refreshServer();toast('最新のデータを取得しました。');}
    catch(error) {toast(error.message,true);}
  });
  async function bootstrap() {
    showLogin();
    try {
      const session = await requestApi('/api/admin/session');
      if (session.loggedIn) await showWorkspace();
    } catch(error) {showLogin(error.message);}
  }
  bootstrap();
})();
