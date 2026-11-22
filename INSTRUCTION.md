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

> **Crucial Networking & Vercel Rule**: 
> 1. These IPs are private (RFC 1918) within your local ISP network. They can only be reached by devices connected to your ISP Wi-Fi.
> 2. **Vercel / HTTPS Mixed Content Policy**: When deployed on Vercel (`https://...`), web browsers block direct connection to unencrypted `http://172.16.50.x` streams as "Mixed Content".
>    - **To fix in browser (5 seconds)**: Click the 🔒 padlock icon in URL bar ➔ **Site settings** ➔ Set **Insecure content** to **Allow** ➔ Reload.
>    - **Zero-restriction alternative**: Use the orange **"Open in VLC / PotPlayer"** button (which runs outside the browser and connects directly over Wi-Fi), or run locally via `npm run dev` (`http://localhost:5173`).

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
*(Alternatively: `python scripts/crawl_comprehensive.py`)*

### Understanding Directory Partitions:
DhakaFlix organizes media into partitioned subfolders:
* **Cartoon TV Series (`172.16.50.10`)**: Grouped into letter ranges:
  - `Anime-TV Series ★ 0 — 9`
  - `Anime-TV Series ♥ A — F` (e.g. Batman Beyond, Batman The Animated Series)
  - `Anime-TV Series ♥ G — M`
  - `Anime-TV Series ♦ N — S` (e.g. Phineas and Ferb)
  - `Anime-TV Series ♦ T — Z` (e.g. The Batman, Tom and Jerry)
* **TV & WEB Series (`172.16.50.12`)**: Partitioned into `0-9`, `A-L`, `M-R`, `S-Z`.
* **Movies (`172.16.50.7`, `172.16.50.14`)**: Partitioned into 36+ year folders from `(1960-1994)` up to `(2026)`.
* **Foreign Language Movies**: Partitioned by language subfolders.

The comprehensive crawler (`scripts/crawl_comprehensive.py`) systematically traverses EVERY partition bucket so all letters of the alphabet and all years are indexed.

---

## 🔊 5. Audio Architecture, Dubbing & Video Player

### Native Browser Audio & Multi-Track Switching
* **Native Multi-Track Demuxing**: `HTMLMediaElement.audioTracks` API is queried to identify and switch between all audio streams (e.g. Hindi Dubbed, English Original, Regional Dubs) with instant HUD visual feedback.
* **Dual Audio & Dubbing Switcher**:
  - The player inspects filename and catalog metadata (`[Dual Audio]`, `Hindi Dubbed`, `Multi Audio`, `Bangla Dub`).
  - Displays a clean Audio & Dubbing selector menu right next to the subtitle button.
  - Pressing **`B`** (official VLC hotkey) or **`A`** instantly cycles through available audio tracks.
* **Why previous Web Audio failed**: In standard browser security, calling `AudioContext.createMediaElementSource(video)` on a cross-origin media stream (`http://172.16.50.x`) without `Access-Control-Allow-Origin: *` headers forces the Web Audio API to output **SILENCE (zeroes)**. Audio is routed directly from HTML5 `<video>` for crystal-clear sound.
* **Dolby Digital / DTS 5.1/7.1 & Secondary MKV Track Demuxing**:
  - For MKV files where Chromium's internal demuxer does not expose secondary AC-3/E-AC-3/DTS audio streams to JavaScript, a 1-click **"Open in VLC / PotPlayer"** button generates an instant `.m3u` stream shortcut.
  - In VLC or PotPlayer, pressing **`B`** cycles all 5.1/7.1 surround sound audio tracks with full hardware acceleration.

---

## 🎬 6. Direct Streaming & Buffering Technique

### Why It's Lightweight & Fast:
* **Nginx HTTP 206 Partial Content**: The DhakaFlix servers natively support the `Range: bytes=X-Y` header.
* **No Downloading Required**: The HTML5 `<video>` element makes small chunk requests on demand.
* **Buffer Ahead Tracking**:
  - `VideoPlayer.tsx` listens to `timeupdate` and `progress` events.
  - Queries `video.buffered` to calculate and render the buffer segment progress bar underneath the playback scrubber.
  - Displays `Buffer: Xs ahead` in the UI.
