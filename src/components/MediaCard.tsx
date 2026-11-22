"use client";

import React, { useState } from "react";
import { MediaItem } from "../types";
import {
  PlayIcon,
  DownloadIcon,
  CheckIcon,
  ExternalLinkIcon,
  CopyIcon,
  FilmIcon,
  TvIcon
} from "./Icons";

interface MediaCardProps {
  item: MediaItem;
  isSelected: boolean;
  onToggleSelect: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
}

export default function MediaCard({
  item,
  isSelected,
  onToggleSelect,
  onPlay
}: MediaCardProps) {
  const [imgError, setImgError] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const isSeries = item.type === "series";
  const defaultDownloadUrl = isSeries
    ? item.seasons?.[0]?.episodes?.[0]?.url || item.folder_url
    : item.stream_url || "";

  return (
    <div className="group relative bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col shadow-lg hover:shadow-2xl hover:-translate-y-1">
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full bg-zinc-950 overflow-hidden cursor-pointer" onClick={() => onPlay(item)}>
        {!imgError && item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-600">
            {isSeries ? <TvIcon className="w-12 h-12 mb-2" /> : <FilmIcon className="w-12 h-12 mb-2" />}
            <span className="text-center font-bold text-xs text-zinc-400 line-clamp-3">
              {item.title}
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Hover Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl shadow-red-600/50 transform group-hover:scale-110 transition-transform">
            <PlayIcon className="w-6 h-6 ml-0.5" />
          </div>
        </div>

        {/* Top Badges: Category & Multi-Select Checkbox */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-auto">
          {/* Multi-Select Checkbox for Batch Download */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item);
            }}
            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition shadow-md ${
              isSelected
                ? "bg-red-600 border-red-500 text-white"
                : "bg-black/60 border-white/30 text-transparent hover:border-white/60"
            }`}
            title={isSelected ? "Deselect from download batch" : "Select for batch download"}
          >
            <CheckIcon className="w-4 h-4" />
          </button>

          {/* Quality Badge */}
          <span className="bg-black/70 backdrop-blur-md text-red-400 border border-red-500/30 font-bold text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider">
            {item.quality || "HD"}
          </span>
        </div>

        {/* Bottom Poster Info (Year, Audio, Series episodes) */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-zinc-300 pointer-events-none">
          <div className="flex items-center space-x-1.5">
            {item.year && <span className="bg-zinc-900/80 px-1.5 py-0.5 rounded text-zinc-300 font-medium">{item.year}</span>}
            {item.audio && <span className="bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-400">{item.audio}</span>}
          </div>
          {isSeries && item.total_episodes ? (
            <span className="bg-red-950/80 border border-red-800/50 text-red-300 px-1.5 py-0.5 rounded font-medium">
              {item.total_episodes} eps
            </span>
          ) : (
            item.size && <span className="text-[10px] text-zinc-400 font-mono">{item.size}</span>
          )}
        </div>
      </div>

      {/* Card Info Section */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <h4
            onClick={() => onPlay(item)}
            className="font-bold text-white text-sm line-clamp-1 hover:text-red-400 cursor-pointer transition"
            title={item.title}
          >
            {item.title}
          </h4>
          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{item.category_name}</p>
        </div>

        {/* Card Action Footer */}
        <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs">
          <button
            onClick={() => onPlay(item)}
            className="text-zinc-300 hover:text-white flex items-center space-x-1 font-medium transition"
          >
            <PlayIcon className="w-3.5 h-3.5 text-red-500" />
            <span>{isSeries ? "Browse & Stream" : "Stream"}</span>
          </button>

          <div className="flex items-center space-x-1">
            {/* Quick VLC button */}
            <a
              href={`vlc://${defaultDownloadUrl}`}
              className="p-1.5 text-zinc-400 hover:text-orange-400 rounded-lg hover:bg-zinc-800 transition"
              title="Open stream in VLC"
            >
              <ExternalLinkIcon className="w-3.5 h-3.5" />
            </a>

            {/* Direct Download button */}
            <a
              href={defaultDownloadUrl}
              download
              className="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-zinc-800 transition"
              title="Download file directly"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
