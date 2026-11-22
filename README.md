# 🎬 DhakaFlix Stream - Direct ISP BDIX Web Player

A lightweight, high-performance web application to stream movies and TV series directly from your ISP's DhakaFlix HTTP/FTP servers (`172.16.50.14`, `172.16.50.7`, `172.16.50.12`, `172.16.50.10`) with zero-download streaming, instant byte-range seeking, subtitles, keyboard controls, and a multi-item batch downloader.

Built with **React, Vite, TypeScript, and Tailwind CSS**. Deploys seamlessly to **Vercel** with zero configuration.

---

## ✨ Features

### 1. ⚡ High-Speed Direct Streaming & Buffering Technique
- **HTTP Range Requests**: Takes advantage of DhakaFlix Nginx servers' `206 Partial Content` support for instant progressive seeking without downloading entire 1GB+ files.
- **Visual Buffer Ahead Bar**: Real-time display of cached buffer segments with buffer duration ahead (`Buffered: 45s ahead`).
- **Auto-Reconnection**: Automatically recovers and retries playback if an ISP packet drops.
- **Preload Strategy**: Loads metadata on hover/click, buffering progressively during playback.

### 2. ⌨️ Complete Keyboard Controls
- **Arrow Left / Right**: Skip **5 seconds** backward / forward (with HUD animation).
- **Arrow Up / Down**: Increase / Decrease volume by 10% (with HUD pill).
- **Space**: Play / Pause toggle.
- **F**: Toggle Fullscreen mode.
- **M**: Mute / Unmute audio.
- **C**: Toggle Subtitles On / Off.
- **J / L**: Skip 10s backward / forward.
- **Esc**: Exit player or close modals.

### 3. 💬 Subtitle Engine
- **One-Click Subtitle Toggle**: Turn subtitles on/off instantly (`C` key or button).
- **Auto-Detect**: Automatically links subtitles found in media folders.
- **Upload Custom Subtitle**: Drag & drop or pick any local `.srt` or `.vtt` file from your device.
- **Subtitle Styling**: Choose font size (Small, Medium, Large, Extra Large).
- **Audio Sync Adjustment**: Fine-tune subtitle timing with `[-0.5s]` / `[+0.5s]` offset buttons.

### 4. 🔊 Audio Gain Booster (Up to 300%)
- Many movie MKV files have 5.1/7.1 audio tracks where dialogue sounds quiet in stereo laptop/TV speakers.
- Integrated Web Audio API Gain Node allows boosting volume up to **300%**.

### 5. 📥 Batch Download Manager & IDM Export
- **Select Multiple Items**: Checkbox on every movie card and TV series episode.
- **1-Click Entire Season Selection**: Select all episodes of a season at once.
- **Download Selected**: Sequentially triggers browser downloads with throttle prevention.
- **Export to IDM (.txt)**: Generates a direct URL text file formatted for **Internet Download Manager (IDM > Tasks > Import > From text file)**.
- **Export .M3U Playlist**: Generates an M3U playlist file to open full seasons in VLC or PotPlayer.

### 6. 🌲 Interactive Tree & Live Folder Explorer
- Browse the exact hierarchical tree structure of the DhakaFlix file servers:
  - **Movies Menu**: English Movies, 1080p, Hindi, South Indian, South Hindi Dubbed, Kolkata Bangla, Animation, Foreign Language, IMDb Top 250, 3D Movies.
  - **TV Series Menu**: TV & WEB Series, Korean TV & Web Series, Cartoon Series, Documentaries, WWE & AEW, Awards & TV Shows.
- Expand categories, years, collections, seasons, and episodes.
- Stream or add any episode to your download batch directly from the tree.

### 7. 🚀 Fallback Hardware Media Players
- Direct **"Open in VLC"** (`vlc://...`) and **"Open in PotPlayer"** (`potplayer://...`) links for hardware HEVC/DTS decoding.

---

## 🚀 Getting Started

### Local Network Streaming (Recommended for Home Wi-Fi)
Running the app on your local network allows any phone, laptop, or smart TV in your house to stream without HTTPS mixed-content restrictions:

```bash
# 1. Install dependencies
npm install

# 2. Start the local server accessible to your home network
npm run dev -- --host
```
Open the printed local URL (e.g. `http://localhost:5173` or `http://192.168.1.xxx:5173`) on any device on your Wi-Fi!

---

## ☁️ Deploying to Vercel

The project is pre-configured with `vercel.json` for instant 1-click deployment.

### Option A: Using Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option B: Deploy via GitHub
1. Push this repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/dashboard), click **"Add New Project"** and import your repository.
3. Vercel will automatically detect the **Vite** framework:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Click **Deploy**!

> **Note on Vercel (HTTPS) & Private ISP IPs:**
> Because DhakaFlix uses private ISP IP addresses (`172.16.50.x`) over HTTP, if you open the app on `https://your-app.vercel.app`, modern browsers may prompt about mixed content.
> - **Solution 1 (Recommended)**: Run locally (`npm run dev -- --host`) on your home network for 100% native HTTP streaming.
> - **Solution 2**: In Chrome/Edge on your Vercel deployment, click the lock icon in the address bar > **Site Settings** > **Insecure Content** > set to **Allow**.
> - **Solution 3**: Use the **"Open in VLC"** or **"IDM Export"** buttons, which bypass browser HTTP restrictions completely.

---

## 🕷️ Updating the Catalog (Crawler)

To re-index or crawl newly uploaded movies and series from DhakaFlix:
```bash
npm run crawl
```
This multi-threaded crawler scans all 17 categories in parallel, parses metadata (Year, Quality, Audio, Seasons, Episodes, Posters), and updates `public/data/catalog.json` in ~60 seconds.

---

## 📁 Project Structure

```
dhakaflix-web/
├── public/
│   └── data/
│       └── catalog.json         # Pre-indexed database (740+ titles)
├── scripts/
│   ├── crawl.py                 # Multi-threaded DhakaFlix crawler
│   ├── crawler_core.py          # HTML parser & metadata extractor
│   └── crawler_base.py          # Category definitions & server IPs
├── src/
│   ├── components/
│   │   ├── VideoPlayer.tsx      # Video player with buffer tracking & shortcuts
│   │   ├── MediaCard.tsx        # Poster card with stream & download triggers
│   │   ├── SeriesModal.tsx      # Season & episode browser modal
│   │   ├── DownloadManager.tsx  # Multi-item batch downloader & IDM exporter
│   │   ├── TreeExplorer.tsx     # Hierarchical tree folder browser
│   │   ├── Navbar.tsx           # Category dropdowns & search bar
│   │   ├── HeroBanner.tsx       # Featured premiere carousel
│   │   └── Icons.tsx            # Clean native SVG icons
│   ├── categories.ts            # DhakaFlix Movies & TV Series definitions
│   ├── types.ts                 # TypeScript interfaces
│   ├── App.tsx                  # Main app container & search filtering
│   ├── main.tsx                 # Entrypoint
│   └── index.css                # Tailwind CSS & custom animations
├── vercel.json                  # Vercel deployment routing config
├── vite.config.ts               # Vite & Tailwind configuration
└── package.json                 # Project configuration & scripts
```
