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

# Targets where we want COMPLETE indexing (NO quotas, every single folder!):
FULL_CRAWL_CAT_IDS = [
    "eng-movies-1080p",      # ALL 3,860 English 1080p movies
    "anim-movies-1080p",     # ALL Animation 1080p movies
]

# For other categories, expand recent years (2018-2026) to 100% full, and others to 50
def get_folders_for_cat(cat):
    root_items = fetch_dir(cat["url"], cat["origin"])
    is_partitioned = any(
        it["is_folder"] and (
            re.search(r'\d{4}', it["name"]) or
            "—" in it["name"] or
            "--" in it["name"] or
            "Language" in it["name"] or
            "Series" in it["name"] or
            "★" in it["name"] or
            "♥" in it["name"] or
            "♦" in it["name"]
        )
        for it in root_items
    )

    folders_to_inspect = []
    is_full = cat["id"] in FULL_CRAWL_CAT_IDS

    if is_partitioned:
        partition_folders = [it for it in root_items if it["is_folder"]]
        print(f"  {cat['name']}: {len(partition_folders)} partitions...")
        for part in partition_folders:
            sub_items = fetch_dir(part["url"], cat["origin"])
            sub_folders = [s["url"] for s in sub_items if s["is_folder"]]
            if is_full:
                # 100% full indexing - zero omissions!
                folders_to_inspect.extend(sub_folders)
            else:
                # If recent (2020-2026) or letters (A-Z), take up to 80
                if re.search(r'202[0-6]', part["name"]):
                    folders_to_inspect.extend(sub_folders) # All recent!
                elif "—" in part["name"] or "--" in part["name"]:
                    folders_to_inspect.extend(sub_folders[:60])
                else:
                    folders_to_inspect.extend(sub_folders[:30])
    else:
        direct_folders = [it["url"] for it in root_items if it["is_folder"]]
        folders_to_inspect.extend(direct_folders)

    return folders_to_inspect

def main():
    print("=== DHAKAFLIX FULL MOVIE INDEXER ===")
    t0 = time.time()

    existing_items = []
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing_items = json.load(f)
            print(f"Loaded existing catalog with {len(existing_items)} items.")
        except Exception as e:
            print("Error loading existing catalog:", e)

    unique_items_map = {m["id"]: m for m in existing_items}
    existing_urls = {m.get("folder_url") for m in unique_items_map.values()}
    total_added = 0

    # Prioritize English Movies 1080p, Animation 1080p, Hindi, Series
    for cat in CATEGORIES:
        try:
            print(f"\nScanning Category: {cat['name']} ({cat['id']})...")
            folders = get_folders_for_cat(cat)
            print(f"  Total candidate folders found: {len(folders)}")

            needed_folders = [f for f in folders if f not in existing_urls]
            print(f"  New folders to inspect: {len(needed_folders)}")

            if not needed_folders:
                print("  All folders already indexed. Skipping.")
                continue

            batch_results = []
            with ThreadPoolExecutor(max_workers=24) as executor:
                future_map = {executor.submit(inspect_folder, f_url, cat["origin"], cat): f_url for f_url in needed_folders}
                for fut in as_completed(future_map):
                    try:
                        res = fut.result()
                        if res and res.get("id"):
                            batch_results.append(res)
                    except Exception:
                        pass

            new_in_cat = 0
            for item in batch_results:
                if item["id"] not in unique_items_map:
                    unique_items_map[item["id"]] = item
                    existing_urls.add(item.get("folder_url"))
                    new_in_cat += 1
                    total_added += 1

            print(f"  Added {new_in_cat} new entries! Total catalog now: {len(unique_items_map)}", flush=True)

            # Save progress
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(list(unique_items_map.values()), f, indent=2, ensure_ascii=False)

        except Exception as e:
            print(f"Error scanning {cat['name']}: {e}", flush=True)

    final_list = list(unique_items_map.values())
    print("\n=======================================================")
    print(f"Finished in {time.time()-t0:.2f}s!")
    print(f"Total catalog entries: {len(final_list)} (Newly added: {total_added})")

    # Double check Dune Part Two
    dune_matches = [m for m in final_list if "dune" in m["title"].lower()]
    print(f"\nDune matches in catalog: {[d['title'] + ' (' + str(d.get('year')) + ')' for d in dune_matches]}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)
    print("Catalog updated successfully!")

if __name__ == "__main__":
    main()
