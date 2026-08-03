# 🦐 Spider-Man Tracker 中文翻译版

基于 [spideytracker.net](https://spideytracker.net/)（Sony Pictures × Samsung 联合推出的 *Spider-Man: Brand New Day* 营销站点）的中文翻译版本。

## ✨ 功能

- **中英双语切换**：右上角语言切换按钮，一键翻译全部 UI 文字、地图地名
- **保留原版 UI**：不修改原站任何视觉设计，仅添加翻译层
- **视频保留原样**：YouTube 视频（Ned 消息 + 预告片）照搬原站，可正常播放
- **地图中文**：Google Maps API `language=zh-CN` 参数自动本地化地名

## 🚀 本地运行

```bash
cd src
python -m http.server 8080
# 浏览器打开 http://127.0.0.1:8080/
```

## 📁 项目结构

```
src/
├── index.html              # 改造后的首页（注入翻译系统）
├── siteInit.zh-CN.json     # 中文翻译配置（118个键全覆盖）
├── js/i18n.js              # 语言切换 + 翻译引擎
├── _astro/                 # 原 JS/CSS bundle（不改）
├── images/                 # 本地化图片（不改）
└── scripts/                # 同意管理脚本（不改）
```

## 🌐 翻译机制

1. 原站已有 118 个 `data-i18n` 属性键，覆盖全部 UI 文字
2. `siteInit.json` 配置对象包含所有动态文本（菜单、面板、Preloader 日志等）
3. `siteInit.zh-CN.json` 提供中文覆盖值，通过深度合并注入
4. `i18n.js` 监听语言切换，更新 DOM + 全局配置 + Google Maps 语言参数
5. 用户语言偏好存储在 `localStorage`，刷新后自动恢复

## 📋 已翻译内容

- 网站标题、SEO 元标签
- 主菜单（活动日志、上报目击、网络监控、视频、事件、帮助、三星独家下载）
- 地图 UI（图例、筛选器、3D 控制、街景、雷达）
- 帮助屏幕引导文字
- 活动日志 / 事件 / 网络监控面板标题与说明
- Preloader 启动日志（33 行终端风格文本）
- 页脚版权与法律链接
- 弹窗通知、Toast 提示文字
- Google Maps 地名（通过 API language 参数）

## ⚠️ 注意事项

- 需替换 Google Maps API Key（原 Key `AIzaSyA...` 受域名限制，本地开发可用但有限制）
- 仅供个人学习/非商业用途，版权归 Sony Pictures / Marvel 所有
- 用户上传社区系统（Phase 2）规划详见 `PROJECT_PLAN.md`

## 🗺️ 路线图

| 阶段 | 状态 | 内容 |
|------|------|------|
| Phase 1 | ✅ 完成 | 需求调研、原站抓取、资源本地化、方案设计 |
| Phase 2 | ✅ 完成 | 中英双语切换、翻译引擎、地图中文、本地测试 |
| Phase 3 | ⏸ 待开始 | 用户上传系统（定位、拍摄、内容审核） |
| Phase 4 | ⏸ 待开始 | 多社交媒体数据源集成（X + YouTube + Reddit） |
| Phase 5 | ⏸ 待开始 | 全面测试、审查、部署准备 |
