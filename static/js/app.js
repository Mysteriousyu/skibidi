let chats = JSON.parse(localStorage.getItem('omnillm_chats') || '[]');
let currentChatId = null;
let pendingFiles = [];
let isStreaming = false;
let PROVIDERS = {};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/providers');
    PROVIDERS = await res.json();
  } catch(e) { console.error(e); }
  buildProviderSelect();
  renderChatList();
  if (chats.length) loadChat(chats[0].id);
});

// ---- Provider + Model ----
function buildProviderSelect() {
  const sel = document.getElementById('providerSelect');
  sel.innerHTML = '';
  for (const [key, p] of Object.entries(PROVIDERS)) {
    const opt = document.createElement('option');
    opt.value = key;
    const hasKey = !!localStorage.getItem(`key_${key}`);
    opt.textContent = p.name + (hasKey ? ' ✓' : '');
    sel.appendChild(opt);
  }
  const withKey = Object.keys(PROVIDERS).find(k => localStorage.getItem(`key_${k}`));
  if (withKey) sel.value = withKey;
  onProviderChange();
}

function onProviderChange() {
  const provider = document.getElementById('providerSelect').value;
  const config = PROVIDERS[provider];
  const mSel = document.getElementById('modelSelect');
  mSel.innerHTML = '';
  if (config && config.models) {
    for (const m of config.models) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      mSel.appendChild(opt);
    }
  }
  updateStatus();
}

function updateStatus() {
  const provider = document.getElementById('providerSelect').value;
  const hasKey = !!localStorage.getItem(`key_${provider}`);
  const el = document.getElementById('headerStatus');
  if (hasKey) {
    el.innerHTML = '<span style="color:var(--green)">● Connected</span>';
  } else {
    el.innerHTML = '<span style="color:var(--text-muted)">● No key — <a href="#" onclick="openSettings();return false" style="color:var(--accent)">add one</a></span>';
  }
}

// ---- Chats ----
function newChat() {
  const chat = { id: crypto.randomUUID(), title: 'New chat', messages: [], created: Date.now() };
  chats.unshift(chat);
  saveChats();
  loadChat(chat.id);
  renderChatList();
  document.getElementById('messageInput').focus();
}
function loadChat(id) {
  currentChatId = id;
  renderChatList();
  const chat = chats.find(c => c.id === id);
  if (chat) renderMessages(chat.messages);
}
function deleteChat(id, e) {
  e.stopPropagation();
  chats = chats.filter(c => c.id !== id);
  saveChats();
  if (currentChatId === id) { currentChatId = null; showWelcome(); }
  renderChatList();
}
function saveChats() {
  try { localStorage.setItem('omnillm_chats', JSON.stringify(chats)); } catch(e) {}
}
function showWelcome() {
  document.getElementById('chatMessages').innerHTML = `
    <div class="welcome">
      <div class="welcome-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8" stroke-linecap="round"/></svg>
      </div>
      <h2>OmniLLM</h2>
      <p>Pick a provider, choose a model, paste your API key, and chat.</p>
      <div class="welcome-grid">
        <div class="welcome-card" onclick="openSettings()"><span class="wc-icon">🔑</span><span>Set up API keys</span></div>
        <div class="welcome-card" onclick="openTerminal()"><span class="wc-icon">⌨️</span><span>Code terminal</span></div>
      </div>
    </div>`;
}
function renderChatList() {
  document.getElementById('chatList').innerHTML = chats.map(c => `
    <div class="chat-item ${c.id === currentChatId ? 'active' : ''}" onclick="loadChat('${c.id}')">
      <span>${esc(c.title)}</span>
      <button class="delete-chat" onclick="deleteChat('${c.id}', event)">×</button>
    </div>`).join('');
}

// ---- Messages ----
function renderMessages(messages) {
  const el = document.getElementById('chatMessages');
  if (!messages.length) { showWelcome(); return; }
  el.innerHTML = messages.map(renderMsg).join('');
  el.scrollTop = el.scrollHeight;
}
function renderMsg(msg) {
  const isUser = msg.role === 'user';
  let filesHtml = '';
  if (msg.files && msg.files.length) {
    filesHtml = '<div class="msg-files">' + msg.files.map(f => {
      if (f.type === 'image') return `<img class="msg-file-thumb" src="${f.preview || f.path}" alt="${esc(f.name)}">`;
      if (f.type === 'video') return `<video class="msg-video" controls src="${f.path}"></video>`;
      return `<div class="msg-file-card">📎 ${esc(f.name)}</div>`;
    }).join('') + '</div>';
  }
  return `
    <div class="msg ${msg.role}">
      <div class="msg-avatar">${isUser ? 'Y' : 'AI'}</div>
      <div class="msg-body">
        <div class="msg-name">${esc(isUser ? 'You' : (msg.model || 'Assistant'))}</div>
        ${filesHtml}
        <div class="msg-content">${isUser ? esc(msg.content) : fmtMd(msg.content)}</div>
      </div>
    </div>`;
}
function fmtMd(t) {
  if (!t) return '';
  t = t.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
  t = t.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  return t;
}
function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ---- Files ----
function handleFiles(fileList) {
  for (const f of fileList) uploadFile(f);
  document.getElementById('fileInput').value = '';
}
async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    pendingFiles.push(data);
    renderFilePreview();
  } catch(e) { alert('Upload failed: ' + e.message); }
}
function renderFilePreview() {
  const bar = document.getElementById('filePreviewBar');
  if (!pendingFiles.length) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  bar.innerHTML = pendingFiles.map((f, i) => `
    <div class="file-chip">
      ${f.type === 'image' ? `<img src="${f.preview}" alt="">` : '📎'}
      <span>${esc(f.name)}</span>
      <button class="remove-file" onclick="removePendingFile(${i})">×</button>
    </div>`).join('');
}
function removePendingFile(i) {
  pendingFiles.splice(i, 1);
  renderFilePreview();
}

