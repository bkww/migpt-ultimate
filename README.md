# MiGPT Ultimate

> 小爱音箱终极解决方案

本项目是基于 [MiGPT-Next](https://github.com/idootop/migpt-next) 修改而来的升级版本。

## 一键部署（推荐）

只需两步即可运行：

```yaml
services:
  migpt-ultimate:
    image: zhuzhu88920/migpt-ultimate:latest
    ports:
      - "36592:36592"
    volumes:
      - ./config:/app/config
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

```bash
docker-compose up -d
```

然后访问 **http://localhost:36592** 在 Web 界面上配置你的小米账号和 API Key 即可。

## 功能特性

- **Web 管理界面**：浏览器直接配置和控制，实时显示对话日志
- **实时日志**：右侧面板显示用户提问和 AI 回答，无需查看后台日志
- **插件系统**：支持自定义插件扩展，可根据关键词触发特定功能
- **记忆系统**：内置对话记忆功能，AI 可记住之前的对话内容
- **CLI 命令行工具**：终端快速启动
- **TTS 支持**：可配置 TTS Command 解决部分机型无声音问题

## 本地开发

### 使用 Node.js

```shell
cd apps/web
pnpm install
pnpm build
pnpm start
```

访问 http://localhost:36592

### 使用 CLI

```shell
cd apps/cli
pnpm install
pnpm build
migpt-ultimate start -c config.yaml
```

## 配置说明

启动后可在 Web 界面上配置，或手动创建 `config/default.yaml`：

```yaml
speaker:
  userId: "your_user_id"
  password: "your_password"
  did: "小爱触屏音箱"
openai:
  model: gpt-4o-mini
  baseURL: https://api.openai.com/v1
  apiKey: sk-xxx...
prompt:
  system: 你是一个智能助手小爱同学。
callAIKeywords:
  - "请"
  - "你"
ttsCommand:
  - 5
  - 1
```

| 配置项 | 说明 |
|--------|------|
| `speaker.userId` | 小米账号 ID（纯数字） |
| `speaker.password` | 小米账号密码 |
| `speaker.did` | 设备名称 |
| `speaker.passToken` | 可选，遇到验证码时需要 |
| `openai.*` | AI 模型配置 |
| `callAIKeywords` | 触发 AI 回复的关键词 |
| `ttsCommand` | TTS 命令 [SIID, AIID] |

## 常见问题

### Q：一直提示登录失败？

请参考 [MiGPT-Next 教程](https://mp.weixin.qq.com/s/tmtXvcSu5EP_bDIG_KcYnA) 获取 PassToken。

### Q：小爱同学总是抢话？

如果不刷机，无法打断小爱回复。相关教程请移步 [Open-XiaoAI](https://github.com/idootop/open-xiaoai)。

### Q：控制台能看到 AI 回答，但没有声音？

部分机型需要配置 `ttsCommand` 参数。请到 [miot-spec](https://home.miot-spec.com) 查询。

## 项目结构

```
migpt-ultimate/
├── apps/
│   ├── cli/          # 命令行工具
│   └── web/          # Web 服务器
├── packages/
│   └── core/         # 核心库
├── config/           # 配置文件
├── docker-compose.yml
└── Dockerfile.web
```

## 依赖

- Node.js >= 18
- pnpm
- Docker & Docker Compose

## 免责声明

1. 本项目为开源非营利项目，仅供学术研究或个人测试用途。
2. 本项目与小米集团无任何隶属/合作关系。

## License

MIT License
