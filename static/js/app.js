// ---- State ----
let chats = JSON.parse(localStorage.getItem('omnillm_chats') || '[]');
let currentChatId = null;
let pendingFiles = [];
let isStreaming = false;

const PROVIDERS = {};

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('/api/providers');
  Object.assign(PROVIDERS, await res.json());
  buildProviderSelect();
  renderChatList();
  if (chats.length) {
    loadChat(chats[0].id);
  }
});

// ---- Providers / Models ----
function buildProviderSelect() {
  const sel = document.getElementById('providerSelect');
  sel.innerHTML = '';
  for (const [key, p] of Object.entries(PROVIDERS)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = p.name;
    // Mark if key is set
    const hasKey = !!localStorage.getItem(`key_${key}`);
    if (hasKey) opt.textContent += ' ✓';
    sel.appendChild(opt);
  }
  // Default to first provider with a key, or first overall
  const withKey = Object.keys(PROVIDERS).find(k => localStorage.getItem(`key_${k}`));
  if (withKey) sel.value = withKey;
  onProviderChange();
}

function onProviderChange() {
  const provider = document.getElementById('providerSelect').value;
  const config = PROVIDERS[provider];
  const mSel = document.getElementById('modelSelect');
  mSel.innerHTML = '';
  for (const m of config.models) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    mSel.appendChild(opt);
  }
  updateStatus();
}

function updateStatus() {
  const provider = document.getElementById('providerSelect').value;
  const hasKey = !!localStorage.getItem(`key_${provider}`);
  const el = document.getElementById('headerStatus');
  el.innerHTML = hasKey
    ? '<span style="color:var(--green)">● Connected</span>'
    : '<span style="color:var(--text-muted)">● No API key</span>';
}

// ---- Chat Management ----
function newChat() {
  const chat = {
    id: crypto.randomUUID(),
    title: 'New chat',
    messages: [],
    created: Date.now()
  };
  chats.unshift(chat);
  saveChats();
  loadChat(chat.id);
  renderChatList();
}

function loadChat(id) {
  currentChatId = id;
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  renderChatList();
  renderMessages(chat.messages);
}

function deleteChat(id, e) {
  e.stopPropagation();
  chats = chats.filter(c => c.id !== id);
  saveChats();
  if (currentChatId === id) {
    currentChatId = null;
    document.getElementById('chatMessages').innerHTML =
      document.getElementById('welcomeScreen') ? '' : '';
    showWelcome();
  }
  renderChatList();
}

function saveChats() {
  localStorage.setItem('omnillm_chats', JSON.stringify(chats));
}

function showWelcome() {
  const el = document.getElementById('chatMessages');
  el.innerHTML = `
    <div class="welcome">
      <div class="welcome-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8" stroke-linecap="round"/></svg>
      </div>
      <h2>OmniLLM</h2>
      <p>One interface, seven providers. Set your API keys and start chatting.</p>
      <div class="welcome-grid">
        <div class="welcome-card" onclick="openSettings()"><span class="wc-icon">🔑</span><span>Set up API keys</span></div>
        <div class="welcome-card" onclick="openTerminal()"><span class="wc-icon">⌨️</span><span>Code terminal</span></div>
      </div>
    </div>`;
}

function renderChatList() {
  const el = document.getElementById('chatList');
  el.innerHTML = chats.map(c => `
    <div class="chat-item ${c.id === currentChatId ? 'active' : ''}" onclick="loadChat('${c.id}')">
      <span>${escapeHtml(c.title)}</span>
      <button class="delete-chat" onclick="deleteChat('${c.id}', event)">×</button>
    </div>
  `).join('');
}

// ---- Message Rendering ----
function renderMessages(messages) {
  const el = document.getElementById('chatMessages');
  if (!messages.length) { showWelcome(); return; }
  el.innerHTML = messages.map(m => renderMessage(m)).join('');
  el.scrollTop = el.scrollHeight;
}

function renderMessage(msg) {
  const isUser = msg.role === 'user';
  const avatar = isUser ? 'Y' : 'AI';
  const name = isUser ? 'You' : (msg.model || 'Assistant');
  let filesHtml = '';
  if (msg.files && msg.files.length) {
    filesHtml = '<div class="msg-files">' + msg.files.map(f => {
      if (f.type === 'image') return `<img class="msg-file-thumb" src="${f.preview || f.path}" alt="${escapeHtml(f.name)}">`;
      if (f.type === 'video') return `<video class="msg-video" controls src="${f.path}"></video>`;
      return `<div class="msg-file-card">📎 ${escapeHtml(f.name)}</div>`;
    }).join('') + '</div>';
  }
  const content = isUser ? escapeHtml(msg.content) : formatMarkdown(msg.content);
  return `
    <div class="msg ${msg.role}">
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-body">
        <div class="msg-name">${escapeHtml(name)}</div>
        ${filesHtml}
        <div class="msg-content">${content}</div>
      </div>
    </div>`;
}

