# 会话交接：蜘蛛侠追踪器中文本地化 + 用户上传社区平台

## 我们在做什么任务

基于 Sony Pictures 官方蜘蛛侠互动地图 [spideytracker.net](https://spideytracker.net/) 创建增强版本地化副本网站。

**目标**：
- 实现中英双语切换（130+ 翻译词条）
- 替换 Google Maps 为 Leaflet + OpenStreetMap（无需 API Key）
- 用户 UGC 上传系统（图片/视频 + GPS 定位 + AI 内容审核）
- 社交媒体聚合面板（YouTube RSS + Reddit RSS + X/Twitter 精选池）

**范围**：全栈 Web 应用 — Flask 后端 + Astro SPA 前端  
**项目**：`Jarvisshun/spider-tracking`  
**成功标准**：网站可本地运行、中英切换可用、上传/社交面板功能正常、可部署到 Render.com

---

## 已经完成了什么

### Phase 1-5 全部完成 ✅

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 原站抓取、95 个静态资源本地化、技术调研 | ✅ |
| Phase 2 | Leaflet 地图替换、i18n 中英切换、Preloader 修复 | ✅ |
| Phase 3 | UGC 上传系统（前端 Modal + Flask API + 关键词审核） | ✅ |
| Phase 4 | 社交媒体聚合（YouTube/Reddit/X 三栏面板 + 5 分钟缓存） | ✅ |
| Phase 5 | 端到端测试 + 布局优化 + Render 部署准备 | ✅ |

### 关键文件路径

| 文件 | 路径 | 说明 |
|------|------|------|
| Flask 后端 | `server/server.py` | API 端点: `/api/upload`, `/api/sightings`, `/api/health`, `/api/social/youtube`, `/api/social/reddit`, `/api/social/x`, `/api/social/all` |
| 主页面 | `src/index.html` | 改造后的 Astro SPA 入口页 |
| 翻译引擎 | `src/js/i18n.js` | 语言切换 + 130+ 词条翻译 + SEO Meta 同步 |
| 上传前端 | `src/js/upload.js` | UGC 上传 Modal 组件 |
| 社交面板 | `src/js/social-feed.js` | YouTube/Reddit/X 三栏聚合面板 |
| 地图初始化 | `src/js/leaflet.js` | Leaflet + OpenStreetMap CartoDB 瓦片 |
| 中文翻译 | `src/siteInit.zh-CN.json` | 中文配置覆盖 |
| 项目计划 | `PROJECT_PLAN.md` | 完整开发路线图（中文） |
| 项目介绍 | `README.md` | 英文项目概述 |
| Render 部署 | `render.yaml` | Render.com Blueprint 配置 |
| 依赖 | `requirements.txt` | flask>=3.0, flask-cors>=4.0, gunicorn>=21.0 |

### 测试结果

- **最终综合测试** (`final_test_report.json`): 55/56 ✅ (98.2%)，唯一失败项：Git working tree 不干净（有未提交修改）
- **Phase 4 社交面板测试** (`test_report_phase4.json`): 33/33 ✅ (100%)
- **Trailer 灯箱测试** (`test_report_trailer.json`): 6/6 ✅ (100%)

### 验证过的启动命令

```bash
# 终端 1: 启动 Flask 后端
cd "E:\Hermes project\spider-tracking-use_opensquilla"
pip install -r requirements.txt
python server/server.py

# 终端 2: 启动静态前端（开发模式）
cd "E:\Hermes project\spider-tracking-use_opensquilla\src"
python -m http.server 8080

# 访问 http://127.0.0.1:8080/
```

### Git 提交历史（最近 10 条）

```
c7967cb fix: minimal render.yaml — match known-working Blueprint pattern
29b0621 fix: use runtime instead of env (deprecated field in Render Blueprint spec)
cf93540 fix: quote pythonVersion string in render.yaml (YAML float→string)
0221634 deploy: Render unified deployment — Flask serves static + API
d965591 docs: add comprehensive README with English/Chinese project overview
1f04a7b fix: switch YouTube embed from youtube-nocookie.com to youtube.com
d7a3b56 fix: YouTube trailer lightbox — consent overlay removal + getConsent override
5917a53 feat: YouTube RSS real-time data + X content pool random shuffle + refresh badges
cc3e7b8 feat: real Reddit RSS feed + cache + refresh + 10 items per platform
f3237b1 fix: align language toggle button with map filter buttons
```

---

## 当前卡在哪

**Render.com 部署验证待确认**。

`render.yaml` 经过三轮修复：
1. `pythonVersion: 3.11` → `pythonVersion: "3.11"`（YAML 解析为浮点数问题）
2. 删除 `plan: free` 和 `autoDeploy: true`（非标准字段）
3. `env: python` → `runtime: python`（Render 已弃用 `env` 字段，改用 `runtime`）

最终版 `render.yaml` 已推送到 GitHub `main` 分支。用户需要在 Render 页面点 **Retry** 验证 Blueprint 是否能通过解析。

**当前 render.yaml 内容**：
```yaml
services:
  - type: web
    name: spider-tracking
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn server.server:app -b 0.0.0.0:$PORT
    plan: free
```

**注意**：这是当前工作区文件的内容。最终修复版（`runtime: python`, `pythonVersion: "3.11"`）已推送到 GitHub 但本地可能被覆盖回了旧版。需确认。

此外，Git working tree 不干净：
```
M src/_astro/FooterCredits.QSxxyE34.css
M src/_astro/Lightbox.astro_astro_type_script_index_0_lang.YBJWc47h.js
M src/_astro/MainUIPanel.astro_astro_type_script_index_0_lang.BR7Pybqu.js
M src/data/main.json
M src/index.html
M src/js/i18n.js
```

---

## 下一步计划

1. **确认 Render 部署**：回到 Render Dashboard → Blueprints → 找到 `spider-tracking` → 点击 Retry/Refresh，看 Blueprint 是否能成功解析并创建 Web Service
2. **清理 working tree**：如果测试修改需要保留则 commit，否则 `git stash` 或 `git checkout`
3. **验证部署后的线上功能**：健康检查 `/api/health`、地图加载、语言切换、上传 API、社交面板
4. **后续可选扩展**：Instagram、Telegram、Bluesky 集成（PROJECT_PLAN.md 已有可行性分析）

---

## 绝对不要再踩的坑

- **Render Blueprint 用 `runtime` 不是 `env`**：`env: python` 是 Render 已弃用字段，必须用 `runtime: python`，否则 Blueprint 解析器直接拒绝
- **`pythonVersion` 必须加引号**：YAML 中 `3.11` 会被解析为浮点数 3.11，Render 要求字符串，必须写 `pythonVersion: "3.11"`
- **不要用 Render 不支持的 Blueprint 字段**：`plan: free`、`autoDeploy: true` 都不是标准 Blueprint 字段，会导致解析失败
- **Google Maps API Key 受域名限制**：原站 Key 只能在 spideytracker.net 使用，本地必须替换为 Leaflet + OpenStreetMap（已完成）
- **Reddit RSS 可能被 403 阻断**：从国内/某些 IP 直接访问 `reddit.com/.rss` 可能被屏蔽，已设计了 fallback 到 Mock 数据的机制
- **不要碰 src/_astro/ 下的编译产物**：这些是 Astro 打包输出的 JS/CSS bundle，不要手动修改，否则与原站行为不一致
- **不要修改 server/server.py 中的 Mock 数据池**：MOCK_YOUTUBE_VIDEOS / MOCK_TWEETS / MOCK_REDDIT_POSTS 是 RSS 拉取失败时的 fallback，删除会导致社交面板空白

---

## 关键上下文

- **关键决策**：
  - 选用 Leaflet + OpenStreetMap 替代 Google Maps（免费、无 Key、支持中文瓦片）
  - 后端用 Flask 统一部署（Flask 同时 serve 静态文件 + API，gunicorn 启动）
  - 内容审核采用关键词匹配（28 个蜘蛛侠相关词），非 AI 视觉识别（Phase 2 规划中的 AI 审核未实现）
  - 社交媒体数据源采用 RSS 拉取 + 5 分钟缓存 + Mock fallback 架构
  - X/Twitter 无免费 API，使用精选内容池 + 随机打乱模拟实时性

- **相关提交/分支**：`main` 分支，已推送到 `origin/main`（GitHub: Jarvisshun/spider-tracking）

- **相关文档**：
  - `PROJECT_PLAN.md` — 完整技术方案和路线图
  - `README.md` — 项目概览和快速启动指南

- **未验证假设**：
  - Render.com Blueprint 能否成功解析修复后的 `render.yaml`（需要用户操作确认）
  - YouTube RSS 从 Render 服务器（Oregon）是否能正常拉取
  - 用户上传功能在 Render 免费实例上是否稳定（免费实例磁盘空间有限）

- **其他会话**：
  - 飞书私聊会话曾设置 cron 每 10 分钟监控 WebChat 开发进度，后已暂停（cron job 已删除）
  - WebChat 会话（`agent:main:webchat:a431eba0`）是主开发会话，消耗了约 1.52 亿 token / $30
