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
      - AUTH_USERNAME=your_username
      - AUTH_PASSWORD=your_password
    restart: unless-stopped
```

```bash
docker-compose up -d
```

然后访问 **http://localhost:36592** 输入账号密码登录后，在 Web 界面上配置你的小米账号和 API Key 即可。

## 登录认证

部署后首次访问需要登录，默认账号：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `AUTH_USERNAME` | admin | 登录用户名 |
| `AUTH_PASSWORD` | password | 登录密码 |

建议在部署时通过环境变量修改默认账号密码，确保安全。

## 功能特性

- **Web 管理界面**：浏览器直接配置和控制，实时显示对话日志
- **登录认证**：单用户账号密码保护，支持环境变量配置
- **实时日志**：右侧面板显示用户提问和 AI 回答，无需查看后台日志
- **插件系统**：支持自定义插件扩展，可根据关键词触发特定功能
- **记忆系统**：内置对话记忆功能，AI 可记住之前的对话内容
- **CLI 命令行工具**：终端快速启动与控制
- **自动打断小爱回复**：服务启动后自动打断小爱自身语音，AI 完全接管对话
- **Speak 命令**：CLI 直接让小爱音箱 TTS 说话
- **Loop-Speak 命令**：循环播报指定文字，支持指定次数或无限循环，随时停止
- **Volume 命令**：CLI 控制小爱音箱音量（查询、设置、上调、下调）
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

**启动服务**

```shell
cd packages/core
pnpm install
pnpm build

cd apps/cli
pnpm install
pnpm build
migpt-ultimate start -c config.yaml
```

**让小爱音箱说话**

```shell
migpt-ultimate speak -t "你好世界" -c config.yaml
```

**循环播报**

```shell
# 无限循环播报（直到手动停止）
migpt-ultimate loop-speak start -t "请注意" -c config.yaml

# 播报 3 次后自动停止
migpt-ultimate loop-speak start -t "请注意" -n 3 -c config.yaml

# MIoT 模式下指定播报间隔（默认5秒）
migpt-ultimate loop-speak start -t "请注意" -i 10 -c config.yaml

# 手动停止循环播报
migpt-ultimate loop-speak stop -c config.yaml
```

| 参数 | 说明 |
|------|------|
| `-t, --text` | 播报文本（必选） |
| `-n, --count` | 播报次数，0=无限循环（默认 0） |
| `-i, --interval` | MIoT 模式播报间隔秒数（默认 5） |
| `-c, --config` | 配置文件路径（默认 ./config.yaml） |

**音量控制**

```shell
# 查询当前音量
migpt-ultimate volume get -c config.yaml

# 设置音量（6-100）
migpt-ultimate volume set -v 50 -c config.yaml

# 音量上调（默认+10）
migpt-ultimate volume up -c config.yaml

# 音量下调 20
migpt-ultimate volume down -s 20 -c config.yaml
```

| 参数 | 说明 |
|------|------|
| `-v, --value` | 目标音量值（6-100，set 命令必选） |
| `-s, --step` | 调整幅度（up/down 默认 10） |
| `-c, --config` | 配置文件路径（默认 ./config.yaml） |

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

服务启动后，小爱自身语音会被自动打断（可能短暂说出 1-2 个字后立即停止），AI 完全接管对话回复。系统提醒、闹钟等非对话类语音不受影响。

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