function formatMarkdown(text) {
  if (!text) return '';
  // Code blocks
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Line breaks to paragraphs
  text = text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  return text;
}

function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ---- File Handling ----
function handleFiles(fileList) {
  for (const file of fileList) {
    uploadFile(file);
  }
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
  } catch(e) {
    alert('Upload failed: ' + e.message);
  }
}

function renderFilePreview() {
  const bar = document.getElementById('filePreviewBar');
  if (!pendingFiles.length) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  bar.innerHTML = pendingFiles.map((f, i) => `
    <div class="file-chip">
      ${f.type === 'image' ? `<img src="${f.preview}" alt="">` : '📎'}
      <span>${escapeHtml(f.name)}</span>
      <button class="remove-file" onclick="removePendingFile(${i})">×</button>
    </div>
  `).join('');
}

function removePendingFile(i) {
  pendingFiles.splice(i, 1);
  renderFilePreview();
}

// ---- Sending Messages ----
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text && !pendingFiles.length) return;
  if (isStreaming) return;

  const provider = document.getElementById('providerSelect').value;
  const model = document.getElementById('modelSelect').value;
  const apiKey = localStorage.getItem(`key_${provider}`);

  if (!apiKey) {
    openSettings();
    return;
  }

  // Create chat if needed
  if (!currentChatId) newChat();
  const chat = chats.find(c => c.id === currentChatId);

  // Build user message
  const userMsg = {
    role: 'user',
    content: text,
    files: [...pendingFiles]
  };
  chat.messages.push(userMsg);

  // Update title from first message
  if (chat.messages.filter(m => m.role === 'user').length === 1) {
    chat.title = text.slice(0, 40) || 'File chat';
  }

  // Clear input
  input.value = '';
  input.style.height = 'auto';
  pendingFiles = [];
  renderFilePreview();
  renderMessages(chat.messages);
  saveChats();
  renderChatList();

  // Show typing
  const chatEl = document.getElementById('chatMessages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'msg assistant';
  typingDiv.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div class="msg-body">
      <div class="msg-name">${escapeHtml(model)}</div>
      <div class="msg-content"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>
    </div>`;
  chatEl.appendChild(typingDiv);
  chatEl.scrollTop = chatEl.scrollHeight;

  isStreaming = true;
  document.getElementById('sendBtn').disabled = true;

  // Build API messages (excluding files for the API payload)
  const apiMessages = chat.messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, api_key: apiKey, model, messages: apiMessages })
    });
    const data = await res.json();

    typingDiv.remove();

    if (data.error) {
      const errMsg = { role: 'assistant', content: `⚠️ Error: ${data.error}`, model };
      chat.messages.push(errMsg);
    } else {
      const assistantMsg = { role: 'assistant', content: data.content, model: data.model || model };
      chat.messages.push(assistantMsg);
    }

    saveChats();
    renderMessages(chat.messages);
  } catch(e) {
    typingDiv.remove();
    const errMsg = { role: 'assistant', content: `⚠️ Network error: ${e.message}`, model };
    chat.messages.push(errMsg);
    saveChats();
    renderMessages(chat.messages);
  } finally {
    isStreaming = false;
    document.getElementById('sendBtn').disabled = false;
  }
}

// ---- Input Handling ----
function handleInputKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
  // Tab in code editor
  if (e.target.id === 'codeEditor' && e.key === 'Tab') {
    e.preventDefault();
    const s = e.target.selectionStart;
    e.target.value = e.target.value.substring(0, s) + '    ' + e.target.value.substring(e.target.selectionEnd);
    e.target.selectionStart = e.target.selectionEnd = s + 4;
  }
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
    const hasKey = !!val;
    return `
      <div class="key-group">
        <label><span class="key-status ${hasKey ? 'set' : 'unset'}"></span>${p.name}</label>
        <input type="password" id="keyInput_${key}" value="${val}" placeholder="Enter ${p.name} API key">
      </div>`;
  }).join('');
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}

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
function openTerminal() {
  document.getElementById('terminalModal').classList.remove('hidden');
}

function closeTerminal() {
  document.getElementById('terminalModal').classList.add('hidden');
}

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
  document.getElementById('codeOutput').textContent = 'Ready to run...';
  document.getElementById('codeOutput').className = '';
}

// ---- Sidebar Toggle ----
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
