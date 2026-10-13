'use strict';
const $ = id => document.getElementById(id);
const schema = {
  events: [
    ['title', 'ライブ・イベント名', 'text', true],
    ['date', '開催日', 'date', false],
    ['time', '開演時間', 'time', false],
    ['venue', '会場', 'text', false],
    ['ticketUrl', 'チケット・詳細URL（https://）', 'url', false],
    ['note', 'ひとこと・詳細', 'textarea', false]
  ],
  news: [
    ['title', 'お知らせの見出し', 'text', true],
    ['date', '公開日', 'date', false],
    ['body', 'お知らせ本文', 'textarea', false],
    ['url', '詳しい情報へのURL（https://）', 'url', false]
  ],
  members: [
    ['name', 'メンバーの名前', 'text', true],
    ['role', '担当（Vocal / Guitar など）', 'text', false],
    ['bio', '紹介文', 'textarea', false],
    ['imageUrl', '写真URL（https://）', 'url', false]
  ]
};
const tabs = {
  events: ['01 / LIVE', 'ライブ情報'],
  news: ['02 / NEWS', 'お知らせ'],
  members: ['03 / MEMBER', 'メンバー']
};
let activeTab = 'events';
let currentId = '';
let editingId = '';
let state = { revision: 'initial', data: { settings: {}, events: [], news: [], members: [] } };

