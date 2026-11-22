import urllib.request
import urllib.parse
import re
import json
import time
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed

USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
TABLE_PATTERN = re.compile(
    r'<tr><td class="fb-i"><img src="([^"]+)"[^>]*></td><td class="fb-n"><a href="([^"]+)">([^<]+)</a></td><td class="fb-d">([^<]*)</td><td class="fb-s">([^<]*)</td></tr>'
)

OUTPUT_FILE = r"c:\workspace\Personal\dhakaflix-stream\public\data\games_software.json"

def fetch_dir(url, origin):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req, timeout=12) as resp:
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
        print(f"Error fetching {url}: {e}")
        return []

def inspect_download_item(item_url, origin, cat_id, cat_name, raw_name, folder_size=""):
    """Inspects a game or software folder to list downloadable files inside."""
    items = fetch_dir(item_url, origin)
    clean_name = raw_name
    
    # Platform detection
    platform = "PC"
    if "ps4" in raw_name.lower(): platform = "PS4"
    elif "ps3" in raw_name.lower(): platform = "PS3"
    elif "xbox" in raw_name.lower(): platform = "XBOX"
    elif "switch" in raw_name.lower(): platform = "Switch"
    elif "android" in raw_name.lower() or "apk" in raw_name.lower(): platform = "Android"
    elif "macos" in raw_name.lower() or "mac" in raw_name.lower(): platform = "macOS"
    elif "windows" in raw_name.lower(): platform = "Windows"

    files = []
    total_size = folder_size
    for it in items:
        if not it["is_folder"]:
            files.append({
                "name": it["name"],
                "url": it["url"],
                "size": it["size"]
            })
    
    # If single direct file inside or prominent installer/iso
    primary_download_url = item_url
    if len(files) == 1:
        primary_download_url = files[0]["url"]
        if files[0]["size"]:
            total_size = files[0]["size"]
    elif len(files) > 1:
        # Find setup.exe, .iso, .apk or first part
        key_file = next((f for f in files if f["name"].lower().endswith(('.iso', '.exe', '.apk', '.xapk', '.pkg', '.zip', '.rar'))), files[0])
        primary_download_url = key_file["url"]

    item_id = hashlib.md5(item_url.encode()).hexdigest()[:12]

    return {
        "id": item_id,
        "title": clean_name,
        "category_id": cat_id,
        "category_name": cat_name,
        "platform": platform,
        "size": total_size,
        "folder_url": item_url,
        "download_url": primary_download_url,
        "file_count": len(files),
        "files": files[:30] # first 30 files in folder for multi-part downloads
    }

def main():
    print("=== DHAKAFLIX GAMES & SOFTWARE CRAWLER ===")
    t0 = time.time()
    all_items = []

    # 1. Software (102 items)
    print("\nCrawling Software...")
    soft_roots = fetch_dir("http://172.16.50.8/DHAKA-FLIX-8/Software/", "http://172.16.50.8")
    for s in soft_roots:
        if s["is_folder"]:
            all_items.append({
                "url": s["url"],
                "origin": "http://172.16.50.8",
                "cat_id": "software",
                "cat_name": "Software & Tools",
                "name": s["name"],
                "size": s["size"]
            })

    # 2. Android Games (150 items)
    print("Crawling Android Games...")
    android_roots = fetch_dir("http://172.16.50.8/DHAKA-FLIX-8/Android%20Games/", "http://172.16.50.8")
    for a in android_roots:
        if a["is_folder"]:
            all_items.append({
                "url": a["url"],
                "origin": "http://172.16.50.8",
                "cat_id": "android-games",
                "cat_name": "Android Games",
                "name": a["name"],
                "size": a["size"]
            })

    # 3. Console Games (412 items)
    print("Crawling Console Games...")
    console_roots = fetch_dir("http://172.16.50.8/DHAKA-FLIX-8/Console%20Games/", "http://172.16.50.8")
    for c in console_roots:
        if c["is_folder"]:
            all_items.append({
                "url": c["url"],
                "origin": "http://172.16.50.8",
                "cat_id": "console-games",
                "cat_name": "Console Games",
                "name": c["name"],
                "size": c["size"]
            })

    # 4. PC Games (Partitioned: 0-9, A-D, E-K, L-R, S-Z)
    print("Crawling PC Games partitions...")
    pc_parts = fetch_dir("http://172.16.50.8/DHAKA-FLIX-8/PC%20Games/", "http://172.16.50.8")
    for part in pc_parts:
        if part["is_folder"]:
            print(f"  Fetching PC Games partition: {part['name']}...")
            sub_games = fetch_dir(part["url"], "http://172.16.50.8")
            for g in sub_games:
                if g["is_folder"]:
                    all_items.append({
                        "url": g["url"],
                        "origin": "http://172.16.50.8",
                        "cat_id": "pc-games",
                        "cat_name": "PC Games",
                        "name": g["name"],
                        "size": g["size"]
                    })

    print(f"\nTotal Games & Software folders discovered: {len(all_items)}. Inspecting files inside...")

    inspected_results = []
    with ThreadPoolExecutor(max_workers=24) as executor:
        future_map = {
            executor.submit(inspect_download_item, it["url"], it["origin"], it["cat_id"], it["cat_name"], it["name"], it["size"]): it
            for it in all_items
        }
        for future in as_completed(future_map):
            try:
                res = future.result()
                if res:
                    inspected_results.append(res)
            except Exception:
                pass

    print(f"Inspected {len(inspected_results)} Games & Software entries in {time.time()-t0:.2f}s!")
    print(f"Saving to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(inspected_results, f, indent=2, ensure_ascii=False)
    print("Games & Software index saved successfully!")

if __name__ == "__main__":
    main()
