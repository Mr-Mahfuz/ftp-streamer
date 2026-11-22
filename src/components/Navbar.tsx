"use client";

import React, { useState } from "react";
import { CATEGORIES } from "../categories";
import {
  FilmIcon,
  TvIcon,
  SearchIcon,
  FolderTreeIcon,
  DownloadIcon,
  ChevronDownIcon,
  SparklesIcon
} from "./Icons";

interface NavbarProps {
  activeTab: "library" | "tree";
  setActiveTab: (tab: "library" | "tree") => void;
  selectedCategory: string | null;
  onSelectCategory: (catId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCount: number;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  setSearchQuery,
  selectedCount
}: NavbarProps) {
  const [openMoviesMenu, setOpenMoviesMenu] = useState(false);
  const [openSeriesMenu, setOpenSeriesMenu] = useState(false);

  const movieCats = CATEGORIES.filter((c) => c.menu === "movies");
  const seriesCats = CATEGORIES.filter((c) => c.menu === "tv-series");

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Main Tabs */}
          <div className="flex items-center space-x-6">
            <div
              onClick={() => {
                onSelectCategory(null);
                setActiveTab("library");
              }}
              className="flex items-center space-x-2 cursor-pointer select-none group"
            >
              <span className="text-2xl font-black tracking-tight text-white group-hover:text-red-500 transition">
                Dhaka<span className="text-red-600">Flix</span>
              </span>
              <span className="bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                Stream
              </span>
            </div>

            {/* Navigation Menus */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => {
                  onSelectCategory(null);
                  setActiveTab("library");
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === "library" && selectedCategory === null
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                All Media
              </button>

              {/* Movies Dropdown (Screenshot 2) */}
              <div
                className="relative"
                onMouseEnter={() => setOpenMoviesMenu(true)}
                onMouseLeave={() => setOpenMoviesMenu(false)}
              >
                <button
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1 transition ${
                    selectedCategory && movieCats.some((c) => c.id === selectedCategory)
                      ? "bg-zinc-800 text-red-400"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  <FilmIcon className="w-3.5 h-3.5 text-red-500" />
                  <span>Movies</span>
                  <ChevronDownIcon className="w-3.5 h-3.5" />
                </button>

                {openMoviesMenu && (
                  <div className="absolute top-full left-0 w-60 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                      Movie Categories
                    </div>
                    {movieCats.map((cat) => (
                      <div
                        key={cat.id}
                        onClick={() => {
                          onSelectCategory(cat.id);
                          setActiveTab("library");
                          setOpenMoviesMenu(false);
                        }}
                        className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition ${
                          selectedCategory === cat.id
                            ? "bg-red-600/20 text-red-400 font-semibold"
                            : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        }`}
                      >
                        <span>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TV Series Dropdown (Screenshot 3) */}
              <div
                className="relative"
                onMouseEnter={() => setOpenSeriesMenu(true)}
                onMouseLeave={() => setOpenSeriesMenu(false)}
              >
                <button
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1 transition ${
                    selectedCategory && seriesCats.some((c) => c.id === selectedCategory)
                      ? "bg-zinc-800 text-purple-400"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  <TvIcon className="w-3.5 h-3.5 text-purple-500" />
                  <span>TV Series</span>
                  <ChevronDownIcon className="w-3.5 h-3.5" />
                </button>

                {openSeriesMenu && (
                  <div className="absolute top-full left-0 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                      Series Categories
                    </div>
                    {seriesCats.map((cat) => (
                      <div
                        key={cat.id}
                        onClick={() => {
                          onSelectCategory(cat.id);
                          setActiveTab("library");
                          setOpenSeriesMenu(false);
                        }}
                        className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition ${
                          selectedCategory === cat.id
                            ? "bg-purple-600/20 text-purple-400 font-semibold"
                            : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        }`}
                      >
                        <span>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tree Explorer View Tab */}
              <button
                onClick={() => setActiveTab("tree")}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeTab === "tree"
                    ? "bg-red-600 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <FolderTreeIcon className="w-3.5 h-3.5" />
                <span>Tree Explorer</span>
              </button>
            </nav>
          </div>

          {/* Search Bar & Network Status */}
          <div className="flex items-center space-x-3 flex-1 max-w-md justify-end">
            <div className="relative w-full max-w-xs">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search movies, series, years, 1080p..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
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

            {/* ISP BDIX Status Badge */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono">ISP BDIX Live</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
