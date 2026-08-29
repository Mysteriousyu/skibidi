import os
import json
import base64
import uuid
import subprocess
import tempfile
import threading
import time
import re
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'png','jpg','jpeg','gif','webp','bmp','svg','mp4','webm','mov','avi',
                      'pdf','txt','py','js','json','csv','md','html','css','zip','tar','gz'}

# Provider configurations
PROVIDERS = {
    "chatgpt": {
        "name": "ChatGPT",
        "base_url": "https://api.openai.com/v1/chat/completions",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini", "o3-mini"],
        "auth_header": "Bearer",
        "format": "openai"
    },
    "claude": {
        "name": "Claude",
        "base_url": "https://api.anthropic.com/v1/messages",
        "models": ["claude-sonnet-4-20250514", "claude-haiku-4-20250414", "claude-opus-4-20250514"],
        "auth_header": "x-api-key",
        "format": "anthropic"
    },
    "gemini": {
        "name": "Gemini",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        "models": ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
        "auth_header": "query",
        "format": "gemini"
    },
    "grok": {
        "name": "Grok",
        "base_url": "https://api.x.ai/v1/chat/completions",
        "models": ["grok-3", "grok-3-mini", "grok-2", "grok-2-mini"],
        "auth_header": "Bearer",
        "format": "openai"
    },
    "qwen": {
        "name": "Qwen",
        "base_url": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
        "models": ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long"],
        "auth_header": "Bearer",
        "format": "openai"
    },
    "nvidia": {
        "name": "NVIDIA",
        "base_url": "https://integrate.api.nvidia.com/v1/chat/completions",
        "models": ["meta/llama-3.3-70b-instruct", "nvidia/llama-3.1-nemotron-ultra-253b-v1",
                    "deepseek/deepseek-r1", "google/gemma-2-27b-it"],
        "auth_header": "Bearer",
        "format": "openai"
    },
    "kimi": {
        "name": "Kimi",
        "base_url": "https://api.moonshot.cn/v1/chat/completions",
        "models": ["moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"],
        "auth_header": "Bearer",
        "format": "openai"
    }
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html', providers=PROVIDERS)

@app.route('/api/providers', methods=['GET'])
def get_providers():
    return jsonify(PROVIDERS)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique = f"{uuid.uuid4().hex[:8]}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique)
        file.save(filepath)
        # Get file info
        size = os.path.getsize(filepath)
        ext = filename.rsplit('.', 1)[1].lower()
        file_type = 'image' if ext in {'png','jpg','jpeg','gif','webp','bmp','svg'} else \
                    'video' if ext in {'mp4','webm','mov','avi'} else 'file'
        # For images, create base64 preview
        preview = None
        if file_type == 'image':
            with open(filepath, 'rb') as f:
                preview = f"data:image/{ext};base64,{base64.b64encode(f.read()).decode()}"
        return jsonify({
            "id": unique,
            "name": filename,
            "type": file_type,
            "size": size,
            "preview": preview,
            "path": f"/uploads/{unique}"
        })
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/chat', methods=['POST'])
def chat():
    import urllib.request
    import ssl

    data = request.json
    provider = data.get('provider')
    api_key = data.get('api_key')
    model = data.get('model')
    messages = data.get('messages', [])
    files = data.get('files', [])

    if not provider or not api_key or not model:
        return jsonify({"error": "Missing provider, api_key, or model"}), 400

    config = PROVIDERS.get(provider)
    if not config:
        return jsonify({"error": f"Unknown provider: {provider}"}), 400

    ctx = ssl.create_default_context()

    try:
        if config['format'] == 'openai':
            url = config['base_url']
            payload = {
                "model": model,
                "messages": messages,
                "max_tokens": 4096
            }
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                        headers=headers, method='POST')
            with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
                result = json.loads(resp.read().decode())
            return jsonify({
                "content": result['choices'][0]['message']['content'],
                "model": result.get('model', model),
                "usage": result.get('usage', {})
            })

        elif config['format'] == 'anthropic':
            url = config['base_url']
            # Convert messages - separate system
            system_msg = ""
            chat_msgs = []
            for m in messages:
                if m['role'] == 'system':
                    system_msg = m['content']
                else:
                    chat_msgs.append(m)
            payload = {
                "model": model,
                "max_tokens": 4096,
                "messages": chat_msgs
            }
            if system_msg:
                payload["system"] = system_msg
            headers = {
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01"
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                        headers=headers, method='POST')
            with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
                result = json.loads(resp.read().decode())
            content = ""
            for block in result.get('content', []):
                if block.get('type') == 'text':
                    content += block['text']
            return jsonify({
                "content": content,
                "model": result.get('model', model),
                "usage": result.get('usage', {})
            })

        elif config['format'] == 'gemini':
            url = config['base_url'].replace('{model}', model) + f"?key={api_key}"
            # Convert messages to Gemini format
            contents = []
            for m in messages:
                if m['role'] == 'system':
                    continue
                role = 'user' if m['role'] == 'user' else 'model'
                contents.append({"role": role, "parts": [{"text": m['content']}]})
            payload = {"contents": contents}
            # Add system instruction
            sys_msg = next((m['content'] for m in messages if m['role'] == 'system'), None)
            if sys_msg:
                payload["systemInstruction"] = {"parts": [{"text": sys_msg}]}
            headers = {"Content-Type": "application/json"}
            req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                        headers=headers, method='POST')
            with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
                result = json.loads(resp.read().decode())
            content = result['candidates'][0]['content']['parts'][0]['text']
            return jsonify({
                "content": content,
                "model": model,
                "usage": {}
            })

    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return jsonify({"error": f"API error ({e.code}): {body[:500]}"}), e.code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/execute', methods=['POST'])
def execute_code():
    data = request.json
    code = data.get('code', '')
    if not code.strip():
        return jsonify({"error": "No code provided"}), 400

    # Security: basic sandboxing
    dangerous = ['os.system', 'subprocess', 'shutil.rmtree', '__import__("os")',
                 'eval(', 'exec(', 'open("/etc', 'open("/proc', 'rm -rf']
    for d in dangerous:
        if d in code:
            return jsonify({"output": f"⚠️ Blocked: '{d}' is not allowed for security.", "error": True})

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, dir='/tmp') as f:
        f.write(code)
        tmpfile = f.name

    try:
        result = subprocess.run(
            ['python3', tmpfile],
            capture_output=True, text=True, timeout=30,
            env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}
        )
        output = result.stdout
        if result.stderr:
            output += ("\n" if output else "") + result.stderr
        return jsonify({"output": output or "(no output)", "error": result.returncode != 0})
    except subprocess.TimeoutExpired:
        return jsonify({"output": "⚠️ Execution timed out (30s limit)", "error": True})
    except Exception as e:
        return jsonify({"output": str(e), "error": True})
    finally:
        os.unlink(tmpfile)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port, debug=False)
