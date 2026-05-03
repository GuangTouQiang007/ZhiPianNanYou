# 虚拟男友聊天产品

## 项目概述

一款能自由打字聊天的虚拟男友应用，像真人一样有性格、有声音、会发照片，且不氪金。

**核心功能**：
- 4个差异化虚拟男友角色（温柔学长、高冷总监、阳光大男孩、文艺音乐人）
- LLM对话（流式输出，保持人设）
- TTS语音生成（每条回复自动生成语音）
- 图像生成（每4轮或关键词触发）

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **AI SDK**: coze-coding-dev-sdk

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts    # LLM对话API（流式输出）
│   │   │   ├── tts/route.ts     # TTS语音生成API
│   │   │   └── image/route.ts   # 图像生成API
│   │   ├── layout.tsx
│   │   └── page.tsx             # 主页面（角色选择+聊天界面）
│   ├── components/ui/           # Shadcn UI 组件库
│   ├── hooks/
│   ├── lib/
│   │   ├── characters.ts        # 角色配置和系统提示词
│   │   └── utils.ts
│   └── server.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 核心文件说明

### 1. 角色配置 (`src/lib/characters.ts`)

定义4个虚拟男友角色，每个角色包含：
- 基本信息：名字、身份、性格
- 说话风格：口癖、常用语句
- 外貌描述：用于图像生成
- TTS音色：语音合成使用的音色ID

### 2. 聊天API (`src/app/api/chat/route.ts`)

- 流式输出LLM回复
- 维护对话上下文（滑动窗口15轮）
- 解析记忆指令 `[MEMORY: key=value]`
- 解析图片指令 `[IMAGE: 描述]`

### 3. TTS API (`src/app/api/tts/route.ts`)

- 根据角色音色生成语音
- 返回音频URL

### 4. 图像API (`src/app/api/image/route.ts`)

- 根据提示词生成图片
- 返回图片URL

## AI能力触发机制

| AI能力 | 触发时机 | 输出形式 |
|--------|----------|----------|
| LLM对话 | 用户每次发送消息 | 文字回复（流式） |
| TTS语音 | LLM每次回复后自动触发 | 语音气泡 |
| 图像生成 | ①每4轮自动触发 ②用户说"想看你"等关键词 | 图片 |

## 开发规范

### 包管理

**仅允许使用 pnpm**：
- `pnpm add <package>` - 安装依赖
- `pnpm install` - 安装所有依赖
- `pnpm remove <package>` - 移除依赖

### Hydration 错误预防

严禁在 JSX 渲染逻辑中直接使用 `typeof window`、`Date.now()`、`Math.random()` 等动态数据。必须使用 `'use client'` 并配合 `useEffect` + `useState`。

### UI 设计规范

默认采用 shadcn/ui 组件、风格和规范。

## 构建与运行

```bash
# 开发环境
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

## 明确不做的事

- ❌ 用户注册/登录
- ❌ 数据持久化（刷新=清空对话）
- ❌ NSFW内容
- ❌ 多人聊天/群聊
- ❌ 用户自定义角色
- ❌ 好感度系统
- ❌ 用户语音/图片输入
- ❌ 付费/充值
