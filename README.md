# 🕷️ Spidey Tracker — Spider-Man Interactive Map

> **蜘蛛侠追踪器** — 基于 Sony Pictures 官方蜘蛛侠互动地图的本地化增强版本

[![GitHub last commit](https://img.shields.io/github/last-commit/Jarvisshun/spider-tracking)](https://github.com/Jarvisshun/spider-tracking)
[![License](https://img.shields.io/badge/license-Educational-blue)](./LICENSE)

An enhanced local clone of the official **Spidey Tracker** interactive map from Sony Pictures' *Spider-Man: Brand New Day* campaign. The original site allows fans to explore Spider-Man sightings worldwide. This version adds:

- 🈚 **Full Chinese/English i18n** (130+ localized terms)
- 📤 **User-generated sighting uploads** with content moderation
- 🌐 **Social media feed aggregation** (YouTube, Reddit, X/Twitter)
- 🎬 **Trailer playback** in a custom lightbox
- 🗺️ **Leaflet + OpenStreetMap** (replaces Google Maps, no API key required)

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
- 🇺🇸 English / 🇨🇳 Chinese language toggle button
- 130+ translated terms covering all UI elements
- Dynamic SEO meta tag switching (`title`, `description`, `og:*`, `twitter:*`)
- Leaflet tile language parameter (`?lang=zh-CN`)

### UGC Upload System
- 📸 Upload Spider-Man sighting photos/videos
- 📍 GPS location tagging
- 🤖 **AI content moderation** — keyword-based Spider-Man relevance check:
  - ✅ Accepts: Spider-Man, spiderman, Peter Parker, Marvel, web-slinger, etc.
  - ❌ Rejects: non-Spider-Man content with appropriate error messages
- 📋 Sightings stored on local Flask backend

### Social Media Feed Panel
- 🌐 Floating panel (bottom-right corner)
- Three integrated tabs:
  - **YouTube** — Real Sony Pictures + Marvel videos via [YouTube RSS](https://www.youtube.com/feeds/videos.xml?user=SonyPictures)
  - **Reddit** — Live posts from [r/Spiderman](https://www.reddit.com/r/spiderman/) via RSS Atom feed
  - **X/Twitter** — Curated content pool with random shuffle on refresh
- 🔄 Refresh button per platform
- 🏷️ Live/Archive status badges
- ⏱️ 5-minute cache TTL (prevents rate limiting)

### Trailer Lightbox
- 🎬 Click "WATCH TRAILER" to open the official *Spider-Man: Brand New Day* trailer
- YouTube embed with custom Sony-styled lightbox
- Autoplay with sound toggle
- ESC / click-outside to close

---

## 🏗️ Project Structure

```
spider-tracking/
├── server/                         # Flask backend
│   ├── server.py                   # API: upload, social feeds, health
│   └── uploads/                    # User-uploaded content (gitignored)
├── src/                            # Frontend (static site)
│   ├── index.html                  # Main page (Astro-built SPA)
│   ├── _astro/                     # Astro compiled JS/CSS modules
│   ├── js/                         # Custom plugins
│   │   ├── i18n.js                 # Language toggle + translation engine
│   │   ├── upload.js               # UGC upload modal
│   │   ├── social-feed.js          # Social media feed panel
│   │   └── leaflet.js              # Leaflet map initialization
│   ├── images/                     # Site assets (frame, UI, pins, events)
│   │   └── events/
│   │       └── event_attachments/  # Fan event videos + images
│   └── scripts/                    # Tracking/analytics stubs
├── .gitignore
├── README.md
└── PROJECT_PLAN.md                 # Development roadmap (Chinese)
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Web browser (Chrome/Firefox/Edge)

### 1. Clone the repository
```bash
git clone https://github.com/Jarvisshun/spider-tracking.git
cd spider-tracking
```

### 2. Start the frontend
```bash
# Terminal 1
cd src
python -m http.server 8080
```

### 3. Start the backend (for upload + social feeds)
```bash
# Terminal 2 (from project root)
pip install flask flask-cors
python server/server.py
```

### 4. Open in browser
```
http://127.0.0.1:8080/
```

Click the **中文** button in the top-left to switch to Chinese.

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
| Phase 5 | ✅ Complete | Testing, layout polish, deployment prep |

---

## 📄 License

This project is for educational purposes only. All original Spider-Man assets and branding are owned by Sony Pictures Entertainment and Marvel. See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for full attribution.