// ---- Send ----
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if ((!text && !pendingFiles.length) || isStreaming) return;

  const provider = document.getElementById('providerSelect').value;
  const model = document.getElementById('modelSelect').value;
  const apiKey = localStorage.getItem(`key_${provider}`);
  if (!apiKey) { openSettings(); return; }

  if (!currentChatId) newChat();
  const chat = chats.find(c => c.id === currentChatId);

  const userMsg = { role: 'user', content: text, files: [...pendingFiles] };
  chat.messages.push(userMsg);
  if (chat.messages.filter(m => m.role === 'user').length === 1) {
    chat.title = text.slice(0, 40) || 'File chat';
  }

  input.value = '';
  input.style.height = 'auto';
  pendingFiles = [];
  renderFilePreview();
  renderMessages(chat.messages);
  saveChats();
  renderChatList();

  const chatEl = document.getElementById('chatMessages');
  const typing = document.createElement('div');
  typing.className = 'msg assistant';
  typing.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div class="msg-body">
      <div class="msg-name">${esc(model)}</div>
      <div class="msg-content"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>
    </div>`;
  chatEl.appendChild(typing);
  chatEl.scrollTop = chatEl.scrollHeight;

  isStreaming = true;
  document.getElementById('sendBtn').disabled = true;

  const apiMsgs = chat.messages.map(m => ({ role: m.role, content: m.content || '' }));

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, api_key: apiKey, model, messages: apiMsgs })
    });
    const data = await res.json();
    typing.remove();
    if (data.error) {
      chat.messages.push({ role: 'assistant', content: '⚠️ ' + data.error, model });
    } else {
      chat.messages.push({ role: 'assistant', content: data.content, model: data.model || model });
    }
  } catch(e) {
    typing.remove();
    chat.messages.push({ role: 'assistant', content: '⚠️ Network error: ' + e.message, model });
  } finally {
    isStreaming = false;
    document.getElementById('sendBtn').disabled = false;
    saveChats();
    renderMessages(chat.messages);
  }
}

// ---- Input ----
function handleInputKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

// ---- Settings ----
function openSettings() {
  const body = document.getElementById('settingsBody');
  body.innerHTML = Object.entries(PROVIDERS).map(([key, p]) => {
    const val = localStorage.getItem(`key_${key}`) || '';
    return `
      <div class="key-group">
        <label><span class="key-status ${val ? 'set' : 'unset'}"></span>${p.name}</label>
        <input type="password" id="keyInput_${key}" value="${val}" placeholder="Paste your ${p.name} API key">
      </div>`;
  }).join('');
  document.getElementById('settingsModal').classList.remove('hidden');
}
function closeSettings() { document.getElementById('settingsModal').classList.add('hidden'); }
function saveKeys() {
  for (const key of Object.keys(PROVIDERS)) {
    const val = document.getElementById(`keyInput_${key}`).value.trim();
    if (val) localStorage.setItem(`key_${key}`, val);
    else localStorage.removeItem(`key_${key}`);
  }
  closeSettings();
  buildProviderSelect();
}

// ---- Terminal ----
function openTerminal() { document.getElementById('terminalModal').classList.remove('hidden'); }
function closeTerminal() { document.getElementById('terminalModal').classList.add('hidden'); }
async function runCode() {
  const code = document.getElementById('codeEditor').value;
  const output = document.getElementById('codeOutput');
  output.textContent = 'Running...';
  output.className = '';
  try {
    const res = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    output.textContent = data.output;
    output.className = data.error ? 'output-error' : '';
  } catch(e) {
    output.textContent = 'Error: ' + e.message;
    output.className = 'output-error';
  }
}
function clearOutput() {
  const o = document.getElementById('codeOutput');
  o.textContent = 'Ready to run...';
  o.className = '';
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
