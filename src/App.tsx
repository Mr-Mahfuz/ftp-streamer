"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MediaItem, Episode, Season } from "./types";
import { CATEGORIES } from "./categories";
import Navbar from "./components/Navbar";
import HeroBanner from "./components/HeroBanner";
import MediaCard from "./components/MediaCard";
import TreeExplorer from "./components/TreeExplorer";
import VideoPlayer from "./components/VideoPlayer";
import SeriesModal from "./components/SeriesModal";
import DownloadManager, { DownloadTarget } from "./components/DownloadManager";
import {
  FilmIcon,
  TvIcon,
  SearchIcon,
  FolderTreeIcon,
  DownloadIcon,
  SparklesIcon,
  CheckIcon,
  ExternalLinkIcon
} from "./components/Icons";

export default function Home() {
  const [catalog, setCatalog] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<"all" | "movies" | "tv-series">("all");
  const [activeTab, setActiveTab] = useState<"library" | "tree">("library");

  // Selected items for Batch Download
  const [selectedDownloadTargets, setSelectedDownloadTargets] = useState<DownloadTarget[]>([]);

  // Video Player state
  const [activePlayingItem, setActivePlayingItem] = useState<MediaItem | null>(null);
  const [activePlayingEpisode, setActivePlayingEpisode] = useState<Episode | undefined>();
  const [activePlayingSeason, setActivePlayingSeason] = useState<Season | undefined>();

  // Series Details Modal state
  const [activeSeriesModal, setActiveSeriesModal] = useState<MediaItem | null>(null);

  // Load Catalog from static JSON
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const res = await fetch("/data/catalog.json");
        if (res.ok) {
          const data: MediaItem[] = await res.json();
          setCatalog(data);
        } else {
          console.warn("Failed to load catalog.json");
        }
      } catch (err) {
        console.error("Error loading catalog:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  // Filter Catalog
  const filteredItems = useMemo(() => {
    return catalog.filter((item) => {
      // Menu filter
      if (selectedMenu !== "all" && item.menu !== selectedMenu) {
        return false;
      }
      // Category filter
      if (selectedCategory && item.category_id !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const catMatch = item.category_name.toLowerCase().includes(q);
        const yearMatch = item.year.toLowerCase().includes(q);
        const qualMatch = item.quality.toLowerCase().includes(q);
        const audioMatch = item.audio ? item.audio.toLowerCase().includes(q) : false;
        if (!titleMatch && !catMatch && !yearMatch && !qualMatch && !audioMatch) {
          return false;
        }
      }
      return true;
    });
  }, [catalog, selectedMenu, selectedCategory, searchQuery]);

  // Featured items for Hero Banner (Latest releases with high quality)
  const featuredItems = useMemo(() => {
    return catalog.filter((m) => m.year.includes("2026") || m.year.includes("2025")).slice(0, 6);
  }, [catalog]);

  // Target ID helper for selection
  const selectedIdsSet = useMemo(() => {
    return new Set(selectedDownloadTargets.map((t) => t.id));
  }, [selectedDownloadTargets]);

  const toggleSelectMediaCard = (item: MediaItem) => {
    if (item.type === "movie") {
      const target: DownloadTarget = {
        id: item.id,
        title: item.title,
        name: item.filename || `${item.title}.mkv`,
        url: item.stream_url || item.folder_url,
        size: item.size,
        type: "movie"
      };
      toggleDownloadTarget(target);
    } else {
      // Open series modal so user can pick episodes or full season
      setActiveSeriesModal(item);
    }
  };

  const toggleDownloadTarget = (target: DownloadTarget) => {
    setSelectedDownloadTargets((prev) => {
      if (prev.some((t) => t.id === target.id)) {
        return prev.filter((t) => t.id !== target.id);
      } else {
        return [...prev, target];
      }
    });
  };

  const addBatchTargets = (targets: DownloadTarget[]) => {
    setSelectedDownloadTargets((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]));
      targets.forEach((t) => map.set(t.id, t));
      return Array.from(map.values());
    });
  };

  const removeDownloadTarget = (id: string) => {
    setSelectedDownloadTargets((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAllDownloads = () => {
    setSelectedDownloadTargets([]);
  };

  const handlePlay = (item: MediaItem) => {
    if (item.type === "movie") {
      setActivePlayingItem(item);
      setActivePlayingEpisode(undefined);
      setActivePlayingSeason(undefined);
    } else {
      setActiveSeriesModal(item);
    }
  };

  const handlePlayEpisode = (series: MediaItem, episode: Episode, season: Season) => {
    setActiveSeriesModal(null);
    setActivePlayingItem(series);
    setActivePlayingEpisode(episode);
    setActivePlayingSeason(season);
  };

  // Select all visible filtered movies for download
  const handleSelectAllVisible = () => {
    const newTargets: DownloadTarget[] = [];
    filteredItems.forEach((m) => {
      if (m.type === "movie" && m.stream_url) {
        newTargets.push({
          id: m.id,
          title: m.title,
          name: m.filename || `${m.title}.mkv`,
          url: m.stream_url,
          size: m.size,
          type: "movie"
        });
      }
    });
    addBatchTargets(newTargets);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          if (catId) {
            const cat = CATEGORIES.find((c) => c.id === catId);
            if (cat) setSelectedMenu(cat.menu);
          }
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCount={selectedDownloadTargets.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Info Banner: Streaming & Vercel Info */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900/60 to-purple-950/40 border border-zinc-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-zinc-300">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 bg-red-600/20 text-red-400 rounded-lg">
              <SparklesIcon className="w-4 h-4" />
            </span>
            <div>
              <span className="font-bold text-white">Direct BDIX Streaming Activated: </span>
              <span>
                Enjoy smooth byte-range seeking, Arrow key controls (Up/Down volume, Left/Right 5s skip), subtitles, and batch downloading without local file downloads.
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="bg-zinc-800 px-2 py-1 rounded text-[11px] text-zinc-400 font-mono">
              Shortcuts: [←/→] 5s | [↑/↓] Vol | [C] Subs | [F] Fullscreen
            </span>
          </div>
        </div>

        {/* View Switcher: Library vs Tree Explorer */}
        {activeTab === "tree" ? (
          <TreeExplorer
            catalog={catalog}
            onPlay={handlePlay}
            onToggleSelect={toggleSelectMediaCard}
            selectedIds={selectedIdsSet}
          />
        ) : (
          <>
            {/* Hero Banner with Featured Movie/Series (when not actively searching) */}
            {!searchQuery && !selectedCategory && featuredItems.length > 0 && (
              <HeroBanner
                featuredItems={featuredItems}
                onPlay={handlePlay}
                onToggleSelect={toggleSelectMediaCard}
                isSelected={(id) => selectedIdsSet.has(id)}
              />
            )}

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              {/* Menu & Category Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedMenu("all");
                    setSelectedCategory(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    selectedMenu === "all" && selectedCategory === null
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                      : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
                  }`}
                >
                  All ({catalog.length})
                </button>

                <button
                  onClick={() => {
                    setSelectedMenu("movies");
                    setSelectedCategory(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                    selectedMenu === "movies" && selectedCategory === null
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                      : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
                  }`}
                >
                  <FilmIcon className="w-3.5 h-3.5" />
                  <span>Movies ({catalog.filter((m) => m.menu === "movies").length})</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedMenu("tv-series");
                    setSelectedCategory(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                    selectedMenu === "tv-series" && selectedCategory === null
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                      : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
                  }`}
                >
                  <TvIcon className="w-3.5 h-3.5" />
                  <span>TV Series ({catalog.filter((m) => m.menu === "tv-series").length})</span>
                </button>

                {/* Active Category Tag if any */}
                {selectedCategory && (
                  <div className="flex items-center space-x-1 px-3 py-1.5 bg-red-950/80 border border-red-700/60 text-red-300 rounded-xl text-xs font-semibold">
                    <span>
                      {CATEGORIES.find((c) => c.id === selectedCategory)?.name || selectedCategory}
                    </span>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="ml-1 text-red-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons: Batch Select Visible, Count */}
              <div className="flex items-center space-x-3 text-xs text-zinc-400">
                <span>
                  Showing <strong className="text-white">{filteredItems.length}</strong> items
                </span>

                <button
                  onClick={handleSelectAllVisible}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-800 flex items-center space-x-1.5 transition"
                  title="Select all currently visible movies for batch download"
                >
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Select Visible Movies</span>
                </button>
              </div>
            </div>

            {/* Media Card Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-pulse">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-2xl" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center bg-zinc-900/30 border border-zinc-800/60 rounded-3xl">
                <SearchIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">No media found</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Try adjusting your search query or selecting another category.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory(null);
                    setSelectedMenu("all");
                  }}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                {filteredItems.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    isSelected={selectedIdsSet.has(item.id)}
                    onToggleSelect={toggleSelectMediaCard}
                    onPlay={handlePlay}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Batch Download Manager Drawer & Bar */}
      <DownloadManager
        selectedItems={selectedDownloadTargets}
        onRemoveItem={removeDownloadTarget}
        onClearAll={clearAllDownloads}
      />

      {/* Fullscreen Video Player Modal */}
      {activePlayingItem && (
        <VideoPlayer
          item={activePlayingItem}
          initialEpisode={activePlayingEpisode}
          initialSeason={activePlayingSeason}
          onClose={() => {
            setActivePlayingItem(null);
            setActivePlayingEpisode(undefined);
            setActivePlayingSeason(undefined);
          }}
          onNextEpisode={(nextEp, season) => {
            setActivePlayingEpisode(nextEp);
            setActivePlayingSeason(season);
          }}
        />
      )}

      {/* Series Episodes Modal */}
      {activeSeriesModal && (
        <SeriesModal
          series={activeSeriesModal}
          onClose={() => setActiveSeriesModal(null)}
          onPlayEpisode={handlePlayEpisode}
          onAddBatchDownloads={addBatchTargets}
          selectedIds={selectedIdsSet}
          onToggleTarget={toggleDownloadTarget}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-900 py-6 px-4 text-center text-xs text-zinc-500">
        <p>
          DhakaFlix Stream Web App ● Built for high-speed BDIX streaming, instant seeking & batch downloading.
        </p>
      </footer>
    </div>
  );
}
