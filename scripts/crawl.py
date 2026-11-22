import urllib.request
import urllib.parse
import re
import json
import time
import os
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from crawler_core import inspect_folder, fetch_dir
from crawler_base import CATEGORIES

CATALOG_FILE = r"C:\workspace\Personal\dhakaflix_catalog.json"

def crawl_category(cat, max_sub=60):
    print(f"Crawling category: {cat['name']} ({cat['url']})")
    root_items = fetch_dir(cat["url"], cat["origin"])
    folders_to_crawl = []

    # Check if root items are Year/Letter folders or direct media
    is_nested = False
    for it in root_items:
        name = it["name"]
        # If it looks like a year: (2026), 2026, or Letter grouping: A — L, or 0 — 9
        if it["is_folder"] and (re.match(r'^\(?\d{4}\)?$', name) or "—" in name or "--" in name):
            is_nested = True
            break

    if is_nested:
        print(f"  {cat['name']} is nested. Fetching subfolders...")
        for it in root_items:
            if not it["is_folder"]:
                continue
            sub_items = fetch_dir(it["url"], cat["origin"])
            for s in sub_items:
                if s["is_folder"]:
                    folders_to_crawl.append(s["url"])
    else:
        for it in root_items:
            if it["is_folder"]:
                folders_to_crawl.append(it["url"])

    print(f"  Found {len(folders_to_crawl)} folders to inspect for {cat['name']}. Inspecting (up to {max_sub})...")
    # Take latest/first max_sub items
    target_folders = folders_to_crawl[:max_sub]
    results = []

    with ThreadPoolExecutor(max_workers=12) as executor:
        future_map = {executor.submit(inspect_folder, f_url, cat["origin"], cat): f_url for f_url in target_folders}
        for future in as_completed(future_map):
            try:
                res = future.result()
                if res:
                    results.append(res)
            except Exception as e:
                pass

    print(f"  Finished {cat['name']}: {len(results)} valid media entries indexed.")
    return results

def main():
    t0 = time.time()
    all_media = []

    # Let's crawl key categories across Movies and TV Series
    for cat in CATEGORIES:
        try:
            # For large categories, limit to 40-50 latest to keep initial crawl fast
            limit = 60
            if cat["id"] in ["tv-web-series", "eng-movies", "hindi-movies", "south-movies"]:
                limit = 70
            elif cat["id"] in ["korean-series", "documentary", "anim-movies-1080p"]:
                limit = 40
            cat_results = crawl_category(cat, max_sub=limit)
            all_media.extend(cat_results)
        except Exception as e:
            print(f"Error crawling {cat['name']}: {e}")

    # Remove duplicates by ID
    unique_items = {}
    for m in all_media:
        if m["id"] not in unique_items:
            unique_items[m["id"]] = m

    final_list = list(unique_items.values())
    print(f"\n==========================================")
    print(f"Total media indexed: {len(final_list)} in {time.time()-t0:.2f}s")
    print(f"Saving to {CATALOG_FILE}...")
    with open(CATALOG_FILE, "w", encoding="utf-8") as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)
    print("Catalog saved successfully!")

if __name__ == "__main__":
    main()
