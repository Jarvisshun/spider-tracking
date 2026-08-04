# 🦐 Spider-Man Tracker 中文翻译版 + 用户上传社区平台

> 基于 spideytracker.net（Sony Pictures × Samsung 联合推出的 Spider-Man: Brand New Day 营销站点）  
> 项目路径：`E:\Hermes project\spider-tracking-use_opensquilla`  
> 创建时间：2026-08-03 | 创建者：OpenSquilla

---

## 一、项目目标

在原 [spideytracker.net](https://spideytracker.net/) 基础上，创建一个**可本地部署的副本网站**，实现：

1. **中英双语切换**：保留原 UI 不变，仅添加一个语言切换选项，将英文界面、地图地名翻译成中文
2. **视频保留原样**：原站 YouTube 英文视频照搬过来，可正常播放，不做翻译
3. **用户上传系统（Phase 2）**：用户在手机上开启定位，拍摄/上传蜘蛛侠相关视频或图片（配文字描述），其他用户可见；系统自动审核内容相关性，非蜘蛛侠内容拒绝上传
4. **社交媒体集成扩展**：原站仅连接 X (Twitter)，研究扩展其他平台

---

## 二、原站技术调研摘要

### 2.1 技术栈

| 项目 | 详情 |
|------|------|
| 构建工具 | Astro v6.2.2 (SSG) |
| 地图引擎 | Google Maps JavaScript API（Maps JS API + Advanced Markers + Street View + Cloud-based Maps Styling） |
| API Key | `AIzaSyA_PELuIzk8A1pMtH7A5lkBXgJumQiUhLg`（原站域名绑定，本地需替换为自己的 Key） |
| 社交整合 | X (Twitter) @spideytracker — 通过 `./x-feed.php` 后端端点拉取帖子 |
| 视频源 | YouTube 嵌入：Ned 开场白 `0ceb-6OoJw8` + 电影预告片 `P3uI5sLosKU` |
| 国际化 | 已预留 `data-i18n` 属性体系（118 个翻译键），`languageToggle` 组件存在但默认禁用 |
| 配置驱动 | `window.siteInit` JSON 对象包含全部 UI 文本、SEO、菜单项、Preloader 日志等 |
| 监控 | New Relic Browser Agent + Google Tag Manager |
| Cookie 合规 | OneTrust (cookielaw.org) |
| 部署 | Apache 服务器，返回 `X-Frame-Options: SAMEORIGIN` |

### 2.2 关键发现

- **无法 iframe 嵌入**：原站返回 `X-Frame-Options: SAMEORIGIN`，必须下载全部资源本地重建
- **i18n 基础完善**：原站已有 118 个 `data-i18n` 键，`siteInit.json` 包含全部配置文本，`languageToggle` 配置存在但 `enabled: false`
- **地图语言可控**：Google Maps JS API 支持 `language=zh-CN` 参数，切换后地名自动本地化
- **视频为 YouTube 嵌入**：保持原 URL 不变即可正常播放

### 2.3 已下载本地资源

95 个静态资源全部下载成功到 `src/` 目录：

| 类型 | 数量 | 位置 |
|------|------|------|
| JS Bundle | 34 个 | `src/_astro/` |
| CSS 样式表 | 8 个 | `src/_astro/` |
| UI 图片/图标 | 54 个 | `src/images/` |
| 同意管理脚本 | 1 个 | `src/scripts/` |
| 原始 HTML | 195KB | `src/original_index.html` |
| 配置 JSON | 15KB | `src/siteInit.json` |

### 2.4 原站功能模块（125+ 个 UI 区块）

1. **Preloader** — 复古终端启动动画 + 33 行模拟启动日志
2. **SoundOptIn** — 声音设置选择面板
3. **IntroVideo** — Ned Leeds 的 YouTube 视频消息
4. **MapView (2D/3D/Street View)** — 交互式世界地图，三种模式切换
5. **MapFilters** — 已确认/传闻目击标记筛选
6. **ActivityLog** — 目击和事件活动日志时间线
7. **EventsPanel** — 线下活动目录
8. **XFeed** — X/Twitter @spideytracker 实时帖子流
9. **WebWatch** — "坏家伙"反派信息百科面板
10. **SamsungExclusives** — Samsung 独家下载（壁纸/贴纸/表情包）
11. **MainMenu** — 主导航菜单
12. **Lightbox** — 视频/图片灯箱浏览器
13. **HelpScreen** — 帮助引导屏幕
14. **Radar** — 雷达定位控件
15. **NotificationCenter** — 通知中心 + 消息滚动条
16. **WatchTrailer / GetTickets** — 预告片 & 购票入口
17. **Footer** — 页脚版权信息

---

## 三、社交媒体集成可行性分析

原站仅连接 X (Twitter)。以下平台可扩展集成：

| 平台 | API 可用性 | 集成方式 | 适合度 | 备注 |
|------|-----------|----------|--------|------|
| **X (Twitter)** | API v2 / oEmbed | 原站已用，`x-feed.php` 代理拉取 | ✅ 已存在 | 需 API Key |
| **YouTube** | Data API v3 | 搜索/展示 Spider-Man 相关视频 | ⭐⭐⭐⭐ | 推荐，免费额度充足 |
| **Reddit** | JSON API / OAuth | 读取 r/SpiderMan 公开帖子 | ⭐⭐⭐⭐ | 推荐，无需 Key 即可读取 |
| **Telegram** | Bot API / 频道 RSS | 订阅频道消息 | ⭐⭐⭐ | 轻量易集成 |
| **Bluesky** | AT Protocol API | 开放 API，无需审核 | ⭐⭐⭐ | 新兴平台 |
| **Instagram** | Graph API / oEmbed | 获取公开 hashtag 内容 | ⭐⭐⭐ | 需商业验证 |
| **TikTok** | Display API / oEmbed | 嵌入短视频 | ⭐⭐⭐ | 需审核，周期长 |
| **Facebook** | Graph API / oEmbed | 页面帖子嵌入 | ⭐⭐ | 需应用审核 |
| **微博** | 开放平台 API | 获取超话内容 | ⭐⭐ | 需企业认证 |
| **B站** | 开放平台 API | 搜索相关视频 | ⭐⭐ | 需审核 |

### 推荐方案

- **第一阶段**：保留 X 源，新增 **YouTube、Reddit** 两个数据源（最易集成、无需复杂审核）
- **用户上传内容**走自有服务器/存储，不直接依赖社交平台 API
- 后续可按需扩展 Instagram、Telegram、Bluesky

---

## 四、翻译实施方案

### 4.1 翻译策略：覆盖式翻译层

利用原站已有的 `data-i18n` 属性体系，在原 HTML 基础上注入翻译系统，**不修改原有 JS/CSS bundle**。

### 4.2 翻译对象与方法

| 翻译对象 | 方法 | 说明 |
|----------|------|------|
| UI 按钮文字 | `data-i18n` 属性匹配 | 118 个键已有映射 |
| siteInit 配置文本 | JSON 覆盖 | 创建 `siteInit.zh-CN.json` |
| 地图地名 | Google Maps API `language=zh-CN` 参数 | 自动本地化 |
| Preloader 日志 | 文本数组替换 | 33 行启动日志翻译 |
| 页面标题/Meta | `data-i18n-content` 属性 | SEO 标签翻译 |
| X Feed 帖子 | 不翻译 | 保持原文（用户生成内容） |
| YouTube 视频 | 不翻译 | 保持原视频 URL |

### 4.3 关键 UI 翻译对照表

| 英文原文 | 中文翻译 |
|----------|----------|
| SPIDEY TRACKER | 蜘蛛侠追踪器 |
| WELCOME TO THE SPIDEY TRACKER | 欢迎来到蜘蛛侠追踪器 |
| INTERACT WITH THE MAP TO VIEW SPIDER-MAN SIGHTINGS ALL OVER THE WORLD | 与地图互动，查看全球蜘蛛侠目击记录 |
| CHOOSE YOUR SETTINGS AND START TRACKING | 选择你的设置并开始追踪 |
| SOUND ON / SOUND OFF | 开启声音 / 关闭声音 |
| ACTIVITY LOG | 活动日志 |
| REPORT SIGHTINGS | 上报目击 |
| WEB WATCH | 网络监控 |
| VIDEOS | 视频 |
| EVENTS | 事件 |
| HELP | 帮助 |
| SAMSUNG EXCLUSIVE DOWNLOADS | 三星独家下载 |
| CLOSE | 关闭 |
| LOADING / INITIALIZING MAP... | 加载中... / 初始化地图中... |
| CONFIRMED SIGHTING | 已确认目击 |
| RUMORED SIGHTING | 传闻目击 |
| EVENT | 事件 |
| CENTER MAP | 居中地图 |
| GLOBAL MAP | 全球地图 |
| WATCH TRAILER | 观看预告片 |
| GET TICKETS | 购买门票 |
| REPORT YOUR SIGHTINGS ON X | 在 X 上上报你的目击 |
| TAP TO UNMUTE | 点击取消静音 |
| SKIP | 跳过 |
| REPLAY VIDEO | 重播视频 |
| PLAY VIDEO | 播放视频 |
| NOW PLAYING: | 正在播放： |
| BACK TO MAP | 返回地图 |
| DATE TBD | 日期待定 |

---

## 五、用户上传社区系统（Phase 2 规划）

### 5.1 用户流程

1. 用户注册/登录（邮箱或社交账号）
2. 手机浏览器请求 GPS 定位权限
3. 用户拍摄或选择蜘蛛侠相关图片/视频，填写文字描述
4. 前端上传文件 + 元数据（经纬度、时间、描述）
5. 后端 AI 内容审核：验证与蜘蛛侠相关性
   - 图像：AI 视觉识别（标签检测 spider-man、costume、mask 等）
   - 视频：抽帧后图像识别
   - 文字：关键词匹配 + 语义模型
6. 审核通过 → 在地图上以自定义标记展示
7. 审核未通过 → 提示用户"请上传与蜘蛛侠相关的内容"并拒绝上传

### 5.2 技术方案

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端上传 | File API + Geolocation API | 手机浏览器原生支持 |
| 后端服务 | Node.js + Express | API 服务 |
| 内容存储 | 本地文件系统 / S3 | 视频/图片存储 |
| 数据库 | SQLite → PostgreSQL | 元数据存储 |
| 内容审核 | Google Vision API / Azure CV / CLIP | 蜘蛛侠相关性验证 |
| 地图展示 | Google Maps Advanced Markers | 自定义用户标记 |

---

## 六、技术架构

```
┌─────────────────────────────────────────────────┐
│                   Frontend                        │
│  Astro SSG + Vanilla JS + Google Maps API        │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ i18n    │  │ UGC      │  │ Social Feed   │   │
│  │ Toggle  │  │ Upload   │  │ Multi-Plat    │   │
│  └────┬────┘  └────┬─────┘  └──────┬────────┘   │
└───────┼────────────┼───────────────┼─────────────┘
        │            │               │
┌───────▼────────────▼───────────────▼─────────────┐
│                Backend (Node.js)                   │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐     │
│  │ Auth API │ │ Upload   │ │ Social        │     │
│  │ (JWT)    │ │ API      │ │ Aggregator    │     │
│  └──────────┘ └──────────┘ └───────────────┘     │
│  ┌──────────────────────────────────┐             │
│  │     Content Moderation Service   │             │
│  └──────────────────────────────────┘             │
└────────────────────┬──────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────┐
│               Storage Layer                        │
│  SQLite (metadata) + Local FS (media files)       │
│  → 可扩展至 PostgreSQL + S3/OSS                    │
└────────────────────────────────────────────────────┘
```

---

## 七、项目目录结构

```
E:\Hermes project\spider-tracking-use_opensquilla\
├── .git/                          # Git 仓库
├── src/                           # 前端源码（基于原站改造）
│   ├── index.html                 # 改造后的首页（注入翻译系统）
│   ├── original_index.html        # 原始备份
│   ├── siteInit.json              # 原始配置
│   ├── siteInit.zh-CN.json        # 中文配置覆盖
│   ├── _astro/                    # 原 JS/CSS bundle（不改）
│   ├── images/                    # 本地化图片（不改）
│   ├── scripts/                   # 本地化脚本（不改）
│   └── js/
│       ├── i18n.js                # 语言切换 + 翻译引擎
│       └── upload.js              # 用户上传前端逻辑（Phase 2）
├── server/                        # 后端服务（Phase 2）
│   ├── index.js                   # API 入口
│   └── uploads/                   # 上传文件存储
├── PROJECT_PLAN.md                # 本文档
└── README.md
```

---

## 八、开发阶段路线图

| 阶段 | 任务 | 状态 |
|------|------|------|
| **Phase 1** | 需求调研、原站抓取、资源本地化、方案设计 | ✅ 已完成 |
| **Phase 2** | 本地运行原站副本、添加中英切换、翻译静态文本、地图中文 | ✅ 已完成 |
| **Phase 3** | 用户上传前端（定位、文件选择、描述）、后端 API、内容审核 | ✅ 已完成 |
| **Phase 4** | 多社交媒体数据源集成（X + YouTube + Reddit） | ⏸ 待开始 |
| **Phase 5** | 测试、审查、部署准备 | ⏸ 待开始 |

### Phase 2 详细执行步骤

1. **创建中文翻译文件** `src/siteInit.zh-CN.json` — 覆盖全部 siteInit 文本
2. **编写翻译引擎** `src/js/i18n.js` — 监听语言切换，替换 data-i18n 元素 + siteInit 文本 + 地图语言
3. **修改 HTML** `src/index.html` — 注入翻译系统，添加语言切换按钮，启用 languageToggle
4. **修改 Google Maps 参数** — 切换语言时更新 `language=zh-CN`
5. **本地测试** — 启动静态服务器验证翻译效果和功能完整性
6. **Git 提交** — 初始版本提交

---

## 九、风险与注意事项

- **版权与品牌**：本项目为个人学习/非商业用途，原站版权归 Sony Pictures / Marvel 所有
- **Google Maps API Key**：原站 Key 受域名限制，部署需使用自己的 Key
- **X API 限制**：免费额度有限，可能需要自建缓存
- **用户上传安全**：必须做文件类型、大小、内容审核，防止恶意上传
- **隐私合规**：收集定位信息需用户授权，符合 GDPR / 个人信息保护法

---

## 十、参考资料

- 原站：https://spideytracker.net/
- 官方站：https://spideytracker.com/
- Google Maps Platform 博客：https://mapsplatform.google.com/resources/blog/discover-peter-parkers-world-building-the-sony-pictures-spider-man-brand-new-day-spidey-tracker/
- Google Maps JS API 语言参数：https://developers.google.com/maps/documentation/javascript/localization
- Spidey Tracker 工作原理指南：https://spideytracker.org/how-it-works/
