"use client";

import React, { useState } from "react";
import { MediaItem, Episode } from "../types";
import { DownloadIcon, CloseIcon, TrashIcon, CopyIcon, ExternalLinkIcon } from "./Icons";

export interface DownloadTarget {
  id: string;
  title: string;
  name: string;
  url: string;
  size?: string;
  type: "movie" | "episode" | "software" | "game";
}

interface DownloadManagerProps {
  selectedItems: DownloadTarget[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export default function DownloadManager({
  selectedItems,
  onRemoveItem,
  onClearAll
}: DownloadManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>("");

  if (selectedItems.length === 0) return null;

  // Trigger sequential browser downloads
  const handleDownloadAll = async () => {
    setDownloading(true);
    setDownloadProgress(`Starting download for ${selectedItems.length} items...`);

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      setDownloadProgress(`Downloading (${i + 1}/${selectedItems.length}): ${item.name}`);

      const link = document.createElement("a");
      link.href = item.url;
      link.download = item.name || "video.mkv";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 400ms delay between items to avoid browser download throttle
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    setDownloadProgress("All downloads triggered!");
    setTimeout(() => {
      setDownloading(false);
      setDownloadProgress("");
    }, 2000);
  };

  // Export to IDM text file (standard BDIX download list)
  const handleExportIDM = () => {
    const urls = selectedItems.map((it) => it.url).join("\r\n");
    const blob = new Blob([urls], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dhakaflix_downloads_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to M3U Playlist (open multiple files in VLC or PotPlayer)
  const handleExportM3U = () => {
    let m3u = "#EXTM3U\n";
    selectedItems.forEach((it) => {
      m3u += `#EXTINF:-1,${it.title} - ${it.name}\n${it.url}\n`;
    });
    const blob = new Blob([m3u], { type: "audio/x-mpegurl;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dhakaflix_playlist_${new Date().toISOString().slice(0, 10)}.m3u`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyAllLinks = () => {
    const urls = selectedItems.map((it) => it.url).join("\n");
    navigator.clipboard.writeText(urls);
    alert(`Copied ${selectedItems.length} direct URLs to clipboard!`);
  };

  return (
    <>
      {/* Floating Bottom Bar */}
      <div className="fixed bottom-6 right-6 z-40 bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-3 md:p-4 flex items-center space-x-3 text-white transition-all transform animate-bounce-subtle">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition shadow-lg shadow-red-600/30"
        >
          <DownloadIcon className="w-4 h-4" />
          <span>Download Menu ({selectedItems.length})</span>
        </button>

        <button
          onClick={handleExportIDM}
          className="hidden sm:flex items-center space-x-1.5 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 transition border border-zinc-700"
          title="Export direct link list for Internet Download Manager"
        >
          <span>IDM List (.txt)</span>
        </button>

        <button
          onClick={onClearAll}
          className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          title="Clear Selection"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Download Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center space-x-2">
                  <DownloadIcon className="w-5 h-5 text-red-500" />
                  <span>Batch Download Manager</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedItems.length} item(s) selected for batch download or export
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {selectedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white truncate max-w-md">
                        {item.title}
                      </span>
                      <span className="bg-zinc-800 text-[10px] text-zinc-400 px-1.5 py-0.5 rounded uppercase">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{item.name}</p>
                    <div className="flex items-center space-x-2 text-[10px] text-zinc-500 mt-1">
                      <span>{item.size || "Unknown size"}</span>
                      <span>●</span>
                      <a
                        href={item.url}
                        download
                        className="text-red-400 hover:underline"
                      >
                        Single Download
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg transition"
                    title="Remove item"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex flex-col space-y-3">
              {downloadProgress && (
                <div className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-3 py-1.5 rounded-lg text-center animate-pulse">
                  {downloadProgress}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={copyAllLinks}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition"
                  >
                    <CopyIcon className="w-3.5 h-3.5" />
                    <span>Copy All Links</span>
                  </button>

                  <button
                    onClick={handleExportIDM}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition"
                    title="Recommended for Internet Download Manager"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                    <span>Export for IDM (.txt)</span>
                  </button>

                  <button
                    onClick={handleExportM3U}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition"
                    title="Export playlist for VLC or PotPlayer"
                  >
                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                    <span>VLC Playlist (.m3u)</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={onClearAll}
                    className="px-3 py-2 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs transition"
                  >
                    Clear All
                  </button>

                  <button
                    disabled={downloading}
                    onClick={handleDownloadAll}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-red-600/30 flex items-center space-x-2 disabled:opacity-50"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    <span>{downloading ? "Downloading..." : "Download All Now"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
