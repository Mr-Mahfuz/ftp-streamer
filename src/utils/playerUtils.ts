/**
 * Launches the network stream directly in VLC, PotPlayer, or any desktop player.
 * 
 * Why .m3u is used:
 * Windows does not register a `vlc://` custom protocol handler by default.
 * However, VLC Media Player and PotPlayer are the registered default handlers for `.m3u` playlist files.
 * Generating a 1-line .m3u stream playlist downloads instantly (< 1KB) and when opened,
 * VLC / PotPlayer launches immediately and streams directly over BDIX without downloading the video!
 */
export function launchExternalStream(streamUrl: string, title: string) {
  if (!streamUrl) return;

  const m3uContent = `#EXTM3U\n#EXTINF:-1,${title}\n${streamUrl}\n`;
  const blob = new Blob([m3uContent], { type: "audio/x-mpegurl" });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  const cleanTitle = title.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "_") || "stream";
  a.download = `${cleanTitle}.m3u`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

/**
 * Copies the raw HTTP stream URL and returns instructions for VLC/PotPlayer.
 */
export async function copyNetworkStreamUrl(streamUrl: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(streamUrl);
    return true;
  } catch (err) {
    console.error("Failed to copy URL:", err);
    return false;
  }
}