function showMessage(text, error = false) {
  const target = $('message');
  target.textContent = text;
  target.classList.toggle('error', error);
  target.hidden = !text;
  if (text) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
async function api(path, method = 'GET', data) {
  let response;
  try {
    response = await fetch(path, {
      method, credentials: 'same-origin',
      headers: { 'Accept': 'application/json', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      cache: 'no-store'
    });
  } catch { throw new Error('サーバーに接続できません。インターネット接続を確認してください。'); }
  const result = await response.json().catch(() => null);
  if (!result) throw new Error('管理用APIに接続できません。Cloudflare Pagesの設定を確認してください。');
  if (!response.ok) throw new Error(result.error || '保存できませんでした');
  return result;
}
function onlyScreen(screen) {
  for (const id of ['loading', 'setup-screen', 'login-screen', 'workspace']) $(id).hidden = id !== screen;
}
async function openWorkspace(id) {
  currentId = id;
  const result = await api('/api/admin/content');
  state = { revision: result.revision, data: result.data };
  $('signed-in').textContent = '管理者：' + currentId;
  $('account-form').elements.namedItem('newId').value = currentId;
  onlyScreen('workspace');
  selectTab('events');
}
function selectTab(tab) {
  activeTab = tab;
  editingId = '';
  $('entry-form').hidden = true;
  $('collection-pane').hidden = !schema[tab];
  $('settings-pane').hidden = tab !== 'settings';
  $('account-pane').hidden = tab !== 'account';
  document.querySelectorAll('[data-tab]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.tab === tab)));
  if (schema[tab]) {
    $('collection-kicker').textContent = tabs[tab][0];
    $('collection-title').textContent = tabs[tab][1];
    renderList();
  }
  if (tab === 'settings') {
    const form = $('settings-form');
    form.elements.namedItem('tagline').value = state.data.settings.tagline || '';
    form.elements.namedItem('about').value = state.data.settings.about || '';
  }
}
function textNode(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}
function detailFor(type, item) {
  if (type === 'events') return [item.date, item.time, item.venue].filter(Boolean).join(' / ') || '日程・会場は未入力';
  if (type === 'news') return item.date || '公開日未入力';
  return [item.role, item.bio].filter(Boolean).join(' / ') || '担当・紹介文は未入力';
}
function renderList() {
  const root = $('entry-list');
  root.replaceChildren();
  const data = state.data[activeTab] || [];
  if (!data.length) {
    root.append(textNode('div', 'まだ登録されていません。「＋ 追加する」から最初の情報を作ろう。', 'empty'));
    return;
  }
  for (const item of data) {
    const card = document.createElement('article');
    card.className = 'entry';
    const copy = document.createElement('div');
    copy.append(textNode('h3', item.title || item.name), textNode('p', detailFor(activeTab, item)));
    copy.append(textNode('span', item.published ? '公開中' : '下書き', 'state' + (item.published ? ' on' : '')));
    const actions = document.createElement('div');
    actions.className = 'entry-actions';
    const edit = textNode('button', '編集');
    edit.type = 'button';
    edit.addEventListener('click', () => openEditor(item));
    const remove = textNode('button', '削除', 'delete');
    remove.type = 'button';
    remove.addEventListener('click', async () => {
      if (!confirm('「' + (item.title || item.name) + '」を削除しますか？')) return;
      const next = JSON.parse(JSON.stringify(state.data));
      next[activeTab] = next[activeTab].filter(x => x.id !== item.id);
      try { await save(next); showMessage('削除してサイトに反映しました。'); }
      catch (error) { showMessage(error.message, true); }
    });
    actions.append(edit, remove);
    card.append(copy, actions);
    root.append(card);
  }
}
function openEditor(item = null) {
  editingId = item ? item.id : '';
  $('editor-title').textContent = item ? '情報を編集' : '新しい情報を追加';
  const fields = $('entry-fields');
  fields.replaceChildren();
  for (const [key, labelText, type, required] of schema[activeTab]) {
    const label = document.createElement('label');
    label.textContent = labelText;
    if (type === 'textarea') label.classList.add('wide');
    const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
    input.name = key;
    if (type !== 'textarea') input.type = type;
    if (type === 'textarea') input.rows = 4;
    input.required = required;
    input.value = item ? (item[key] || '') : '';
    if (type === 'url') input.placeholder = 'https://';
    label.append(input);
    fields.append(label);
  }
  const form = $('entry-form');
  form.elements.namedItem('published').checked = !!(item && item.published);
  form.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function save(next) {
  const result = await api('/api/admin/content', 'PUT', { revision: state.revision, data: next });
  state = { revision: result.revision, data: result.data };
  $('entry-form').hidden = true;
  editingId = '';
  if (schema[activeTab]) renderList();
}
async function submitWithLock(form, callback) {
  const button = form.querySelector('[type=submit]');
  button.disabled = true;
  try { await callback(); }
  catch (error) { showMessage(error.message, true); }
  finally { button.disabled = false; }
}

$('setup-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  await submitWithLock(form, async () => {
    const { setupKey, id, password } = Object.fromEntries(new FormData(form));
    await api('/api/admin/setup', 'POST', { setupKey, id, password });
    form.reset();
    await openWorkspace(id);
    showMessage('初期設定が完了しました。初期設定用キーはCloudflareから削除してください。');
  });
});
$('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  await submitWithLock(form, async () => {
    const id = form.elements.namedItem('id').value.trim();
    const password = form.elements.namedItem('password').value;
    await api('/api/admin/login', 'POST', { id, password });
    form.reset();
    await openWorkspace(id);
    showMessage('');
  });
});
$('logout').addEventListener('click', async () => {
  try { await api('/api/admin/logout', 'POST', {}); onlyScreen('login-screen'); showMessage('ログアウトしました。'); }
  catch (error) { showMessage(error.message, true); }
});
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
  selectTab(button.dataset.tab);
  showMessage('');
}));
$('add-entry').addEventListener('click', () => openEditor());
$('cancel-edit').addEventListener('click', () => { $('entry-form').hidden = true; editingId = ''; });
$('entry-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  await submitWithLock(form, async () => {
    const next = JSON.parse(JSON.stringify(state.data));
    const item = { id: editingId || crypto.randomUUID(), published: form.elements.namedItem('published').checked };
    for (const [key] of schema[activeTab]) item[key] = form.elements.namedItem(key).value.trim();
    const index = next[activeTab].findIndex(x => x.id === editingId);
    if (index === -1) next[activeTab].unshift(item);
    else next[activeTab][index] = item;
    await save(next);
    showMessage('保存してサイトに反映しました。');
  });
});
$('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  await submitWithLock(form, async () => {
    const next = JSON.parse(JSON.stringify(state.data));
    next.settings = { tagline: form.elements.namedItem('tagline').value.trim(), about: form.elements.namedItem('about').value.trim() };
    await save(next);
    showMessage('紹介文を更新しました。');
  });
});
$('account-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  await submitWithLock(form, async () => {
    const newId = form.elements.namedItem('newId').value.trim();
    const newPassword = form.elements.namedItem('newPassword').value;
    const currentPassword = form.elements.namedItem('currentPassword').value;
    await api('/api/admin/account', 'POST', { newId, newPassword, currentPassword });
    currentId = newId;
    $('signed-in').textContent = '管理者：' + newId;
    form.elements.namedItem('currentPassword').value = '';
    form.elements.namedItem('newPassword').value = '';
    showMessage('管理ID・パスワードを更新しました。古いログイン情報は無効になりました。');
  });
});
(async () => {
  try {
    const session = await api('/api/admin/session');
    if (session.loggedIn) await openWorkspace(session.id);
    else onlyScreen(session.setupRequired ? 'setup-screen' : 'login-screen');
  } catch (error) {
    onlyScreen('loading');
    $('loading').textContent = '管理画面の準備が必要です。Cloudflare Pages・KV・シークレットの設定を確認してください。';
    showMessage(error.message, true);
  }
})();