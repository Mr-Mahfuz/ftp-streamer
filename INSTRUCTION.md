# 📖 DhakaFlix Stream - Developer Documentation & Instructions

Welcome to the **DhakaFlix Stream** developer guide. This document explains the architecture, local ISP networking, crawler workflow, streaming/buffering techniques, subtitle engine, batch downloader, and deployment instructions for future developers.

---

## 🏗️ 1. Architecture & Tech Stack

* **Framework**: React 19 + Vite (Fast HMR, lightweight SPA bundle, ~240ms build time).
* **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`).
* **Icons**: Zero-dependency native SVG components in `src/components/Icons.tsx`.
* **State & Storage**: React Hooks + Browser `localStorage` for playback position and online subtitle caching.
* **Crawler / Indexer**: Python 3 multi-threaded concurrent crawler (`scripts/crawl.py`, `scripts/crawler_core.py`, `scripts/crawler_base.py`).
* **Deployment Target**: Vercel (`vercel.json` rewrite routing) or any static host / local Node environment.

---

## 🌐 2. Local ISP Network Map (DhakaFlix BDIX)

DhakaFlix hosts its HTTP file directories on multiple private ISP IP addresses (Nginx + h5ai v0.29.0). Each IP handles specific media types:

| IP Address | Media Category Covered |
| :--- | :--- |
| `http://172.16.50.7/` | English Movies, Kolkata Bangla Movies, Foreign Language Movies, 3D Movies |
| `http://172.16.50.14/` | English Movies (1080p), Hindi Movies, South Indian Movies, Animation Movies, IMDb Top 250, Korean TV & Web Series |
| `http://172.16.50.12/` | TV & WEB Series (`0-9`, `A-L`, `M-R`, `S-Z` alphabet tree) |
| `http://172.16.50.10/` | Cartoon TV Series, Documentary, WWE & AEW Wrestling, Awards & TV Shows |

> **Crucial Networking Rule**: These IPs are private (RFC 1918) within your local ISP network. They can only be accessed directly from a computer/device connected to the ISP's connection or BDIX network.

---

## 🚀 3. Quick Start & Development Commands

### Install Dependencies
```bash
npm install
```

### Start Local Development Server
```bash
npm run dev
```
To expose the dev server to other devices on your home Wi-Fi (such as phones, tablets, smart TVs):
```bash
npm run dev -- --host
```
Access the URL printed in the terminal (e.g. `http://192.168.1.xxx:5174`).

### Production Build
```bash
npm run build
```
Generates the optimized static distribution inside `dist/`.

### Preview Production Build Locally
```bash
npm run preview
```

---

## 🕷️ 4. Running the DhakaFlix Crawler (`npm run crawl`)

The crawler scans the DhakaFlix directory listings in parallel, extracts media metadata, and compiles them into a structured JSON index at `public/data/catalog.json`.

### How to Run:
```bash
npm run crawl
```
*(Alternatively: `python scripts/crawl.py`)*

### How the Crawler Operates:
1. **Category Crawling**: Defined in `scripts/crawler_base.py`. Scans all 17 categories from the DhakaFlix navigation menus.
2. **Multi-Threading**: Uses `ThreadPoolExecutor` (12-16 workers) to query directories simultaneously with ~1ms local BDIX latency.
3. **Regex Extraction**: Parses the h5ai fallback HTML table to extract:
   - Item Title & Clean Name
   - Release Year (e.g., `(2026)`, `(2024– )`)
   - Quality / Resolution (`1080P`, `720P`, `4K`)
   - Audio tracks (`[Dual Audio]`, `[Hindi 5.1+English 5.1]`, `Bangla`)
   - Poster image (`a_AL_.jpg` or `a_VL_.jpg`)
   - Direct Stream Video URL (`.mkv`, `.mp4`, `.webm`)
   - Subtitles (`.srt`, `.vtt`)
4. **TV Series Traversal**:
   - Detects `Season 1`, `Season 2` subfolders.
   - Crawls inside each season folder to enumerate individual episode video files and sizes.
5. **Output**: Writes the combined catalog to `public/data/catalog.json` (~3.6 MB for 740+ full titles with hundreds of TV episodes).

---

## 🎬 5. Direct Streaming & Buffering Technique

### Why It's Lightweight & Fast:
* **Nginx HTTP 206 Partial Content**: The DhakaFlix servers natively support the `Range: bytes=X-Y` header.
* **No Downloading Required**: The HTML5 `<video>` element makes small chunk requests on demand.
* **Buffer Ahead Tracking**:
  - `VideoPlayer.tsx` listens to `timeupdate` and `progress` events.
  - Queries `video.buffered` to calculate and render the buffer segment progress bar underneath the playback scrubber.
  - Displays `Buffer: Xs ahead` in the UI.
* **Preload Optimization**: `preload="metadata"` is set on load so that whole files are never downloaded until the user actually plays the video.
* **Audio Boost**: MKV multi-channel audio tracks (AC3/5.1) are boosted up to 300% volume via Web Audio API `AudioContext.createGain()`.

