# hzx的工作台

一个深海极光主题的个人效率工作台（Personal OS）：任务、项目、番茄钟、四六级背单词、笔记、收集箱，一个入口全联动。

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61dafb) ![Prisma](https://img.shields.io/badge/Prisma-6-2d3748) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

## ✨ 功能

| 模块 | 说明 |
|------|------|
| **总览 Dashboard** | 按时段问候、实时时钟、今日待办 / 番茄 / 单词 / 收集箱统计卡、快捷入口 |
| **任务** | 列表 / 看板双视图，优先级、截止日期、所属项目，多维筛选 |
| **项目** | 彩色项目卡片，任务进度条，点击穿透到任务筛选 |
| **番茄钟** | 发光 SVG 进度环、专注/休息多模式、关联任务、自动落库、近 7 天统计 |
| **背单词** | 6662 词四六级词库（去重后），认识 / 模糊 / 不认识三档，间隔重复算法（10 分钟 → 1 天 → 3 天 → 7 天 → 14 天 → 30 天 → 60 天），连续打卡统计 |
| **笔记** | 双栏编辑，防抖自动保存 |
| **收集箱** | 快速捕获灵感，一键转为任务 / 笔记（GTD 式清空大脑） |
| **全局搜索** | `⌘K` / `Ctrl+K` 呼出，跨任务 / 项目 / 笔记 / 单词 |

模块互相联动：番茄钟可关联任务计时，Dashboard 聚合今日任务、专注时长与单词进度。

## 🎨 设计

**深海极光**：深蓝黑底色 + 紫 / 青 / 薄荷动态极光 + 玻璃拟态卡片 + 中式衬线标题 + 发光按钮。
字体（Noto Sans SC / Noto Serif SC）在 `npm install` 时由 `scripts/fetch-fonts.mjs` 自动从
fontsource CDN 拉取到 `app/fonts/`（版本 pinned 为 5.1.0），构建与访问都不依赖 Google Fonts，国内直接可用。

## 🛠 技术栈

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + Framer Motion + Lucide Icons
- Prisma 6 + SQLite（本地）/ PostgreSQL（生产，见下方）

## 🚀 本地运行

```bash
npm install
npx prisma db push        # 建表（SQLite）
npx tsx prisma/seed.ts    # 导入四六级词库（约 6662 词）
npx tsx prisma/demo.ts    # 导入演示数据（可选）
npm run dev               # http://localhost:3000
```

> 说明：沙箱网络下 Prisma 官方引擎下载地址不可达，本仓库文档记录了解决办法：
> 手动从 `https://binaries.prisma.sh/all_commits/<commit>/<target>/<name>.gz`
> 下载引擎到 `node_modules/@prisma/engines/`，或设置
> `PRISMA_QUERY_ENGINE_LIBRARY` / `PRISMA_SCHEMA_ENGINE_BINARY` 环境变量。
> 正常网络下 `npm install` 会自动完成。

## 🌐 部署到 Vercel（生产）

Vercel 的文件系统是临时的，SQLite 不适合生产。本项目默认使用 PostgreSQL（生产用 [Neon](https://neon.tech) 免费版即可）：

1. 在 Neon 创建项目，把 pooled 连接串（带 `?sslmode=require`）填入 Vercel 项目的 `DATABASE_URL` 环境变量
2. `DATABASE_URL="<生产连接串>" npx prisma db push`（建表）
3. `DATABASE_URL="<生产连接串>" npx tsx prisma/seed.ts`（灌入 6662 四六级词库）
4. 连接 GitHub 仓库后导入 Vercel 部署即可（构建命令已含 `prisma generate`）

## 📖 词库来源

四六级词汇数据来自 [KyleBing/english-vocabulary](https://github.com/KyleBing/english-vocabulary)（MIT License），原始 13159 条按课时编排，本项目按单词去重后导入 6662 条。感谢原作者整理。
