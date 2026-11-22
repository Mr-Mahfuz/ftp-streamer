import urllib.request
import urllib.parse
import re
import json
import time
import hashlib

USER_AGENT = 'Mozilla/5.0'
TABLE_PATTERN = re.compile(
    r'<tr><td class="fb-i"><img src="([^"]+)"[^>]*></td><td class="fb-n"><a href="([^"]+)">([^<]+)</a></td><td class="fb-d">([^<]*)</td><td class="fb-s">([^<]*)</td></tr>'
)

OUTPUT_FILE = r"c:\workspace\Personal\dhakaflix-stream\public\data\games_software.json"

def fetch_category(name, url, cat_id, cat_name):
    print(f"Fetching {name}...", flush=True)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req, timeout=25) as resp:
            html = resp.read().decode('utf-8', 'ignore')
        matches = TABLE_PATTERN.findall(html)
        entries = []
        for icon, href, n, d, s in matches:
            if n == "Parent Directory":
                continue
            is_folder = "folder" in icon
            full_url = urllib.parse.urljoin("http://172.16.50.8", href)
            
            # Platform detection
            lower = n.lower()
            platform = "PC"
            if "ps4" in lower: platform = "PS4"
            elif "ps3" in lower: platform = "PS3"
            elif "psp" in lower: platform = "PSP"
            elif "xbox" in lower: platform = "XBOX"
            elif "switch" in lower or "nintendo" in lower: platform = "Switch"
            elif "android" in lower or "apk" in lower or cat_id == "android-games": platform = "Android"
            elif "macos" in lower or "mac" in lower: platform = "macOS"
            elif "windows" in lower or cat_id == "pc-games": platform = "PC"
            elif cat_id == "software": platform = "Windows"

            item_id = hashlib.md5(full_url.encode()).hexdigest()[:12]
            entries.append({
                "id": item_id,
                "title": n.strip(),
                "category_id": cat_id,
                "category_name": cat_name,
                "platform": platform,
                "size": s.strip() if s.strip() else "Package",
                "folder_url": full_url,
                "download_url": full_url,
                "file_count": 1,
                "files": []
            })
        print(f"  -> Got {len(entries)} items for {name}.", flush=True)
        return entries
    except Exception as e:
        print(f"  -> Error {name}: {e}", flush=True)
        return []

def main():
    all_items = []
    # 1. Software
    all_items.extend(fetch_category("Software", "http://172.16.50.8/DHAKA-FLIX-8/Software/", "software", "Software & Tools"))
    time.sleep(1)
    
    # 2. Android Games
    all_items.extend(fetch_category("Android Games", "http://172.16.50.8/DHAKA-FLIX-8/Android%20Games/", "android-games", "Android Games"))
    time.sleep(1)

    # 3. Console Games
    all_items.extend(fetch_category("Console Games", "http://172.16.50.8/DHAKA-FLIX-8/Console%20Games/", "console-games", "Console Games"))
    time.sleep(1)

    # 4. PC Games partitions
    pc_parts = [
        ("PC Games 0-9", "http://172.16.50.8/DHAKA-FLIX-8/PC%20Games/PC%20Games%20%E2%98%85%20%200%20%20%E2%80%94%20%209/"),
        ("PC Games A-D", "http://172.16.50.8/DHAKA-FLIX-8/PC%20Games/PC%20Games%20%E2%99%A5%20%20A%20%20%E2%80%94%20%20D/"),
        ("PC Games E-K", "http://172.16.50.8/DHAKA-FLIX-8/PC%20Games/PC%20Games%20%E2%99%A6%20%20E%20%20%E2%80%94%20%20K/"),
        ("PC Games L-R", "http://172.16.50.8/DHAKA-FLIX-8/PC%20Games/PC%20Games%20%E2%99%A6%20%20L%20%20%E2%80%94%20%20R/"),
        ("PC Games S-Z", "http://172.16.50.8/DHAKA-FLIX-8/PC%20Games/PC%20Games%20%E2%99%A6%20%20S%20%20%E2%80%94%20%20Z/"),
    ]
    for pname, purl in pc_parts:
        all_items.extend(fetch_category(pname, purl, "pc-games", "PC Games"))
        time.sleep(1)

    print(f"\nTOTAL ITEMS INDEXED: {len(all_items)}", flush=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_items, f, indent=2, ensure_ascii=False)
    print("Saved to public/data/games_software.json successfully!", flush=True)

if __name__ == "__main__":
    main()
