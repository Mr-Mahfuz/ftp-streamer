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

def fetch_dir(url, origin):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as resp:
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
        print(f"Error {url}: {e}")
        return []

def detect_platform(name, cat_id):
    lower = name.lower()
    if "ps4" in lower: return "PS4"
    if "ps3" in lower: return "PS3"
    if "psp" in lower: return "PSP"
    if "xbox" in lower: return "XBOX"
    if "switch" in lower or "nintendo" in lower: return "Switch"
    if "android" in lower or "apk" in lower or cat_id == "android-games": return "Android"
    if "macos" in lower or "mac" in lower: return "macOS"
    if "windows" in lower or cat_id == "pc-games": return "PC"
    if cat_id == "software": return "Windows"
    return "PC"

def create_entry(item, cat_id, cat_name):
    platform = detect_platform(item["name"], cat_id)
    item_id = hashlib.md5(item["url"].encode()).hexdigest()[:12]
    return {
        "id": item_id,
        "title": item["name"],
        "category_id": cat_id,
        "category_name": cat_name,
        "platform": platform,
        "size": item["size"] if item["size"] else "Multi-part",
        "folder_url": item["url"],
        "download_url": item["url"],
        "file_count": 1,
        "files": []
    }

def main():
    print("=== RAPID GAMES & SOFTWARE INDEXER ===")
    t0 = time.time()
    all_entries = []

    # 1. Software (102 items)
    print("Fetching Software items...")
    soft_items = fetch_dir("http://172.16.50.8/DHAKA-FLIX-8/Software/", "http://172.16.50.8")
    for s in soft_items:
        if s["is_folder"]:
            all_entries.append(create_entry(s, "software", "Software & Tools"))
    print(f"  Indexed {len(soft_items)} Software items.")

    # 2. Android Games (150 items)
    print("Fetching Android Games...")
    android_items = fetch_dir("http://172.16.50.8/DHAKA-FLIX-8/Android%20Games/", "http://172.16.50.8")
    for a in android_items:
        if a["is_folder"]:
            all_entries.append(create_entry(a, "android-games", "Android Games"))
    print(f"  Indexed {len(android_items)} Android Games.")

    # 3. Console Games (412 items)
    print("Fetching Console Games...")
    console_items = fetch_dir("http://172.16.50.8/DHAKA-FLIX-8/Console%20Games/", "http://172.16.50.8")
    for c in console_items:
        if c["is_folder"]:
            all_entries.append(create_entry(c, "console-games", "Console Games"))
    print(f"  Indexed {len(console_items)} Console Games.")

    # 4. PC Games partitions (5 letter buckets)
    print("Fetching PC Games partitions...")
    pc_parts = fetch_dir("http://172.16.50.8/DHAKA-FLIX-8/PC%20Games/", "http://172.16.50.8")
    pc_count = 0
    for part in pc_parts:
        if part["is_folder"]:
            print(f"  Partition {part['name']}...")
            sub = fetch_dir(part["url"], "http://172.16.50.8")
            for g in sub:
                if g["is_folder"]:
                    all_entries.append(create_entry(g, "pc-games", "PC Games"))
                    pc_count += 1
    print(f"  Indexed {pc_count} PC Games.")

    print(f"\n=======================================================")
    print(f"Indexed {len(all_entries)} total Games & Software in {time.time()-t0:.2f}s!")
    print(f"Saving to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, indent=2, ensure_ascii=False)
    print("Saved successfully!")

if __name__ == "__main__":
    main()