### Keyboard Shortcuts:
| Key | Action |
| :--- | :--- |
| **Arrow Left / Right** | Skip **5 seconds** backward / forward |
| **Arrow Up / Down** | Adjust Volume by **10%** |
| **Space** | Play / Pause toggle |
| **F** | Toggle Fullscreen mode |
| **M** | Toggle Mute |
| **C** | Toggle Subtitles On / Off |
| **J / L** | Skip 10s backward / forward |
| **Esc** | Close video player or modal |

---

## 💬 6. Online Subtitle Finder & LocalStorage Caching

### How Subtitles Work:
1. **Auto-Detect**: If DhakaFlix has `.srt` or `.vtt` in the media folder, it is automatically parsed and made available.
2. **Online Subtitle Finder (`SubtitleFinderModal.tsx`)**:
   - Triggered from the player's subtitle settings menu via **"Find Online Subtitles"**.
   - Searches online providers (YTS-Subs, OpenSubtitles, SubSource) by title, year, or season/episode.
   - Also supports **Direct Subtitle URL** and **Paste Raw SRT Text** tabs.
3. **Browser `localStorage` Persistence**:
   - When a subtitle is applied, it is saved in browser storage:
     `dhakaflix_saved_sub_${mediaId}_${episodeName}`
   - The next time the user opens the movie or episode, the player automatically re-loads and applies the cached subtitle from `localStorage` without requiring another search!
   - Users can remove or update the cached subtitle anytime from the subtitle modal.

---

## 📥 7. Batch Download Manager & IDM Export

1. **Selection**: Checkboxes on every movie card and TV series episode. A **"Select All On Page"** button allows selecting full pages at once.
2. **Download Drawer**: Appears automatically at the bottom right whenever 1 or more items are selected.
3. **Export to IDM (.txt)**:
   - Generates a `.txt` file containing direct URLs formatted for **Internet Download Manager**.
   - In IDM, users go to `Tasks > Import > From text file` to queue an entire season or batch at maximum BDIX ISP speed.
4. **Export M3U Playlist (.m3u)**:
   - Generates a playlist file for VLC or PotPlayer.

---

## ⚡ 8. Performance & Pagination

* The main library is paginated using `paginatedItems` in `src/App.tsx`.
* Default: **30 items per page** (selectable: 24, 36, 48, 96).
* Prevents rendering hundreds of video/poster DOM elements at once, keeping FPS at 60 and memory footprint low.
* Automatically resets to page 1 when the user types in the search bar or clicks a category filter.

---

## ☁️ 9. Deploying to Vercel

The project includes `vercel.json` pre-configured with Vite client routing:
```json
{
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Steps to Deploy:
1. Commit and push the repository to GitHub:
   ```bash
   git add .
   git commit -m "Deploy update"
   git push origin main
   ```
2. Import the project into your [Vercel Dashboard](https://vercel.com/dashboard).
3. Framework preset: **Vite** (`npm run build`, output: `dist`). Click **Deploy**.

> **Important Note on Mixed Content (HTTPS on Vercel vs HTTP on ISP)**:
> If deployed on Vercel (`https://your-app.vercel.app`), modern browsers block insecure `http://172.16.50.x` media requests from an `https://` page.
> - **Best Option**: Run the app locally on your home network (`npm run dev -- --host`).
> - **In Chrome/Edge on Vercel**: Click the padlock / site settings icon in the address bar > **Site Settings** > **Insecure Content** > set to **Allow**.
> - **Alternative**: Click **"Open in VLC"** or **"Export to IDM"** from the app.

---

## 📂 10. File & Directory Reference

```
dhakaflix-stream/
├── public/
│   └── data/
│       └── catalog.json            # Static database of all crawled media
├── scripts/
│   ├── crawl.py                    # Main crawler script
│   ├── crawler_core.py             # Folder inspector & metadata parser
│   └── crawler_base.py             # Server IP list and category configurations
├── src/
│   ├── components/
│   │   ├── VideoPlayer.tsx         # Player with buffer progress & keyboard events
│   │   ├── SubtitleFinderModal.tsx # Online subtitle finder & localStorage cache
│   │   ├── MediaCard.tsx           # Movie/series card with stream & select actions
│   │   ├── SeriesModal.tsx         # Season/episode viewer & season batch download
│   │   ├── DownloadManager.tsx     # Floating download cart, IDM & M3U exporter
│   │   ├── TreeExplorer.tsx        # Interactive hierarchical tree folder browser
│   │   ├── Navbar.tsx              # Top navigation bar with category dropdowns
│   │   ├── HeroBanner.tsx          # Featured premiere carousel
│   │   └── Icons.tsx               # Native SVG icons
│   ├── categories.ts               # Metadata for all 17 DhakaFlix categories
│   ├── types.ts                    # TypeScript interface definitions
│   ├── App.tsx                     # Main page container, filters & pagination
│   ├── main.tsx                    # React DOM entry point
│   └── index.css                   # Tailwind v4 import & custom styles
├── INSTRUCTION.md                  # This file
├── README.md                       # User-facing summary
├── vercel.json                     # Vercel configuration
├── vite.config.ts                  # Vite + Tailwind v4 plugin setup
└── package.json                    # Project metadata & npm scripts
```
