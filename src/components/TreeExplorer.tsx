"use client";

import React, { useState, useMemo } from "react";
import { MediaItem } from "../types";
import { CATEGORIES } from "../categories";
import {
  FolderTreeIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlayIcon,
  DownloadIcon,
  FilmIcon,
  TvIcon,
  SearchIcon,
  CheckIcon
} from "./Icons";

interface TreeExplorerProps {
  catalog: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onToggleSelect: (item: MediaItem) => void;
  selectedIds: Set<string>;
}

export default function TreeExplorer({
  catalog,
  onPlay,
  onToggleSelect,
  selectedIds
}: TreeExplorerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["menu-movies", "menu-tv-series", "cat-eng-movies"])
  );

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Build hierarchical grouping from catalog
  const treeData = useMemo(() => {
    // Top-level menus: Movies, TV Series
    const moviesMenu = {
      id: "menu-movies",
      name: "Movies Collection (DhakaFlix)",
      categories: CATEGORIES.filter((c) => c.menu === "movies")
    };
    const seriesMenu = {
      id: "menu-tv-series",
      name: "TV & Web Series Collection",
      categories: CATEGORIES.filter((c) => c.menu === "tv-series")
    };

    return [moviesMenu, seriesMenu];
  }, []);

  // Filter catalog based on search
  const filteredCatalog = useMemo(() => {
    if (!searchTerm.trim()) return catalog;
    const q = searchTerm.toLowerCase();
    return catalog.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.category_name.toLowerCase().includes(q) ||
        m.year.includes(q)
    );
  }, [catalog, searchTerm]);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 shadow-xl">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h3 className="font-bold text-white text-lg flex items-center space-x-2">
            <FolderTreeIcon className="w-5 h-5 text-red-500" />
            <span>Interactive Tree Explorer</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Browse the full hierarchy of ISP media folders, seasons, and episodes
          </p>
        </div>

        {/* Tree Search Box */}
        <div className="relative w-full md:w-72">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tree nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
          />
        </div>
      </div>

      {/* Tree View */}
      <div className="mt-4 space-y-3 font-sans text-sm">
        {treeData.map((menu) => {
          const isMenuOpen = expandedNodes.has(menu.id) || searchTerm.length > 0;
          return (
            <div key={menu.id} className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/40">
              {/* Menu Node */}
              <div
                onClick={() => toggleExpand(menu.id)}
                className="p-3 bg-zinc-900/60 hover:bg-zinc-800/60 flex items-center justify-between cursor-pointer transition select-none"
              >
                <div className="flex items-center space-x-2.5">
                  {isMenuOpen ? (
                    <ChevronDownIcon className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-zinc-400" />
                  )}
                  {menu.id === "menu-movies" ? (
                    <FilmIcon className="w-4 h-4 text-red-500" />
                  ) : (
                    <TvIcon className="w-4 h-4 text-purple-500" />
                  )}
                  <span className="font-bold text-white text-sm">{menu.name}</span>
                </div>
                <span className="text-xs text-zinc-500 font-mono">
                  {menu.categories.length} categories
                </span>
              </div>

              {/* Categories list */}
              {isMenuOpen && (
                <div className="p-2 space-y-2 pl-4 border-t border-zinc-800/60">
                  {menu.categories.map((cat) => {
                    const catNodeId = `cat-${cat.id}`;
                    const isCatOpen = expandedNodes.has(catNodeId) || searchTerm.length > 0;
                    const itemsInCat = filteredCatalog.filter((m) => m.category_id === cat.id);

                    if (searchTerm && itemsInCat.length === 0) return null;

                    return (
                      <div key={cat.id} className="border-l-2 border-zinc-800 pl-3 py-1">
                        {/* Category Header */}
                        <div
                          onClick={() => toggleExpand(catNodeId)}
                          className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer transition select-none"
                        >
                          <div className="flex items-center space-x-2">
                            {isCatOpen ? (
                              <ChevronDownIcon className="w-3.5 h-3.5 text-zinc-500" />
                            ) : (
                              <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-500" />
                            )}
                            <span className="font-semibold text-zinc-200 text-xs">{cat.name}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">
                            {itemsInCat.length} indexed
                          </span>
                        </div>

                        {/* Items under Category */}
                        {isCatOpen && (
                          <div className="mt-2 pl-4 space-y-1.5 max-h-96 overflow-y-auto">
                            {itemsInCat.slice(0, 30).map((media) => {
                              const isSelected = selectedIds.has(media.id);
                              return (
                                <div
                                  key={media.id}
                                  className="group flex items-center justify-between p-2 rounded-lg bg-zinc-900/30 hover:bg-zinc-800/50 border border-transparent hover:border-zinc-700/60 transition"
                                >
                                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                                    <button
                                      type="button"
                                      onClick={() => onToggleSelect(media)}
                                      className={`w-4 h-4 rounded border flex items-center justify-center transition flex-shrink-0 ${
                                        isSelected
                                          ? "bg-red-600 border-red-500 text-white"
                                          : "border-zinc-700 text-transparent hover:border-zinc-500"
                                      }`}
                                    >
                                      <CheckIcon className="w-3 h-3" />
                                    </button>
                                    <span
                                      onClick={() => onPlay(media)}
                                      className="text-xs text-zinc-300 group-hover:text-white cursor-pointer truncate font-medium"
                                      title={media.title}
                                    >
                                      {media.title}
                                    </span>
                                    {media.year && (
                                      <span className="text-[10px] text-zinc-500">({media.year})</span>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    <span className="text-[10px] font-mono text-zinc-500">
                                      {media.quality}
                                    </span>
                                    <button
                                      onClick={() => onPlay(media)}
                                      className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                                      title="Stream video"
                                    >
                                      <PlayIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <a
                                      href={media.stream_url || media.folder_url}
                                      download
                                      className="p-1 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded transition"
                                      title="Download video"
                                    >
                                      <DownloadIcon className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                            {itemsInCat.length > 30 && (
                              <p className="text-[11px] text-zinc-500 text-center py-1">
                                + {itemsInCat.length - 30} more items in this category
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
