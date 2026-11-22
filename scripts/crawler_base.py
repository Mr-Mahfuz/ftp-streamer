import urllib.request
import urllib.parse
import re
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
TABLE_PATTERN = re.compile(
    r'<tr><td class="fb-i"><img src="([^"]+)"[^>]*></td><td class="fb-n"><a href="([^"]+)">([^<]+)</a></td><td class="fb-d">([^<]*)</td><td class="fb-s">([^<]*)</td></tr>'
)

VIDEO_EXTS = ('.mkv', '.mp4', '.avi', '.webm', '.mov', '.ts')
SUB_EXTS = ('.srt', '.vtt', '.sub', '.ass')
IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.webp')

CATEGORIES = [
    # 2nd SS - Movies
    {"id": "eng-movies", "name": "English Movies", "type": "movie", "url": "http://172.16.50.7/DHAKA-FLIX-7/English%20Movies/", "origin": "http://172.16.50.7"},
    {"id": "eng-movies-1080p", "name": "English Movies - 1080p", "type": "movie", "url": "http://172.16.50.14/DHAKA-FLIX-14/English%20Movies%20%281080p%29/", "origin": "http://172.16.50.14"},
    {"id": "hindi-movies", "name": "Hindi Movies", "type": "movie", "url": "http://172.16.50.14/DHAKA-FLIX-14/Hindi%20Movies/", "origin": "http://172.16.50.14"},
    {"id": "south-movies", "name": "South Indian Movies", "type": "movie", "url": "http://172.16.50.14/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/South%20Movies/", "origin": "http://172.16.50.14"},
    {"id": "south-hindi-dub", "name": "South-Movie Hindi Dubbed", "type": "movie", "url": "http://172.16.50.14/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/Hindi%20Dubbed/", "origin": "http://172.16.50.14"},
    {"id": "kolkata-bangla", "name": "Kolkata Bangla Movies", "type": "movie", "url": "http://172.16.50.7/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/", "origin": "http://172.16.50.7"},
    {"id": "anim-movies", "name": "Animation Movies", "type": "movie", "url": "http://172.16.50.14/DHAKA-FLIX-14/Animation%20Movies/", "origin": "http://172.16.50.14"},
    {"id": "anim-movies-1080p", "name": "Animation Movies - 1080p", "type": "movie", "url": "http://172.16.50.14/DHAKA-FLIX-14/Animation%20Movies%20%281080p%29/", "origin": "http://172.16.50.14"},
    {"id": "foreign-movies", "name": "Foreign Language Movies", "type": "movie", "url": "http://172.16.50.7/DHAKA-FLIX-7/Foreign%20Language%20Movies/", "origin": "http://172.16.50.7"},
    {"id": "imdb-250", "name": "IMDb Top-250 Movies", "type": "movie", "url": "http://172.16.50.14/DHAKA-FLIX-14/IMDb%20Top-250%20Movies/", "origin": "http://172.16.50.14"},
    {"id": "3d-movies", "name": "3D Movies", "type": "movie", "url": "http://172.16.50.7/DHAKA-FLIX-7/3D%20Movies/", "origin": "http://172.16.50.7"},

    # 3rd SS - TV Series
    {"id": "tv-web-series", "name": "TV & WEB Series", "type": "series", "url": "http://172.16.50.12/DHAKA-FLIX-12/TV-WEB-Series/", "origin": "http://172.16.50.12"},
    {"id": "korean-series", "name": "KOREAN TV & WEB Series", "type": "series", "url": "http://172.16.50.14/DHAKA-FLIX-14/KOREAN%20TV%20%26%20WEB%20Series/", "origin": "http://172.16.50.14"},
    {"id": "cartoon-series", "name": "Cartoon TV Series", "type": "series", "url": "http://172.16.50.10/DHAKA-FLIX-10/Anime%20%26%20Cartoon%20TV%20Series/", "origin": "http://172.16.50.10"},
    {"id": "documentary", "name": "Documentary", "type": "series", "url": "http://172.16.50.10/DHAKA-FLIX-10/Documentary/", "origin": "http://172.16.50.10"},
    {"id": "wwe-aew", "name": "WWE & AEW Wrestling", "type": "series", "url": "http://172.16.50.10/DHAKA-FLIX-10/WWE%20%26%20AEW%20Wrestling/", "origin": "http://172.16.50.10"},
    {"id": "award-tv-shows", "name": "Award & TV Shows", "type": "series", "url": "http://172.16.50.10/DHAKA-FLIX-10/Awards%20%26%20TV%20Shows/", "origin": "http://172.16.50.10"}
]

def fetch_dir(url, origin):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req, timeout=6) as resp:
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
    # Year
    year_m = re.search(r'\((?:TV (?:Mini )?Series )?(\d{4}(?:[–-]\d{4}|[–-]\s*)?)\)', raw_name)
    year = year_m.group(1).strip() if year_m else ""

    # Quality
    quality_m = re.search(r'\b(2160p|4K|1080p|720p|480p|HDRip|WEBRip|BluRay)\b', raw_name, re.I)
    quality = quality_m.group(1).upper() if quality_m else ""

    # Audio
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

    # Title
    title = re.split(r'\s*\(', raw_name)[0].strip()
    if not title:
        title = raw_name

    return {
        "title": title,
        "year": year,
        "quality": quality,
        "audio": audio
    }
