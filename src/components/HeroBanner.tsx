"use client";

import React, { useState, useEffect } from "react";
import { MediaItem } from "../types";
import { PlayIcon, DownloadIcon, CheckIcon, FilmIcon, TvIcon, SparklesIcon } from "./Icons";

interface HeroBannerProps {
  featuredItems: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onToggleSelect: (item: MediaItem) => void;
  isSelected: (id: string) => boolean;
}

export default function HeroBanner({
  featuredItems,
  onPlay,
  onToggleSelect,
  isSelected
}: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (featuredItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [featuredItems.length]);

  if (!featuredItems || featuredItems.length === 0) return null;
  const current = featuredItems[currentIndex] || featuredItems[0];
  const selected = isSelected(current.id);

  return (
    <div className="relative w-full h-[380px] md:h-[480px] rounded-3xl overflow-hidden mb-8 border border-zinc-800/80 shadow-2xl bg-zinc-950">
      {/* Background Poster / Backdrop */}
      {current.poster && (
        <img
          src={current.poster}
          alt={current.title}
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-50 contrast-125 transform scale-105 transition-all duration-1000"
        />
      )}

      {/* Cinematic Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent w-full md:w-3/4" />

      {/* Content */}
      <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end max-w-2xl">
        <div className="flex items-center space-x-2 text-xs font-semibold mb-3">
          <span className="flex items-center space-x-1 bg-red-600 text-white px-2.5 py-1 rounded-full uppercase tracking-wider text-[10px]">
            <SparklesIcon className="w-3 h-3" />
            <span>Featured BDIX Premiere</span>
          </span>
          <span className="bg-zinc-800/90 text-zinc-300 px-2 py-0.5 rounded text-[11px]">
            {current.category_name}
          </span>
          {current.year && (
            <span className="bg-zinc-800/90 text-zinc-300 px-2 py-0.5 rounded text-[11px]">
              {current.year}
            </span>
          )}
          <span className="text-red-400 font-mono text-[11px] font-bold">
            {current.quality}
          </span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md leading-tight line-clamp-2">
          {current.title}
        </h1>

        <p className="text-zinc-300 text-xs md:text-sm mt-3 line-clamp-2 max-w-xl leading-relaxed">
          Stream directly from local ISP FTP without downloading. Instant byte-range seeking, subtitle options, and fast buffering.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-6">
          <button
            onClick={() => onPlay(current)}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-xl shadow-red-600/40 transform active:scale-95"
          >
            <PlayIcon className="w-5 h-5 ml-0.5" />
            <span>{current.type === "series" ? "Browse Series & Stream" : "Stream Now"}</span>
          </button>

          <button
            onClick={() => onToggleSelect(current)}
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-semibold transition border ${
              selected
                ? "bg-emerald-600/20 border-emerald-500 text-emerald-400"
                : "bg-zinc-900/80 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <CheckIcon className="w-4 h-4" />
            <span>{selected ? "Selected for Download" : "Add to Download Cart"}</span>
          </button>

          <a
            href={current.stream_url || current.folder_url}
            download
            className="p-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 hover:text-white transition"
            title="Download Directly"
          >
            <DownloadIcon className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Carousel dots */}
      {featuredItems.length > 1 && (
        <div className="absolute bottom-6 right-6 flex items-center space-x-2">
          {featuredItems.slice(0, 5).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === idx ? "w-6 bg-red-600" : "w-1.5 bg-zinc-600 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
