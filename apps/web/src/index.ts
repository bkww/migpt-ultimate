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
          <div style="display:flex;gap:8px;">
            <input type="text" class="form-input" id="did" placeholder="小爱音箱" style="flex:1;">
            <button class="btn-scan" onclick="fetchDevices()">获取设备</button>
          </div>
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
        <button type="button" class="btn-action btn-save" onclick="saveConfig()">保存配置</button>
        <button type="button" class="btn-action btn-load" onclick="loadConfig()">加载</button>
        <button type="button" class="btn-action btn-scan" onclick="showModal()">获取凭证</button>
      </div>
    </div>
  </div>
  <div id="modalOverlay" class="modal-overlay" onclick="closeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <h3>获取小米账号凭证</h3>
      <ol style="margin-bottom:16px;padding-left:20px;color:#666;font-size:13px;line-height:1.8;">
        <li>点击下方「打开登录页面」按钮</li>
        <li>使用小米账号登录（如已登录可跳过）</li>
        <li>登录成功后，<strong>不要点击退出</strong>，直接关闭标签页</li>
        <li>在当前页面按 <strong>F12</strong> 打开开发者工具</li>
        <li>切换到 <strong>Application</strong> 标签</li>
        <li>左侧找到 <strong>Cookies</strong> -> <strong>https://account.mi.com</strong></li>
        <li>复制 <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;">userId</code> 和 <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;">pass_token</code> 的值</li>
      </ol>
      <p style="color:#e74c3c;font-size:12px;margin-bottom:16px;">⚠️ 复制完成后立即关闭小米登录页面，token 退出后失效！</p>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-secondary" onclick="closeModal()">关闭</button>
        <button class="modal-btn modal-btn-primary" onclick="openMiLogin()">打开登录页面</button>
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
    function getValue(id) {
      const el = document.getElementById(id);
      return el ? el.value : '';
    }
    async function saveConfig() {
      try {
        if (!getValue('did').trim()) {
          showToast('请输入设备名称', 'error');
          return;
        }
        const ttsStr = getValue('ttsCommand').trim();
        let ttsCommand = null;
        if (ttsStr) {
          const parts = ttsStr.split(',').map(s => parseInt(s.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ttsCommand = parts;
        }
        const config = {
          speaker: {
            userId: getValue('userId'),
            password: getValue('password'),
            passToken: getValue('passToken'),
            did: getValue('did').trim()
          },
          openai: {
            model: getValue('model'),
            baseURL: getValue('baseURL'),
            apiKey: getValue('apiKey')
          },
          prompt: { system: '你是一个智能助手小爱同学。请用友好的语气回答用户的问题。' },
          callAIKeywords: ['请', '你'],
          ttsCommand
        };
        const res = await fetch('/api/config', {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(config)
        });
        const data = await res.json();
        showToast(data.success ? '配置已保存' : (data.error || '保存失败'), data.success ? 'success' : 'error');
      } catch(e) { 
        console.error('Save config error:', e);
        showToast('保存失败: ' + String(e), 'error'); 
      }
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
    function openMiLogin() {
      window.open('https://account.mi.com/', '_blank');
    }
    async function fetchDevices() {
      const userId = getValue('userId');
      const password = getValue('password');
      if (!userId || !password) {
        showToast('请先填写小米账号和密码', 'error');
        return;
      }
      const btn = document.querySelector('.btn-scan');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '获取中...';
      }
      try {
        const res = await fetch('/api/devices', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, password })
        });
        const data = await res.json();
        if (data.error) {
          showToast(data.error, 'error');
        } else if (data.devices && data.devices.length > 0) {
          var list = '';
          data.devices.forEach(function(d) { list = list + d.name + ' (' + d.did + ')\n'; });
          var selected = prompt('请选择设备（输入设备名称）：\n\n' + list + '\n直接回车使用第一个设备');
          if (selected) {
            var device = data.devices.find(function(d) { return d.name === selected || d.name + ' (' + d.did + ')' === selected; });
            if (device) {
              document.getElementById('did').value = device.name;
              showToast('设备已选择: ' + device.name, 'success');
            }
          } else if (selected === '') {
            document.getElementById('did').value = data.devices[0].name;
            showToast('设备已选择: ' + data.devices[0].name, 'success');
          }
        } else {
          showToast('未找到小爱音箱设备', 'error');
        }
      } catch(e) {
        showToast('获取设备失败', 'error');
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = '获取设备';
      }
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

app.post('/api/devices', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ error: '请先填写小米账号和密码' });
    }
    const { getMIoT } = await import('@mi-gpt/miot');
    const speaker = { userId, password, did: '' };
    const miot = await getMIoT(speaker);
    if (!miot) {
      return res.status(500).json({ error: '登录失败，请检查账号密码' });
    }
    const devices = await miot.getDevices();
    const speakerDevices = (devices ?? []).map((d: any) => ({
      did: d.did,
      name: d.name,
      model: d.model,
    }));
    res.json({ devices: speakerDevices });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

const port = parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
app.listen(port, () => {
  console.log(`\n  MiGPT Ultimate  http://localhost:${port}\n`);
});
