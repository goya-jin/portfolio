import { GitHubClient, REPO, today, newSlug, checkFiles, isImage, postDocument, parseDocument, fromBase64, validatePost } from './core.mjs?v=1';
const $ = id => document.getElementById(id);
let client = null, attachments = [], editPath = null, originalSha = null, slug = null;
let busy = false, dirty = false, saveTimer = null, generation = 0;
const blobURLs = new Map();
const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open('goya-jin-writing', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('drafts');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error('브라우저 저장 공간을 사용할 수 없습니다. 초안을 저장하려면 일반 브라우저 창을 사용해 주세요.'));
});
dbPromise.catch(() => {});
function status(text, type = '') { $('status').textContent = text; $('status').className = type; }
function payload() { return { title: $('title').value, date: $('date').value, body: $('body').value, attachments, editPath, originalSha, slug }; }
async function draftTransaction(mode, operation) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', mode);
    const req = operation(tx.objectStore('drafts'));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = tx.onabort = () => reject(new Error('초안을 저장하지 못했습니다. 저장 공간을 확인해 주세요.'));
  });
}
async function saveDraft(manual = false) {
  clearTimeout(saveTimer);
  try {
    await draftTransaction('readwrite', s => s.put({ ...payload(), savedAt: new Date().toISOString() }, 'current'));
    $('save-state').textContent = `이 브라우저에 ${manual ? '초안을 저장했습니다' : '자동 저장했습니다'} · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch (error) { $('save-state').textContent = error.message; if (manual) status(error.message, 'error'); }
}
function changed() { dirty = true; saveTimer && clearTimeout(saveTimer); saveTimer = setTimeout(() => saveDraft(), 500); }
function setBusy(value) {
  busy = value;
  for (const el of document.querySelectorAll('input,textarea,select,button')) el.disabled = value;
  $('publish').disabled = value || !client;
}
function revokeURLs() { for (const url of blobURLs.values()) URL.revokeObjectURL(url); blobURLs.clear(); }
function fileURL(a) {
  if (!blobURLs.has(a.id)) blobURLs.set(a.id, URL.createObjectURL(a.file));
  return blobURLs.get(a.id);
}
function renderFiles() {
  $('file-list').replaceChildren();
  attachments.forEach(a => {
    const li = document.createElement('li');
    if (isImage(a.name)) { const img = document.createElement('img'); img.src = fileURL(a); img.alt = a.name; li.append(img); }
    const label = document.createElement('span'); label.textContent = `${a.name} · ${(a.file.size / 1024 / 1024).toFixed(1)}MB`;
    const insert = document.createElement('button'); insert.type = 'button'; insert.textContent = '본문에 삽입';
    insert.onclick = () => {
      const input = $('body'), marker = `\n\n${a.marker}\n\n`;
      input.setRangeText(marker, input.selectionStart, input.selectionEnd, 'end'); input.focus(); changed();
    };
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '제거'; remove.setAttribute('aria-label', `${a.name} 제거`);
    remove.onclick = () => {
      $('body').value = $('body').value.split(a.marker).join('');
      attachments = attachments.filter(f => f.id !== a.id);
      if (blobURLs.has(a.id)) URL.revokeObjectURL(blobURLs.get(a.id)); blobURLs.delete(a.id);
      renderFiles(); changed();
    };
    li.append(label, insert, remove); $('file-list').append(li);
  });
}
$('files').addEventListener('change', () => {
  try {
    const files = Array.from($('files').files);
    checkFiles([...attachments.map(a => a.file), ...files]);
    for (const file of files) {
      let n = 1;
      while (attachments.some(a => a.marker === `[이미지 ${n}]` || a.marker === `[첨부 ${n}]`)) n++;
      attachments.push({ id: crypto.randomUUID().replaceAll('-', ''), name: file.name, file, marker: `[${isImage(file.name) ? '이미지' : '첨부'} ${n}]` });
    }
    renderFiles(); changed(); status('추가한 파일은 본문 끝에 자동으로 들어갑니다. 위치를 지정하려면 “본문에 삽입”을 누르세요.');
  } catch (error) { status(error.message, 'error'); }
  $('files').value = '';
});
for (const id of ['title', 'date', 'body']) $(id).addEventListener('input', changed);
$('save-draft').onclick = () => saveDraft(true);
$('new-post').onclick = async () => {
  if (busy || (dirty && !confirm('현재 초안 대신 새 글을 시작할까요? 필요한 내용은 먼저 복사해 주세요.'))) return;
  clearTimeout(saveTimer); generation++; attachments = []; editPath = null; originalSha = null; slug = null;
  $('editor').reset(); $('date').value = today(); $('publish').textContent = '게시하기'; $('published-link').hidden = true; $('actions-link').hidden = true;
  $('editing-state').textContent = '새 글 작성 중'; $('post-picker').value = ''; revokeURLs(); renderFiles(); dirty = false;
  await draftTransaction('readwrite', s => s.delete('current')).catch(e => status(e.message, 'error'));
  $('title').focus(); status('새 글을 작성하세요.');
};
async function listPosts() {
  const files = await client.repo('/contents/content/posts?ref=main');
  $('post-picker').replaceChildren(new Option('글 선택…', ''));
  for (const f of files.filter(f => f.name.endsWith('.md')).sort((a, b) => a.name.localeCompare(b.name))) $('post-picker').add(new Option(f.name.replace(/\.md$/, ''), f.path));
}
$('connect').onclick = async () => {
  if (busy) return;
  const key = $('token').value.trim();
  if (!key.startsWith('github_pat_')) { status('이 저장소만 선택한 fine-grained 연결키를 입력해 주세요.', 'error'); return; }
  const candidate = new GitHubClient(key); $('token').value = ''; setBusy(true); status('GitHub 연결 확인 중…');
  try {
    const user = await candidate.connect(); client = candidate;
    $('connection-state').textContent = `${user.login} 연결됨 · ${REPO}`;
    $('connect-form').hidden = true; $('disconnect').hidden = false; $('existing-posts').hidden = false;
    status('연결되었습니다. 작성한 글을 게시할 수 있습니다.', 'success');
    await listPosts();
  } catch (error) {
    if (client !== candidate) candidate.disconnect();
    status(error.message, 'error');
  } finally { setBusy(false); }
};
$('disconnect').onclick = () => {
  client?.disconnect(); client = null; generation++;
  $('connect-form').hidden = false; $('disconnect').hidden = true; $('existing-posts').hidden = true;
  $('connection-state').textContent = '연결 해제됨. 초안은 이 브라우저에 남아 있습니다.'; $('publish').disabled = true; status('연결을 해제했습니다.');
};
$('load-post').onclick = async () => {
  const path = $('post-picker').value;
  if (!path || !client || busy) return;
  if (dirty && !confirm('현재 초안 대신 선택한 글을 불러올까요? 필요한 내용은 먼저 복사해 주세요.')) return;
  setBusy(true); clearTimeout(saveTimer); generation++;
  try {
    const f = await client.repo(`/contents/${path}?ref=main`);
    const p = parseDocument(fromBase64(f.content));
    $('title').value = p.title; $('date').value = p.date; $('body').value = p.body;
    editPath = path; originalSha = f.sha; slug = path.split('/').pop().replace(/\.md$/, '');
    attachments = []; revokeURLs(); renderFiles(); dirty = false;
    $('editing-state').textContent = '게시한 글 수정 중'; $('publish').textContent = '수정 게시';
    $('published-link').hidden = true; $('actions-link').hidden = true;
    status('글을 불러왔습니다. 기존 이미지·첨부 링크는 본문에 유지됩니다.'); await saveDraft();
  } catch (error) { status(error.message, 'error'); } finally { setBusy(false); }
};
function renderPreview() {
  const root = $('preview-content'); root.replaceChildren();
  const title = document.createElement('h1'); title.textContent = $('title').value || '제목 없음';
  const date = document.createElement('p'); date.textContent = $('date').value; root.append(title, date);
  const used = new Set();
  function appendFile(a) {
    used.add(a.id);
    if (isImage(a.name)) { const img = document.createElement('img'); img.src = fileURL(a); img.alt = a.name; root.append(img); }
    else { const aTag = document.createElement('a'); aTag.href = fileURL(a); aTag.download = a.name; aTag.textContent = `첨부: ${a.name}`; root.append(aTag); }
  }
  for (const chunk of $('body').value.split(/(\[(?:이미지|첨부) \d+\])/)) {
    const a = attachments.find(f => f.marker === chunk);
    if (a) appendFile(a);
    else { const p = document.createElement('p'); p.textContent = chunk; root.append(p); }
  }
  attachments.filter(a => !used.has(a.id)).forEach(appendFile);
}
$('preview').onclick = () => { renderPreview(); $('preview-dialog').showModal(); };
$('close-preview').onclick = () => $('preview-dialog').close();
$('editor').onsubmit = async event => {
  event.preventDefault();
  if (!client || busy) return;
  try {
    validatePost($('title').value, $('date').value); checkFiles(attachments.map(a => a.file));
    await saveDraft();
    $('publish-summary').textContent = `${$('title').value.trim()} · ${$('date').value} · 새 첨부파일 ${attachments.length}개`;
    $('publish-dialog').showModal();
  } catch (error) { status(error.message, 'error'); }
};
$('cancel-publish').onclick = () => $('publish-dialog').close();
$('confirm-publish').onclick = async () => {
  if (!client || busy) return;
  $('publish-dialog').close(); setBusy(true); clearTimeout(saveTimer);
  if (!slug) slug = newSlug($('date').value);
  const captured = payload();
  try {
    const result = await client.publish(captured, message => status(message));
    // The update is already committed. Set local state before any optional follow-up.
    editPath = result.path; originalSha = result.sha; $('body').value = parseDocument(result.document).body;
    attachments = []; revokeURLs(); renderFiles(); dirty = false;
    $('editing-state').textContent = '게시한 글 수정 중'; $('publish').textContent = '수정 게시';
    $('published-link').href = result.url; $('published-link').hidden = false; $('actions-link').hidden = false;
    status('GitHub에 저장했습니다. 사이트가 자동 배포됩니다. 1–2분 뒤 “게시한 글 보기”를 열어 주세요.', 'success');
    await saveDraft();
    listPosts().catch(() => {});
  } catch (error) { status(error.message, 'error'); await saveDraft(); } finally { setBusy(false); }
};
window.addEventListener('beforeunload', event => { if (busy) { event.preventDefault(); event.returnValue = ''; } });
$('date').value = today();
const restoreGeneration = generation;
// Disable editing while restoring so an older draft cannot overwrite new input.
setBusy(true);
try {
  const draft = await draftTransaction('readonly', s => s.get('current'));
  if (draft && generation === restoreGeneration) {
    $('title').value = draft.title || ''; $('date').value = draft.date || today(); $('body').value = draft.body || '';
    attachments = draft.attachments || []; editPath = draft.editPath || null; originalSha = draft.originalSha || null; slug = draft.slug || null;
    renderFiles(); dirty = Boolean(draft.title || draft.body || attachments.length);
    $('editing-state').textContent = editPath ? '게시한 글 수정 중' : '저장한 초안';
    $('publish').textContent = editPath ? '수정 게시' : '게시하기';
    $('save-state').textContent = '이 브라우저에 저장한 초안을 복원했습니다.';
  }
} catch (error) { $('save-state').textContent = error.message; } finally { setBusy(false); }
