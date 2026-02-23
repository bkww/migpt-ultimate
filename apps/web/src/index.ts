import express from 'express';
import { MiGPT, type MiGPTConfig } from '@mi-gpt/next';
import { ChatBot } from '@mi-gpt/chat';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const DEFAULT_PORT = 36592;
const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const CONFIG_DIR = join(ROOT_DIR, 'config');

const kBanner = `
  __  __ _    _  _____    _____ _____ ____   ___  ____  
 |  \\/  | |  | |/ /   \\  |_   _|_   _/ __ \\ / _ \\/ ___| 
 | |\\/| | |  | ' /| |_) |   | |   | || |  | | | | \\___ \\ 
 | |  | | |__| . \\|  _ <    | |   | || |  | | |_| |___) |
 |_|  |_|_____|_|\\_\\_| \\_\\   |_|   |_| \\___/ \\___/|____/ 
                                                        
  Ultimate - 小爱音箱终极解决方案 v0.1.0
`;

const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MiGPT Ultimate</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
    .container { max-width: 480px; margin: 0 auto; }
    .header { text-align: center; color: white; margin-bottom: 20px; }
    .header h1 { font-size: 28px; font-weight: 600; margin-bottom: 5px; }
    .header p { opacity: 0.8; font-size: 14px; }
    .card { background: white; border-radius: 16px; padding: 20px; margin-bottom: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
    .status-bar { display: flex; align-items: center; justify-content: space-between; padding: 15px; border-radius: 12px; margin-bottom: 15px; }
    .status-bar.running { background: linear-gradient(135deg, #11998e, #38ef7d); }
    .status-bar.stopped { background: linear-gradient(135deg, #eb3349, #f45c43); }
    .status-indicator { display: flex; align-items: center; gap: 10px; color: white; font-weight: 600; }
    .status-dot { width: 12px; height: 12px; border-radius: 50%; background: white; animation: pulse 1.5s infinite; }
    .status-bar.stopped .status-dot { animation: none; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .btn-group { display: flex; gap: 10px; }
    .btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-start { background: rgba(255,255,255,0.9); color: #11998e; }
    .btn-stop { background: rgba(255,255,255,0.9); color: #eb3349; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .form-section { margin-bottom: 15px; }
    .form-label { display: block; font-size: 12px; font-weight: 600; color: #666; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-input { width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 10px; font-size: 14px; transition: border-color 0.2s; }
    .form-input:focus { outline: none; border-color: #667eea; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .form-hint { font-size: 11px; color: #999; margin-top: 4px; }
    .form-link { color: #667eea; text-decoration: none; }
    .form-link:hover { text-decoration: underline; }
    .actions { display: flex; gap: 10px; margin-top: 15px; }
    .btn-action { flex: 1; padding: 14px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-save { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .btn-load { background: #f5f5f5; color: #666; }
    .btn-scan { background: #ff6900; color: white; }
    .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 10px; color: white; font-weight: 500; font-size: 14px; opacity: 0; transition: opacity 0.3s; z-index: 1000; }
    .toast.show { opacity: 1; }
    .toast.success { background: linear-gradient(135deg, #11998e, #38ef7d); }
    .toast.error { background: linear-gradient(135deg, #eb3349, #f45c43); }
    .divider { height: 1px; background: #eee; margin: 15px 0; }
    textarea.form-input { resize: none; height: 60px; font-family: monospace; font-size: 12px; }
    .collapse-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 10px 0; }
    .collapse-header h4 { font-size: 13px; color: #888; font-weight: 500; }
    .collapse-arrow { transition: transform 0.2s; }
    .collapse-content { max-height: 0; overflow: hidden; transition: max-height 0.3s; }
    .collapse-content.open { max-height: 200px; }
    .btn-scan { background: #ff6900; color: white; padding: 8px 12px; font-size: 12px; border-radius: 6px; border: none; cursor: pointer; margin-left: 10px; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 2000; }
    .modal-overlay.show { display: flex; }
    .modal { background: white; border-radius: 16px; padding: 24px; max-width: 400px; width: 90%; max-height: 80vh; overflow-y: auto; }
    .modal h3 { margin: 0 0 16px; color: #333; }
    .modal p { color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 12px; }
    .modal ol { color: #666; font-size: 13px; padding-left: 20px; margin-bottom: 16px; }
    .modal li { margin-bottom: 8px; }
    .modal-close { background: #eee; color: #666; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; }
    .modal-close:hover { background: #ddd; }
    .modal-input { width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 14px; margin-bottom: 12px; font-family: monospace; }
    .modal-input:focus { outline: none; border-color: #667eea; }
    .modal-actions { display: flex; gap: 10px; }
    .modal-btn { flex: 1; padding: 12px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .modal-btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .modal-btn-secondary { background: #eee; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MiGPT Ultimate</h1>
      <p>小爱音箱终极解决方案</p>
    </div>
    <div class="card">
      <div id="statusBar" class="status-bar stopped">
        <div class="status-indicator">
          <div class="status-dot"></div>
          <span id="statusText">已停止</span>
        </div>
        <div class="btn-group">
          <button class="btn btn-start" id="btnStart" onclick="start()">启动</button>
          <button class="btn btn-stop" id="btnStop" onclick="stop()" disabled>停止</button>
        </div>
      </div>
      <div class="form-section">
        <label class="form-label">小米 ID</label>
        <input type="text" class="form-input" id="userId" placeholder="小米账号ID（纯数字）">
      </div>
      <div class="form-row">
        <div class="form-section">
          <label class="form-label">密码</label>
          <input type="password" class="form-input" id="password" placeholder="小米账号密码">
        </div>
        <div class="form-section">
          <label class="form-label">设备名称</label>
          <input type="text" class="form-input" id="did" placeholder="小爱音箱">
        </div>
      </div>
      <div class="form-section">
        <label class="form-label">PassToken <span style="font-weight:normal">(可选)</span></label>
        <textarea class="form-input" id="passToken" placeholder="遇到验证码时需要填写..."></textarea>
        <div class="form-hint">获取教程: <a href="https://github.com/idootop/migpt-next/issues/4" target="_blank" class="form-link">点击查看</a></div>
      </div>
      <div class="divider"></div>
      <div class="form-row">
        <div class="form-section">
          <label class="form-label">API Base URL</label>
          <input type="text" class="form-input" id="baseURL" value="https://api.openai.com/v1">
        </div>
        <div class="form-section">
          <label class="form-label">模型</label>
          <input type="text" class="form-input" id="model" value="gpt-4o-mini">
        </div>
      </div>
      <div class="form-section">
        <label class="form-label">API Key</label>
        <input type="password" class="form-input" id="apiKey" placeholder="sk-...">
      </div>
      <div class="collapse-header" onclick="toggleCollapse()">
        <h4>高级选项</h4>
        <span class="collapse-arrow" id="collapseArrow">▼</span>
      </div>
      <div class="collapse-content" id="collapseContent">
        <div class="form-section">
          <label class="form-label">TTS Command <span style="font-weight:normal">(SIID,AIID)</span></label>
          <input type="text" class="form-input" id="ttsCommand" placeholder="如: 5,1">
          <div class="form-hint">若小爱不播放AI回复，填写此参数。查询: <a href="https://home.miot-spec.com" target="_blank" class="form-link">miot-spec</a></div>
        </div>
      </div>
      <div class="actions">
        <button class="btn-action btn-save" onclick="saveConfig()">保存配置</button>
        <button class="btn-action btn-load" onclick="loadConfig()">加载</button>
        <button class="btn-action btn-scan" onclick="showModal()">获取凭证</button>
      </div>
    </div>
  </div>
  <div id="modalOverlay" class="modal-overlay" onclick="closeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <h3>获取小米账号凭证</h3>
      <p>请按以下步骤获取登录凭证：</p>
      <ol>
        <li>在手机上打开「小爱音箱」App</li>
        <li>进入「我的」-「设置」-「登录设备」</li>
        <li>点击需要使用的设备，记录设备名称 (did)</li>
        <li>在 App 中点击头像进入账号设置查看账号 ID</li>
      </ol>
      <p><strong>关于 PassToken：</strong><br>遇到登录验证码时需要填写。可参考 <a href="https://github.com/idootop/migpt-next/issues/4" target="_blank" style="color:#667eea">此教程</a> 获取。</p>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-secondary" onclick="closeModal()">关闭</button>
      </div>
    </div>
  </div>
  <div id="toast" class="toast"></div>
  <script>
    function toggleCollapse() {
      const c = document.getElementById('collapseContent');
      const a = document.getElementById('collapseArrow');
      c.classList.toggle('open');
      a.style.transform = c.classList.contains('open') ? 'rotate(180deg)' : '';
    }
    async function updateStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const bar = document.getElementById('statusBar');
        const text = document.getElementById('statusText');
        const btnStart = document.getElementById('btnStart');
        const btnStop = document.getElementById('btnStop');
        bar.className = 'status-bar ' + (data.running ? 'running' : 'stopped');
        text.textContent = data.running ? '运行中' : '已停止';
        btnStart.disabled = data.running;
        btnStop.disabled = !data.running;
      } catch(e) {}
    }
    async function loadConfig() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.config) {
          const c = data.config;
          document.getElementById('userId').value = c.speaker?.userId || '';
          document.getElementById('password').value = c.speaker?.password || '';
          document.getElementById('passToken').value = c.speaker?.passToken || '';
          document.getElementById('did').value = c.speaker?.did || '';
          document.getElementById('model').value = c.openai?.model || 'gpt-4o-mini';
          document.getElementById('baseURL').value = c.openai?.baseURL || 'https://api.openai.com/v1';
          document.getElementById('apiKey').value = c.openai?.apiKey || '';
          if (c.ttsCommand) document.getElementById('ttsCommand').value = c.ttsCommand.join(',');
          showToast('配置已加载', 'success');
        }
      } catch(e) { showToast('加载失败', 'error'); }
    }
    async function saveConfig() {
      if (!document.getElementById('did').value.trim()) {
        showToast('请输入设备名称', 'error');
        return;
      }
      const ttsStr = document.getElementById('ttsCommand').value.trim();
      let ttsCommand = null;
      if (ttsStr) {
        const parts = ttsStr.split(',').map(s => parseInt(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ttsCommand = parts;
      }
      const config = {
        speaker: {
          userId: document.getElementById('userId').value,
          password: document.getElementById('password').value,
          passToken: document.getElementById('passToken').value,
          did: document.getElementById('did').value.trim()
        },
        openai: {
          model: document.getElementById('model').value,
          baseURL: document.getElementById('baseURL').value,
          apiKey: document.getElementById('apiKey').value
        },
        prompt: { system: '你是一个智能助手小爱同学。请用友好的语气回答用户的问题。' },
        callAIKeywords: ['请', '你'],
        ttsCommand
      };
      try {
        const res = await fetch('/api/config', {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(config)
        });
        showToast(res.ok ? '配置已保存' : '保存失败', res.ok ? 'success' : 'error');
      } catch(e) { showToast('保存失败', 'error'); }
    }
    async function start() {
      const btn = document.getElementById('btnStart');
      btn.disabled = true;
      btn.textContent = '启动中...';
      try {
        const res = await fetch('/api/start', {method: 'POST'});
        const data = await res.json();
        if (data.error) {
          showToast(data.error, 'error');
          btn.disabled = false;
          btn.textContent = '启动';
        } else {
          setTimeout(updateStatus, 500);
        }
      } catch(e) {
        btn.disabled = false;
        btn.textContent = '启动';
      }
    }
    async function stop() {
      document.getElementById('btnStop').disabled = true;
      await fetch('/api/stop', {method: 'POST'});
      updateStatus();
    }
    function showToast(msg, type) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast ' + type + ' show';
      setTimeout(() => t.classList.remove('show'), 2000);
    }
    function showModal() {
      document.getElementById('modalOverlay').classList.add('show');
    }
    function closeModal(e) {
      if (e && e.target !== e.currentTarget) return;
      document.getElementById('modalOverlay').classList.remove('show');
    }
    loadConfig();
    updateStatus();
    setInterval(updateStatus, 2000);
  </script>
</body>
</html>`;

interface WebConfig {
  speaker: {
    userId: string;
    password: string;
    passToken?: string;
    did: string;
  };
  openai: {
    model: string;
    baseURL: string;
    apiKey: string;
  };
  prompt?: { system: string };
  callAIKeywords?: string[];
  ttsCommand?: [number, number];
}

function loadConfig(configPath: string): WebConfig {
  if (!existsSync(configPath)) {
    const defaultConfig: WebConfig = {
      speaker: { userId: '', password: '', did: '' },
      openai: { model: 'gpt-4o-mini', baseURL: 'https://api.openai.com/v1', apiKey: '' },
      prompt: { system: '你是一个智能助手小爱同学。' },
      callAIKeywords: ['请', '你'],
    };
    writeFileSync(configPath, YAML.stringify(defaultConfig), 'utf-8');
    return defaultConfig;
  }
  const content = readFileSync(configPath, 'utf-8');
  return YAML.parse(content) as WebConfig;
}

function buildMiGPTConfig(webConfig: WebConfig): MiGPTConfig {
  const ttsCommand = webConfig.ttsCommand;
  return {
    speaker: webConfig.speaker,
    openai: webConfig.openai,
    prompt: webConfig.prompt,
    callAIKeywords: webConfig.callAIKeywords || ['请', '你'],
    async onMessage(engine, msg) {
      const keywords = webConfig.callAIKeywords || ['请', '你'];
      if (!keywords.some((e) => msg.text.startsWith(e))) {
        return undefined;
      }
      await engine.speaker.abortXiaoAI();
      const text = await ChatBot.chat(msg);
      if (!text) return { handled: true };
      console.log(`🔊 ${text}`);
      if (ttsCommand) {
        await engine.MiOT.doAction(ttsCommand[0], ttsCommand[1], text);
      } else {
        await engine.speaker.play({ text });
      }
      return { handled: true };
    },
  };
}

const originalLog = console.log;
function suppressBanner(str: string): boolean {
  return str.includes('del.wang') || str.includes('MiGPT-Next v') || 
         str.includes('/ $$') || str.includes('/$$$$') || str.includes('| $$');
}

let isRunning = false;
let configPath = join(CONFIG_DIR, 'default.yaml');

const app = express();
app.use(express.json());

app.get('/', (_req, res) => res.send(HTML));

app.get('/api/status', (_req, res) => res.json({ running: isRunning }));

app.get('/api/config', (_req, res) => {
  try {
    if (existsSync(configPath)) {
      const config = loadConfig(configPath);
      res.json({ config });
    } else {
      res.json({ config: null });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.put('/api/config', (req, res) => {
  try {
    writeFileSync(configPath, YAML.stringify(req.body), 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/start', async (_req, res) => {
  if (isRunning) {
    return res.json({ success: true });
  }
  try {
    const webConfig = loadConfig(configPath);
    const migptConfig = buildMiGPTConfig(webConfig);
    
    console.log = (...args: any[]) => {
      const str = args.join(' ');
      if (!suppressBanner(str)) originalLog.apply(console, args);
    };
    
    console.log(kBanner);
    MiGPT.start(migptConfig);
    isRunning = true;
    console.log('✅ 服务已启动');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/stop', async (_req, res) => {
  if (isRunning) {
    await MiGPT.stop();
    isRunning = false;
    console.log = originalLog;
    console.log('🛑 已停止');
  }
  res.json({ success: true });
});

const port = parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
app.listen(port, () => {
  console.log(`\n  MiGPT Ultimate  http://localhost:${port}\n`);
});
