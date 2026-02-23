# MiGPT Ultimate

> 小爱音箱终极解决方案

本项目是基于 [MiGPT-Next](https://github.com/idootop/migpt-next) 修改而来的升级版本。

## 功能特性

- **插件系统**：支持自定义插件扩展，可根据关键词触发特定功能
- **记忆系统**：内置对话记忆功能，AI 可记住之前的对话内容
- **多端支持**：
  - Web 界面：浏览器直接访问配置和控制
  - CLI 命令行工具：终端快速启动
- **灵活配置**：支持 YAML/JSON 配置文件
- **TTS 支持**：可配置 TTS Command 解决部分机型无声音问题

## 快速开始

### 使用 Web 界面

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
migpt-ultimate start -c config/default.yaml
```

## 配置说明

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
memory:
  enabled: false
  maxRecords: 100
ttsCommand:
  - 5
  - 1
```

### 配置项说明

| 配置项 | 说明 |
|--------|------|
| `speaker.userId` | 小米账号 ID（纯数字） |
| `speaker.password` | 小米账号密码 |
| `speaker.did` | 设备名称（如：小爱触屏音箱） |
| `speaker.passToken` | 可选，遇到验证码时需要 |
| `openai.model` | 使用的 AI 模型 |
| `openai.baseURL` | API 地址 |
| `openai.apiKey` | API 密钥 |
| `callAIKeywords` | 触发 AI 回复的关键词 |
| `ttsCommand` | TTS 命令 [SIID, AIID]，解决部分机型无声音问题 |
| `memory.enabled` | 是否启用记忆系统 |
| `memory.maxRecords` | 最大记忆条数 |
| `plugins` | 自定义插件列表 |

### 插件系统

插件需要在代码中定义，目前仅 CLI 支持。插件接口：

```typescript
interface Plugin {
  name: string;
  description: string;
  keywords?: string[];  // 触发关键词，不设置则始终触发
  execute(ctx: PluginContext): Promise<PluginResult | null>;
}

interface PluginContext {
  text: string;
  timestamp: number;
}

interface PluginResult {
  text?: string;
  handled?: boolean;
}
```

### 记忆系统

启用后，AI 会自动记住对话内容（CLI 版本）。

## 常见问题

### Q：一直提示登录失败？

一般是因为登录小米账号时触发了安全验证，请参考 [MiGPT-Next 教程](https://github.com/idootop/migpt-next/issues/4) 获取 PassToken。

### Q：小爱同学总是抢话？

如果不刷机，无法打断小爱回复。相关教程请移步 [Open-XiaoAI](https://github.com/idootop/open-xiaoai)。

### Q：控制台能看到 AI 回答，但没有声音？

部分机型（如小爱音箱 Play 增强版）需要配置 `ttsCommand` 参数。请到 [miot-spec](https://home.miot-spec.com) 查询你设备的 SIID 和 AIID。

## 项目结构

```
migpt-ultimate/
├── apps/
│   ├── cli/          # 命令行工具
│   └── web/          # Web 服务器
├── packages/
│   └── core/         # 核心库（插件系统、记忆系统）
└── config/           # 配置文件目录
```

## 依赖

- Node.js >= 18
- pnpm

## 免责声明

1. 本项目为开源非营利项目，仅供学术研究或个人测试用途。
2. 本项目与小米集团无任何隶属/合作关系。

## License

MIT License
