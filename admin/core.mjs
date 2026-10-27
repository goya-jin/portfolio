export const REPO = 'goya-jin/portfolio';
export const OWNER = 'goya-jin';
export const MAX_FILE = 10 * 1024 * 1024;
export const MAX_TOTAL = 25 * 1024 * 1024;
const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);
const allowedExtensions = new Set([...imageExtensions, 'pdf', 'txt', 'md', 'docx', 'xlsx', 'pptx', 'zip', 'mp3', 'mp4', 'mov']);
export function today() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}
export function fileExtension(name) { return name.split('.').pop().toLowerCase(); }
export function isImage(name) { return imageExtensions.has(fileExtension(name)); }
export function checkFiles(files) {
  if (files.length > 8) throw new Error('파일은 최대 8개까지 추가할 수 있습니다.');
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL) throw new Error('첨부파일 전체 크기는 25MB 이하여야 합니다.');
  for (const file of files) {
    if (!allowedExtensions.has(fileExtension(file.name))) throw new Error(`${file.name}: 지원하지 않는 파일 형식입니다.`);
    if (file.size > MAX_FILE) throw new Error(`${file.name}: 파일당 최대 10MB입니다.`);
    if (!file.size) throw new Error(`${file.name}: 빈 파일은 첨부할 수 없습니다.`);
  }
}
export function newSlug(date) { return `${date}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`; }
export function validatePost(title, date) {
  if (!title.trim()) throw new Error('제목을 입력해 주세요.');
  if (title.trim().length > 200) throw new Error('제목은 200자 이내로 입력해 주세요.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('올바른 날짜를 입력해 주세요.');
}
function markdownLabel(text) { return text.replace(/[\\\[\]<>]/g, '\\$&').replace(/[\r\n]+/g, ' '); }
export function postDocument({ title, date, body, attachments, slug }) {
  validatePost(title, date);
  let text = body;
  const extras = [];
  for (const file of attachments) {
    const marker = file.marker;
    const link = `${isImage(file.name) ? '!' : ''}[${markdownLabel(file.name)}](../../assets/writing/${slug}/${file.id}.${fileExtension(file.name)})`;
    if (text.includes(marker)) text = text.split(marker).join(link);
    else extras.push(link);
  }
  text = text.trim() + (extras.length ? '\n\n' + extras.join('\n\n') : '');
  return JSON.stringify({ title: title.trim(), date, draft: false }) + '\n---\n' + text + '\n';
}
export function parseDocument(text) {
  const at = text.indexOf('\n---\n');
  if (at < 0) throw new Error('이 글은 편집 가능한 형식이 아닙니다.');
  return { ...JSON.parse(text.slice(0, at)), body: text.slice(at + 5) };
}
export function fromBase64(encoded) {
  return new TextDecoder().decode(Uint8Array.from(atob(encoded.replace(/\s/g, '')), c => c.charCodeAt(0)));
}
export async function fileBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
export class GitHubClient {
  #token;
  constructor(token, transport = fetch) { this.#token = token; this.transport = transport; }
  disconnect() { this.#token = ''; }
  async request(path, method = 'GET', body) {
    if (!this.#token) throw new Error('먼저 GitHub를 연결해 주세요.');
    const response = await this.transport(`https://api.github.com${path}`, {
      method, cache: 'no-store', credentials: 'omit', redirect: 'error',
      headers: { Authorization: `Bearer ${this.#token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('연결키가 올바르지 않거나 만료되었습니다. 다시 연결해 주세요.');
      if (response.status === 403) throw new Error('권한이 부족하거나 요청 한도에 도달했습니다. portfolio 저장소의 Contents: Read and write 권한을 확인해 주세요.');
      if (response.status === 409 || response.status === 422) throw new Error('다른 변경과 겹쳐 게시를 멈췄습니다. 내용을 보존했으니 최신 글을 확인하고 다시 시도해 주세요.');
      if (response.status === 404) throw new Error('파일 또는 저장소에 접근할 수 없습니다. 연결키의 portfolio 접근 권한을 확인해 주세요.');
      throw new Error(`GitHub 요청을 완료하지 못했습니다 (${response.status}). 초안은 이 브라우저에 남아 있습니다.`);
    }
    return response.json();
  }
  repo(path, method, body) { return this.request(`/repos/${REPO}${path}`, method, body); }
  async connect() {
    const user = await this.request('/user');
    if (user.login.toLowerCase() !== OWNER) throw new Error('goya-jin 계정의 연결키만 사용할 수 있습니다.');
    const repo = await this.repo('');
    if (!repo.permissions?.push) throw new Error('이 계정은 portfolio에 글을 게시할 권한이 없습니다.');
    return user;
  }
  async publish({ title, date, body, attachments, slug, editPath = null, originalSha = null }, onProgress = () => {}) {
    validatePost(title, date);
    checkFiles(attachments.map(a => a.file));
    if (attachments.some(a => !/^[a-z0-9]+$/.test(a.id) || !/^\[(이미지|첨부) \d+\]$/.test(a.marker))) throw new Error('첨부파일 정보가 올바르지 않습니다. 파일을 다시 추가해 주세요.');
    const path = `content/posts/${slug}.md`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || (editPath && editPath !== path)) throw new Error('글 주소가 올바르지 않습니다.');
    onProgress('최신 저장소 확인 중…');
    const head = (await this.repo('/git/ref/heads/main')).object.sha;
    const commit = await this.repo(`/git/commits/${head}`);
    const currentTree = await this.repo(`/git/trees/${commit.tree.sha}?recursive=1`);
    if (currentTree.truncated) throw new Error('파일 목록을 전부 확인하지 못했습니다. 게시를 중단했습니다.');
    const existing = currentTree.tree.find(item => item.path === path);
    if ((editPath && existing?.sha !== originalSha) || (!editPath && existing)) throw new Error('이 글이 다른 곳에서 수정되었습니다. 초안을 보관한 뒤 최신 글을 다시 불러와 주세요.');
    const entries = [];
    for (let i = 0; i < attachments.length; i++) {
      const a = attachments[i];
      onProgress(`첨부파일 준비 중 (${i + 1}/${attachments.length})…`);
      const blob = await this.repo('/git/blobs', 'POST', { content: await fileBase64(a.file), encoding: 'base64' });
      entries.push({ path: `assets/writing/${slug}/${a.id}.${fileExtension(a.name)}`, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const document = postDocument({ title, date, body, attachments, slug });
    const postBlob = await this.repo('/git/blobs', 'POST', { content: document, encoding: 'utf-8' });
    entries.push({ path, mode: '100644', type: 'blob', sha: postBlob.sha });
    onProgress('글 저장 중…');
    const tree = await this.repo('/git/trees', 'POST', { base_tree: commit.tree.sha, tree: entries });
    const newCommit = await this.repo('/git/commits', 'POST', { message: `${editPath ? 'Update' : 'Publish'} writing: ${title.trim()}`, tree: tree.sha, parents: [head] });
    if ((await this.repo('/git/ref/heads/main')).object.sha !== head) throw new Error('게시 중 저장소가 변경되었습니다. 내용은 보존되어 있으니 다시 게시해 주세요.');
    await this.repo('/git/refs/heads/main', 'PATCH', { sha: newCommit.sha, force: false });
    return { commit: newCommit.sha, path, sha: postBlob.sha, document, url: new URL(`../writing/${slug}/index.html?v=${newCommit.sha.slice(0, 12)}`, location.href).href };
  }
}
