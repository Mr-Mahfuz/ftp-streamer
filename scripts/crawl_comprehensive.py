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

OUTPUT_FILE = r"c:\workspace\Personal\dhakaflix-stream\public\data\catalog.json"

def get_subfolders_to_crawl(cat):
    """Recursively finds media folders across all letter buckets and year folders."""
    root_items = fetch_dir(cat["url"], cat["origin"])
    folders_to_inspect = []

    # Check if this category root is partitioned (by letters, years, or languages)
    is_partitioned = False
    for it in root_items:
        name = it["name"]
        if it["is_folder"] and (
            re.search(r'\d{4}', name) or
            "—" in name or
            "--" in name or
            "Language" in name or
            "Series" in name or
            "★" in name or
            "♥" in name or
            "♦" in name
        ):
            is_partitioned = True
            break

    if is_partitioned:
        partition_folders = [it for it in root_items if it["is_folder"]]
        print(f"  {cat['name']} has {len(partition_folders)} partitions (letters/years/languages). Traversing each...")
        
        # For each partition bucket (e.g. A-F, G-M, N-S, T-Z or 2026, 2025, etc.)
        for part in partition_folders:
            sub_items = fetch_dir(part["url"], cat["origin"])
            sub_folders = [s["url"] for s in sub_items if s["is_folder"]]
            
            # Determine quota per partition
            # For series letter buckets (e.g. A-F), take up to 45 per bucket
            # For movie year buckets (30+ years), take 10-25 per year
            if "—" in part["name"] or "--" in part["name"]:
                quota = 50
            elif re.search(r'202[0-6]', part["name"]):
                quota = 30
            else:
                quota = 15
                
            folders_to_inspect.extend(sub_folders[:quota])
    else:
        # Non-partitioned category: take up to 80
        direct_folders = [it["url"] for it in root_items if it["is_folder"]]
        folders_to_inspect.extend(direct_folders[:80])

    return folders_to_inspect

def main():
    print("=== DHAKAFLIX COMPREHENSIVE ALPHABET & YEAR CRAWLER ===")
    t0 = time.time()
    
    # Load existing catalog so we never lose already indexed items
    existing_items = []
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing_items = json.load(f)
            print(f"Loaded existing catalog with {len(existing_items)} items.")
        except Exception as e:
            print("Could not load existing catalog:", e)

    unique_items_map = {m["id"]: m for m in existing_items}
    total_new_added = 0

    for cat in CATEGORIES:
        try:
            print(f"\nScanning Category: {cat['name']}...")
            folders = get_subfolders_to_crawl(cat)
            print(f"  Found {len(folders)} candidate media folders across all partitions.")
            
            # Filter out folders already indexed
            existing_urls = {m.get("folder_url") for m in unique_items_map.values()}
            needed_folders = [f for f in folders if f not in existing_urls]
            print(f"  {len(needed_folders)} new folders to inspect for {cat['name']}.")

            cat_results = []
            with ThreadPoolExecutor(max_workers=24) as executor:
                future_map = {executor.submit(inspect_folder, f_url, cat["origin"], cat): f_url for f_url in needed_folders}
                for future in as_completed(future_map):
                    try:
                        res = future.result()
                        if res and res.get("id"):
                            cat_results.append(res)
                    except Exception:
                        pass

            for item in cat_results:
                if item["id"] not in unique_items_map:
                    unique_items_map[item["id"]] = item
                    total_new_added += 1

            print(f"  Added {len(cat_results)} entries from {cat['name']}. Total now: {len(unique_items_map)}", flush=True)
            # Save incrementally after each category
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(list(unique_items_map.values()), f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error in {cat['name']}: {e}", flush=True)

    final_list = list(unique_items_map.values())
    print(f"\n=======================================================")
    print(f"Crawl Completed in {time.time()-t0:.2f}s!")
    print(f"Total catalog entries: {len(final_list)} (New added this run: {total_new_added})")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)
    print(f"Saved to {OUTPUT_FILE} successfully!")

if __name__ == "__main__":
    main()
