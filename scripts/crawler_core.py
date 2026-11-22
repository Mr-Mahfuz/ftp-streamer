import urllib.request
import urllib.parse
import re
import json
import time
import os
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed

USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
TABLE_PATTERN = re.compile(
    r'<tr><td class="fb-i"><img src="([^"]+)"[^>]*></td><td class="fb-n"><a href="([^"]+)">([^<]+)</a></td><td class="fb-d">([^<]*)</td><td class="fb-s">([^<]*)</td></tr>'
)

VIDEO_EXTS = ('.mkv', '.mp4', '.avi', '.webm', '.mov', '.ts')
SUB_EXTS = ('.srt', '.vtt', '.sub', '.ass')
IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.webp')

def fetch_dir(url, origin):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode('utf-8', 'ignore')
        matches = TABLE_PATTERN.findall(html)
        items = []
        for icon, href, name, date, size in matches:
            if name == "Parent Directory":
                continue
            is_folder = "folder" in icon
            full_url = urllib.parse.urljoin(origin, href)
            items.append({
                "name": name.strip(),
                "is_folder": is_folder,
                "url": full_url,
                "date": date.strip(),
                "size": size.strip()
            })
        return items
    except Exception as e:
        return []

def parse_metadata(raw_name):
    year_m = re.search(r'\((?:TV (?:Mini )?Series )?(\d{4}(?:[–-]\d{4}|[–-]\s*)?)\)', raw_name)
    year = year_m.group(1).strip() if year_m else ""

    quality_m = re.search(r'\b(2160p|4K|1080p|720p|480p|HDRip|WEBRip|BluRay)\b', raw_name, re.I)
    quality = quality_m.group(1).upper() if quality_m else ""

    audio = ""
    lower = raw_name.lower()
    if "dual audio" in lower:
        audio = "Dual Audio"
    elif "multi audio" in lower:
        audio = "Multi Audio"
    elif "hindi dubbed" in lower:
        audio = "Hindi Dubbed"
    elif "hindi" in lower:
        audio = "Hindi"
    elif "bangla" in lower:
        audio = "Bangla"
    elif "english" in lower:
        audio = "English"

    clean_title = re.split(r'\s*\(', raw_name)[0].strip()
    if not clean_title:
        clean_title = raw_name

    return {
        "title": clean_title,
        "year": year,
        "quality": quality,
        "audio": audio
    }

def inspect_folder(folder_url, origin, cat_info, max_depth=2):
    """Inspects a movie or series folder and returns the structured entry."""
    items = fetch_dir(folder_url, origin)
    if not items:
        return None

    raw_name = folder_url.rstrip('/').split('/')[-1]
    raw_name = urllib.parse.unquote(raw_name)
    meta = parse_metadata(raw_name)

    poster = ""
    video_files = []
    subtitles = []
    season_folders = []

    for it in items:
        lower = it["name"].lower()
        if it["is_folder"]:
            if "season" in lower or re.match(r's\d+', lower):
                season_folders.append(it)
        else:
            if lower.endswith(VIDEO_EXTS):
                video_files.append(it)
            elif lower.endswith(SUB_EXTS):
                subtitles.append(it)
            elif lower.endswith(IMAGE_EXTS):
                if "al" in lower or "vl" in lower or not poster:
                    poster = it["url"]

    # Generate a stable deterministic ID
    unique_str = f"{cat_info['id']}_{raw_name}"
    item_id = hashlib.md5(unique_str.encode('utf-8')).hexdigest()[:12]

    # If it has season folders, treat as series
    if season_folders:
        seasons_data = []
        for s_folder in season_folders:
            s_name = s_folder["name"]
            # Extract season number
            s_num_match = re.search(r'(\d+)', s_name)
            s_num = int(s_num_match.group(1)) if s_num_match else len(seasons_data) + 1

            episodes_items = fetch_dir(s_folder["url"], origin)
            episodes = []
            ep_subs = []
            for ep in episodes_items:
                ep_lower = ep["name"].lower()
                if not ep["is_folder"] and ep_lower.endswith(VIDEO_EXTS):
                    episodes.append({
                        "name": ep["name"],
                        "url": ep["url"],
                        "size": ep["size"],
                        "date": ep["date"]
                    })
                elif not ep["is_folder"] and ep_lower.endswith(SUB_EXTS):
                    ep_subs.append(ep["url"])

            episodes.sort(key=lambda x: x["name"])
            seasons_data.append({
                "season": s_num,
                "season_name": s_name,
                "episodes": episodes,
                "subtitles": ep_subs
            })

        seasons_data.sort(key=lambda x: x["season"])

        return {
            "id": item_id,
            "title": meta["title"],
            "raw_name": raw_name,
            "type": "series",
            "category_id": cat_info["id"],
            "category_name": cat_info["name"],
            "menu": "tv-series",
            "year": meta["year"],
            "quality": meta["quality"] or "1080P",
            "audio": meta["audio"] or "Dual Audio",
            "poster": poster,
            "folder_url": folder_url,
            "seasons": seasons_data,
            "total_episodes": sum(len(s["episodes"]) for s in seasons_data)
        }

    # If it has video files directly inside, it's a movie
    elif video_files:
        # Choose the largest or main video file
        main_video = video_files[0]
        return {
            "id": item_id,
            "title": meta["title"],
            "raw_name": raw_name,
            "type": "movie",
            "category_id": cat_info["id"],
            "category_name": cat_info["name"],
            "menu": "movies",
            "year": meta["year"],
            "quality": meta["quality"] or "720P",
            "audio": meta["audio"],
            "poster": poster,
            "folder_url": folder_url,
            "stream_url": main_video["url"],
            "filename": main_video["name"],
            "size": main_video["size"],
            "date": main_video["date"],
            "subtitles": [s["url"] for s in subtitles]
        }
    return None
