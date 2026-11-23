import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from crawler_core import inspect_folder, fetch_dir
from crawler_base import CATEGORIES

cat = next(c for c in CATEGORIES if c["id"] == "eng-movies-1080p")
# Pick (2024) 1080p partition
part_url = "http://172.16.50.14/DHAKA-FLIX-14/English%20Movies%20%281080p%29/%282024%29%201080p/"
sub_items = fetch_dir(part_url, cat["origin"])
folders = [s["url"] for s in sub_items if s["is_folder"]]

print(f"Testing 2024 partition ({len(folders)} movies)...")
t0 = time.time()
results = []
with ThreadPoolExecutor(max_workers=24) as executor:
    futures = {executor.submit(inspect_folder, f_url, cat["origin"], cat): f_url for f_url in folders}
    for fut in as_completed(futures):
        res = fut.result()
        if res:
            results.append(res)
t1 = time.time()
print(f"Inspected {len(results)} movies in {t1-t0:.2f} seconds!")

# Check if Dune is in results
dunes = [m for m in results if "dune" in m["title"].lower()]
print(f"Dune movies found in 2024: {[d['title'] for d in dunes]}")
