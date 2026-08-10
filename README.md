# 🕷️ Spidey Tracker — Spider-Man Interactive Map

> **蜘蛛侠追踪器** — 基于 Sony Pictures 官方蜘蛛侠互动地图的本地化增强版本

[![GitHub last commit](https://img.shields.io/github/last-commit/Jarvisshun/spider-tracking)](https://github.com/Jarvisshun/spider-tracking)
[![License](https://img.shields.io/badge/license-Educational-blue)](./LICENSE)

An enhanced local clone of the official **Spidey Tracker** interactive map from Sony Pictures' *Spider-Man: Brand New Day* campaign. The original site allows fans to explore Spider-Man sightings worldwide. This version adds:

- 🈚 **Full Chinese/English i18n v4** (130+ localized terms, anti-recursion MutationObserver, live menu translation)
- 🖲️ **CN/EN pixel-art language toggle** integrated into map-filters panel (matching green/red filter buttons)
- 📤 **User-generated sighting uploads** with AI content moderation
- 🌐 **Three-platform social media feed** (YouTube/Reddit/X) with **infinite scroll** + live RSS data
- 🎬 **Trailer playback** in a custom lightbox
- 🗺️ **Leaflet + OpenStreetMap** (replaces Google Maps, no API key required)
- 🚀 **Live deployment** at [spider-tracking.onrender.com](https://spider-tracking.onrender.com/)

---

## 📸 Screenshots

| Map View | Social Feed | Upload Modal |
|----------|-------------|--------------|
| *(add screenshot)* | *(add screenshot)* | *(add screenshot)* |

---

## ✨ Features

### Map & Navigation
- 🗺️ Interactive world map with Spider-Man sighting pins
- 🔴 **Confirmed Sightings** / 🟢 **Rumored Sightings** / 🟡 **Events**
- 🧭 Map navigation controls (pan, zoom, rotate)
- 📍 Activity log with chronological sighting feed
- 🔊 Ambient audio toggles

### i18n (Internationalization)
- 🇺🇸 English / 🇨🇳 Chinese **pixel-art toggle button** inside the map-filters panel
  - Same shape and style as the green/red filter buttons (55×41px pixel-art background)
  - Shows "EN" in Chinese mode, "CN" in English mode
  - Integrated at the same DOM level as confirmed/rumored sighting filters
- 130+ translated terms covering all UI elements
- **Anti-recursion MutationObserver** — text updates never trigger re-translation
- Dynamic SEO meta tag switching (`title`, `description`, `og:*`, `twitter:*`)
- 3-retry auto-retry for menu translation with 500ms debounce
- Leaflet tile language parameter (`?lang=zh-CN`)

### UGC Upload System
- 📸 Upload Spider-Man sighting photos/videos
- 📍 GPS location tagging
- 🤖 **AI content moderation** — keyword-based Spider-Man relevance check:
  - ✅ Accepts: Spider-Man, spiderman, Peter Parker, Marvel, web-slinger, etc.
  - ❌ Rejects: non-Spider-Man content with appropriate error messages
- 📋 Sightings stored on local Flask backend

### Social Media Feed Panel
- 🌐 Floating panel (bottom-right corner, gradient button)
- Three independent tabs with **infinite scroll**:
  - **YouTube** — Real Sony Pictures + Marvel videos via [YouTube RSS](https://www.youtube.com/feeds/videos.xml?user=SonyPictures), dynamic page generators for scroll
  - **Reddit** — Live posts from [r/Spiderman](https://www.reddit.com/r/spiderman/) via RSS Atom feed, dynamic page generators for scroll
  - **X/Twitter** — 20-item curated content pool with random shuffle, 15+ template generators for infinite scroll
- 🔄 Global refresh button (resets all tabs + background pre-fetches other platforms)
- 📜 Scroll-to-bottom auto-load (150px threshold, 10 items per page)
- 🏷️ Live/Cached status badges per tab
- 🔗 All items link to real platform pages (clickable external links)
- 🆔 ID-based deduplication across pages
- ⏱️ 5-minute cache TTL (prevents rate limiting)

### Trailer Lightbox
- 🎬 Click "WATCH TRAILER" to open the official *Spider-Man: Brand New Day* trailer
- YouTube embed with custom Sony-styled lightbox
- Autoplay with sound toggle
- ESC / click-outside to close

---

## 🏗️ Project Structure

```json {10,16}
spider-tracking/
├── server/                         # Flask backend
│   ├── server.py                   # API: upload, social feeds (pagination + dynamic generators), health
│   └── uploads/                    # User-uploaded content (gitignored)
├── src/                            # Frontend (static site)
│   ├── index.html                  # Main page (Astro-built SPA)
│   ├── data/
│   │   ├── main.json               # Core data (pins, video gallery, webwatch, xFeed config)
│   │   └── siteInit.zh-CN.json     # Chinese translations (130+ terms)
│   ├── _astro/                     # Astro compiled JS/CSS modules
│   ├── js/                         # Custom plugins
│   │   ├── i18n.js                 # i18n v4: language toggle + anti-recursion translation engine
│   │   ├── upload.js               # UGC upload modal + content moderation
│   │   ├── social-feed.js          # Social media panel v2: 3-tab infinite scroll
│   │   └── leaflet.js              # Leaflet map initialization
│   ├── images/                     # Site assets (frame, UI, pins, events, buttons)
│   │   ├── ui/
│   │   │   ├── buttons/            # Pixel-art PNG buttons (white/green/red/black/yellow)
│   │   │   ├── map/filters/        # Map filter button backgrounds
│   │   │   ├── xfeed/              # X/Twitter feed icons and avatars
│   │   │   └── msg_center/         # Message center UI assets
│   │   └── events/
│   │       └── event_attachments/  # Fan event videos + images
│   └── scripts/                    # Analytics / 3D model manager stubs
├── .gitignore
├── README.md
├── PROJECT_PLAN.md                 # Development roadmap (Chinese)
├── render.yaml                     # Render.com Blueprint deployment config
└── requirements.txt                # Python dependencies (Flask, Flask-CORS, gunicorn)
```

---

## 🚀 Quick Start

### 🌐 Live Demo
**[https://spider-tracking.onrender.com/](https://spider-tracking.onrender.com/)**
> Note: Render free tier may sleep after 15 minutes of inactivity. First visit may take ~30 seconds to wake.

### Local Development

### Prerequisites
- Python 3.8+
- Web browser (Chrome/Firefox/Edge)

### 1. Clone the repository
```bash
git clone https://github.com/Jarvisshun/spider-tracking.git
cd spider-tracking
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Start the server
```bash
python server/server.py
```

### 4. Open in browser
```
http://127.0.0.1:8080/
```

Click the **CN/EN** pixel-art button at the bottom-left map-filters panel to switch to Chinese. Click the 🌐 floating button at the bottom-right to open the social media feed panel.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (Astro SPA output) |
| Map | [Leaflet.js](https://leafletjs.com/) + OpenStreetMap CartoDB tiles |
| Backend | [Flask](https://flask.palletsprojects.com/) (Python) |
| Social Feeds | RSS/Atom XML parsing (YouTube RSS, Reddit Atom) |
| i18n | Custom JSON-based translation engine |
| Content Moderation | Keyword matching engine (28 Spider-Man terms) |

---

## 🌐 Deployment

### Render (Production)
**[https://spider-tracking.onrender.com/](https://spider-tracking.onrender.com/)**

- **Platform**: Render.com (Blueprint auto-deploy from GitHub)
- **Runtime**: Python 3 + gunicorn
- **Build**: `pip install -r requirements.txt`
- **Start**: `gunicorn server.server:app -b 0.0.0.0:$PORT`
- **Config**: [render.yaml](./render.yaml)

To deploy: push to the `main` branch on GitHub → Render auto-deploys (if Auto-Deploy is enabled) or manually trigger **Manual Deploy → Deploy latest commit** from the Render Dashboard.

---

## ⚠️ Important Notes

### Intellectual Property
This is an **educational/portfolio project**. All Spider-Man branding, imagery, and original site design are intellectual property of **Sony Pictures Entertainment** and **Marvel**. The map data and UI components are cloned from the public [spideytracker.net](https://spideytracker.net) website.

### API Keys
- **Google Maps API Key** in the original HTML is Sony's public key (visible on spideytracker.net) — it does not work on `localhost`. This project replaces Google Maps with OpenStreetMap (no key required).
- **YouTube Data API** — not used. Video data comes from YouTube's public RSS feeds (no key required).
- **Reddit API** — not used. Post data comes from Reddit's public Atom RSS feeds (no key required).
- **X/Twitter API** — no free API available. Uses a curated content pool.

### No Personal Data
This project contains **no private credentials, API keys, or personal information**. All content is derived from publicly available sources.

---

## 📋 Development Roadmap

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the full phased development plan.

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Localization, Leaflet map, i18n system |
| Phase 2 | ✅ Complete | Bug fixes, preloader, static assets |
| Phase 3 | ✅ Complete | UGC upload system + content moderation |
| Phase 4 | ✅ Complete | Social media aggregation (YouTube/Reddit/X) |
| Phase 5 | ✅ Complete | Menu i18n, CN/EN pixel-art toggle, anti-recursion MutationObserver |
| Phase 6 | ✅ Complete | Infinite scroll (3 platforms), dynamic content generators, Render deployment |

---

## 📄 License

This project is for educational purposes only. All original Spider-Man assets and branding are owned by Sony Pictures Entertainment and Marvel. See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for full attribution.
