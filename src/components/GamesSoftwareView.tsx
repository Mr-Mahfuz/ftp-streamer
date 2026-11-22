"use client";

import React, { useState, useEffect, useMemo } from "react";
import { GameSoftwareItem } from "../types";
import { DownloadTarget } from "./DownloadManager";
import GamesSoftwareModal from "./GamesSoftwareModal";
import {
  DownloadIcon,
  SearchIcon,
  CheckIcon,
  CopyIcon,
  FolderTreeIcon,
  GamepadIcon,
  SoftwareIcon,
  SparklesIcon
} from "./Icons";

interface GamesSoftwareViewProps {
  onToggleTarget: (target: DownloadTarget) => void;
  onAddBatchTargets: (targets: DownloadTarget[]) => void;
  selectedIds: Set<string>;
}

export default function GamesSoftwareView({
  onToggleTarget,
  onAddBatchTargets,
  selectedIds
}: GamesSoftwareViewProps) {
  const [items, setItems] = useState<GameSoftwareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeModalItem, setActiveModalItem] = useState<GameSoftwareItem | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/data/games_software.json");
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (err) {
        console.error("Failed to load games_software.json:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category_id !== selectedCategory) {
        return false;
      }
      // Search tokens
      if (searchQuery.trim()) {
        const tokens = searchQuery.toLowerCase().replace(/&/g, "and").split(/\s+/).filter(Boolean);
        const fullText = `${item.title} ${item.category_name} ${item.platform} ${item.size || ""}`
          .toLowerCase()
          .replace(/&/g, "and");
        const match = tokens.every((tok) => fullText.includes(tok));
        if (!match) return false;
      }
      return true;
    });
  }, [items, selectedCategory, searchQuery]);

  // Paginated items
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const toggleSelectCard = (item: GameSoftwareItem) => {
    const target: DownloadTarget = {
      id: item.id,
      title: item.title,
      name: `${item.title} [${item.platform || "Download"}]`,
      url: item.download_url,
      size: item.size,
      type: "software"
    };
    onToggleTarget(target);
  };

  const handleSelectAllVisible = () => {
    const targets: DownloadTarget[] = paginatedItems.map((item) => ({
      id: item.id,
      title: item.title,
      name: `${item.title} [${item.platform || "Download"}]`,
      url: item.download_url,
      size: item.size,
      type: "software"
    }));
    onAddBatchTargets(targets);
  };

  const getPlatformBadgeColor = (platform: string) => {
    switch (platform) {
      case "PS4":
      case "PS3":
        return "bg-blue-600/20 text-blue-400 border-blue-500/30";
      case "Switch":
        return "bg-rose-600/20 text-rose-400 border-rose-500/30";
      case "XBOX":
        return "bg-emerald-600/20 text-emerald-400 border-emerald-500/30";
      case "Android":
        return "bg-teal-600/20 text-teal-400 border-teal-500/30";
      case "macOS":
        return "bg-purple-600/20 text-purple-400 border-purple-500/30";
      case "Windows":
        return "bg-sky-600/20 text-sky-400 border-sky-500/30";
      default:
        return "bg-cyan-600/20 text-cyan-400 border-cyan-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Games & Software Multiple File Downloader */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-zinc-900/70 to-blue-950/40 border border-zinc-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-3">
          <span className="p-2 bg-cyan-600/20 text-cyan-400 rounded-xl">
            <GamepadIcon className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm md:text-base font-bold text-white flex items-center space-x-2">
              <span>Games & Software Download Hub</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-600/30 text-cyan-300 font-bold border border-cyan-500/30">
                Multiple File Downloader
              </span>
            </h2>
            <p className="text-zinc-400 mt-0.5">
              Select multiple PC Games, Console ROMs, Software & APKs to batch download sequentially or export 1-click IDM queue.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end md:self-auto flex-shrink-0">
          <span className="bg-zinc-800 px-3 py-1.5 rounded-xl text-zinc-300 font-mono text-[11px] border border-zinc-700/60">
            ⚡ Gigabit BDIX Direct Links
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All Items", count: items.length },
            { id: "pc-games", label: "PC Games", count: items.filter((i) => i.category_id === "pc-games").length },
            { id: "console-games", label: "Console Games", count: items.filter((i) => i.category_id === "console-games").length },
            { id: "software", label: "Software & Tools", count: items.filter((i) => i.category_id === "software").length },
            { id: "android-games", label: "Android Games", count: items.filter((i) => i.category_id === "android-games").length }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                selectedCategory === cat.id
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                  : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
              }`}
            >
              <span>{cat.label}</span>
              {cat.count > 0 && <span className="opacity-60 text-[11px]">({cat.count})</span>}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <SearchIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Games or Software..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={handleSelectAllVisible}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-800 flex items-center space-x-1.5 text-xs font-semibold transition flex-shrink-0"
            title="Add all currently visible items to batch download"
          >
            <CheckIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select Visible</span>
          </button>
        </div>
      </div>

      {/* Grid of Downloadable Items */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-44 bg-zinc-900/60 rounded-2xl border border-zinc-800/40" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/30 border border-zinc-800/60 rounded-3xl">
          <SearchIcon className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">No items found</h3>
          <p className="text-xs text-zinc-400 mt-1">Try another search keyword or select All Items.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedItems.map((item) => {
              const isSelected = selectedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    isSelected
                      ? "bg-cyan-950/20 border-cyan-500/50 shadow-lg shadow-cyan-950/30"
                      : "bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80"
                  }`}
                >
                  <div>
                    {/* Header: Platform & Category */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getPlatformBadgeColor(
                          item.platform
                        )}`}
                      >
                        {item.platform || "PC"}
                      </span>
                      <span className="text-[11px] text-zinc-500 truncate">{item.category_name}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xs md:text-sm font-bold text-white line-clamp-2 leading-snug" title={item.title}>
                      {item.title}
                    </h3>

                    {/* Metadata: File count & Size */}
                    <div className="flex items-center space-x-2 mt-2 text-[11px] text-zinc-400">
                      {item.size && (
                        <span className="font-mono text-zinc-300 font-semibold">{item.size}</span>
                      )}
                      {item.file_count > 1 ? (
                        <span className="text-cyan-400">● {item.file_count} files (multi-part)</span>
                      ) : (
                        <span>● Single package</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => toggleSelectCard(item)}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 border ${
                        isSelected
                          ? "bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30"
                          : "bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700/60"
                      }`}
                    >
                      <CheckIcon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-zinc-500"}`} />
                      <span>{isSelected ? "Selected" : "Select Batch"}</span>
                    </button>

                    {item.file_count > 1 ? (
                      <button
                        onClick={() => setActiveModalItem(item)}
                        className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition border border-zinc-700/60 flex items-center space-x-1"
                        title="View individual files in this folder"
                      >
                        <FolderTreeIcon className="w-3.5 h-3.5" />
                        <span>Files</span>
                      </button>
                    ) : (
                      <a
                        href={item.download_url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="py-1.5 px-3 bg-cyan-600/80 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1 shadow-md shadow-cyan-600/20"
                        title="Direct download file"
                      >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        <span>Get</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
              <div>
                Showing <strong className="text-white">{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                <strong className="text-white">
                  {Math.min(currentPage * itemsPerPage, filteredItems.length)}
                </strong>{" "}
                of <strong className="text-white">{filteredItems.length}</strong> items
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-xs text-zinc-300 font-semibold rounded-xl border border-zinc-800 transition"
                >
                  Previous
                </button>
                <span className="px-3 py-1 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-300 font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-xs text-zinc-300 font-semibold rounded-xl border border-zinc-800 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail & Multi-part Files Modal */}
      {activeModalItem && (
        <GamesSoftwareModal
          item={activeModalItem}
          onClose={() => setActiveModalItem(null)}
          onAddBatchTargets={onAddBatchTargets}
          selectedIds={selectedIds}
          onToggleTarget={onToggleTarget}
        />
      )}
    </div>
  );
}