* **Preload Optimization**: `preload="metadata"` is set on load so that whole files are never downloaded until the user actually plays the video.

### Keyboard Shortcuts:
| Key | Action |
| :--- | :--- |
| **Arrow Left / Right** | Skip **5 seconds** backward / forward |
| **Arrow Up / Down** | Adjust Volume by **10%** |
| **Space** | Play / Pause toggle |
| **B / A** | Cycle Audio Tracks / Dubbing (Hindi / English / Dual Audio) |
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

## 🎮 9. Games & Software Download Hub (`http://172.16.50.8/`)

DhakaFlix hosts its gaming, software, and tools library on `http://172.16.50.8/DHAKA-FLIX-8/`. Unlike movies and TV series, these are direct installation packages (ISOs, EXEs, ZIPs, RARs, APKs).

### Categories Covered (2,022 indexed packages):
* **PC Games** (`172.16.50.8/DHAKA-FLIX-8/PC Games/`): 1,358 PC games across all letter partitions (`0-9`, `A-D`, `E-K`, `L-R`, `S-Z`).
* **Console Games** (`172.16.50.8/DHAKA-FLIX-8/Console Games/`): 412 titles across PS4, PS3, PSP, XBOX 360, and Nintendo Switch.
* **Android Games** (`172.16.50.8/DHAKA-FLIX-8/Android Games/`): 150 mobile games (APKs, OBB caches, and mods).
* **Software & Tools** (`172.16.50.8/DHAKA-FLIX-8/Software/`): 102 software packages (Adobe Master Collection for Windows/macOS, CAD tools, Android Studio, Emulators, Antivirus, audio suites).

### Multiple File Downloader Workflow:
1. Switch to the **"Games & Software"** tab in the top navigation bar.
2. Filter by platform or use the real-time search (e.g. `GTA`, `Adobe`, `Assassin's Creed`, `FIFA`).
3. **Single File Download**: Click **Get** to trigger an instant browser download.
4. **Inspect Multi-part Archives**: Click **Files** to open `GamesSoftwareModal` and select specific `.part1.rar`, `setup.exe`, or all files.
5. **Batch Downloader**: Check **Select Batch** on desired items. The floating **Download Manager** allows:
   * **Download All**: High-speed sequential browser download.
   * **Export IDM File**: Generates an Internet Download Manager batch text file (`idm_download_links.txt`) for 1-click import into IDM.

---

## ⚡ 10. Performance & Pagination

* The main library is paginated using `paginatedItems` in `src/App.tsx`.
* Default: **30 items per page** (selectable: 24, 36, 48, 96).
* Prevents rendering hundreds of video/poster DOM elements at once, keeping FPS at 60 and memory footprint low.
* Automatically resets to page 1 when the user types in the search bar or clicks a category filter.

---

## ☁️ 11. Deploying to Vercel

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
│       ├── catalog.json            # Static database of 4,632 movies & series
│       └── games_software.json     # Static database of 2,022 games & software
├── scripts/
│   ├── crawl.py                    # Main crawler script
│   ├── crawl_comprehensive.py      # Traverses all letter buckets & years
│   ├── index_all_games.py          # Crawls 2,000+ PC/Console games & software
│   ├── crawler_core.py             # Folder inspector & metadata parser
│   └── crawler_base.py             # Server IP list and category configurations
├── src/
│   ├── components/
│   │   ├── VideoPlayer.tsx         # Player with buffer progress & keyboard events
│   │   ├── SubtitleFinderModal.tsx # Online subtitle finder & localStorage cache
│   │   ├── GamesSoftwareView.tsx   # Games & Software multiple file download view
│   │   ├── GamesSoftwareModal.tsx  # Multi-part file inspector & folder downloader
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
