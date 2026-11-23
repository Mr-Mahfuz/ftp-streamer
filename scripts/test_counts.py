import urllib.request
import urllib.parse
import re
from crawler_base import fetch_dir

url = "http://172.16.50.14/DHAKA-FLIX-14/English%20Movies%20%281080p%29/"
origin = "http://172.16.50.14"

root_items = fetch_dir(url, origin)
print(f"Total partitions in English Movies (1080p): {len(root_items)}")

total_subfolders = 0
for part in root_items:
    if part["is_folder"]:
        sub = fetch_dir(part["url"], origin)
        folders = [s for s in sub if s["is_folder"]]
        print(f"  {part['name']}: {len(folders)} folders")
        total_subfolders += len(folders)

print(f"Total movie folders in English Movies (1080p): {total_subfolders}")
