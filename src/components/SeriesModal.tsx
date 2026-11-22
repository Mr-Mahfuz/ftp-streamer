"use client";

import React, { useState } from "react";
import { MediaItem, Season, Episode } from "../types";
import {
  CloseIcon,
  PlayIcon,
  DownloadIcon,
  CheckIcon,
  ExternalLinkIcon,
  TvIcon,
  CopyIcon
} from "./Icons";
import { DownloadTarget } from "./DownloadManager";

interface SeriesModalProps {
  series: MediaItem;
  onClose: () => void;
  onPlayEpisode: (series: MediaItem, episode: Episode, season: Season) => void;
  onAddBatchDownloads: (targets: DownloadTarget[]) => void;
  selectedIds: Set<string>;
  onToggleTarget: (target: DownloadTarget) => void;
}

export default function SeriesModal({
  series,
  onClose,
  onPlayEpisode,
  onAddBatchDownloads,
  selectedIds,
  onToggleTarget
}: SeriesModalProps) {
  const [activeSeasonIdx, setActiveSeasonIdx] = useState(0);
  const seasons = series.seasons || [];
  const currentSeason = seasons[activeSeasonIdx] || seasons[0];

  const handleSelectEntireSeason = (season: Season) => {
    const targets: DownloadTarget[] = season.episodes.map((ep) => ({
      id: `${series.id}_${season.season}_${ep.name}`,
      title: series.title,
      name: `${season.season_name} - ${ep.name}`,
      url: ep.url,
      size: ep.size,
      type: "episode"
    }));
    onAddBatchDownloads(targets);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header with Poster & Metadata */}
        <div className="relative p-6 bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 flex flex-col sm:flex-row gap-6 items-start">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          >
            <CloseIcon className="w-5 h-5" />
          </button>

          {/* Series Thumbnail */}
          <div className="w-28 sm:w-36 aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 flex-shrink-0 border border-zinc-800 shadow-xl">
            {series.poster ? (
              <img
                src={series.poster}
                alt={series.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <TvIcon className="w-12 h-12" />
              </div>
            )}
          </div>

          {/* Series Info */}
          <div className="flex-1 pr-8">
            <div className="flex items-center space-x-2 text-xs font-semibold mb-2">
              <span className="bg-purple-600/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded uppercase">
                {series.category_name}
              </span>
              <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                {series.year}
              </span>
              <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
                {series.quality}
              </span>
              {series.audio && (
                <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                  {series.audio}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {series.title}
            </h2>

            <p className="text-zinc-400 text-xs mt-2">
              {seasons.length} Season(s) ● {series.total_episodes || 0} Total Episodes indexed.
            </p>

            {/* Quick Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {currentSeason?.episodes?.[0] && (
                <button
                  onClick={() => onPlayEpisode(series, currentSeason.episodes[0], currentSeason)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-red-600/30"
                >
                  <PlayIcon className="w-4 h-4 ml-0.5" />
                  <span>Start Season 1 (Ep 1)</span>
                </button>
              )}

              {currentSeason && (
                <button
                  onClick={() => handleSelectEntireSeason(currentSeason)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition border border-zinc-700"
                >
                  <DownloadIcon className="w-4 h-4 text-emerald-400" />
                  <span>Batch Download {currentSeason.season_name} ({currentSeason.episodes.length} eps)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Season Selector Tabs */}
        {seasons.length > 1 && (
          <div className="flex items-center space-x-2 p-4 bg-zinc-950 border-b border-zinc-800/80 overflow-x-auto">
            {seasons.map((season, idx) => (
              <button
                key={season.season}
                onClick={() => setActiveSeasonIdx(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                  activeSeasonIdx === idx
                    ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                    : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {season.season_name} ({season.episodes.length} eps)
              </button>
            ))}
          </div>
        )}

        {/* Episodes List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {currentSeason?.episodes.map((ep, idx) => {
            const epTargetId = `${series.id}_${currentSeason.season}_${ep.name}`;
            const isSelected = selectedIds.has(epTargetId);

            return (
              <div
                key={ep.name}
                className="group p-3.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/70 hover:border-zinc-700 rounded-2xl flex items-center justify-between transition gap-3"
              >
                {/* Episode Info */}
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {/* Select Checkbox */}
                  <button
                    onClick={() =>
                      onToggleTarget({
                        id: epTargetId,
                        title: series.title,
                        name: `${currentSeason.season_name} - ${ep.name}`,
                        url: ep.url,
                        size: ep.size,
                        type: "episode"
                      })
                    }
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition flex-shrink-0 ${
                      isSelected
                        ? "bg-red-600 border-red-500 text-white"
                        : "border-zinc-700 hover:border-zinc-500 text-transparent"
                    }`}
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-6 text-center text-xs font-mono font-bold text-zinc-500 flex-shrink-0">
                    {idx + 1}
                  </span>

                  <div className="min-w-0 pr-2">
                    <h4
                      onClick={() => onPlayEpisode(series, ep, currentSeason)}
                      className="text-xs sm:text-sm font-semibold text-white truncate cursor-pointer hover:text-red-400 transition"
                      title={ep.name}
                    >
                      {ep.name}
                    </h4>
                    <div className="flex items-center space-x-2 text-[10px] text-zinc-500 mt-0.5">
                      {ep.size && <span>{ep.size}</span>}
                      {ep.date && <span>● {ep.date}</span>}
                    </div>
                  </div>
                </div>

                {/* Episode Actions */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => onPlayEpisode(series, ep, currentSeason)}
                    className="px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white font-medium rounded-lg text-xs flex items-center space-x-1 transition"
                  >
                    <PlayIcon className="w-3.5 h-3.5 ml-0.5" />
                    <span>Stream</span>
                  </button>

                  <a
                    href={`vlc://${ep.url}`}
                    className="hidden sm:flex p-1.5 text-zinc-400 hover:text-orange-400 rounded-lg hover:bg-zinc-800 transition"
                    title="Open episode in VLC"
                  >
                    <ExternalLinkIcon className="w-4 h-4" />
                  </a>

                  <a
                    href={ep.url}
                    download
                    className="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-zinc-800 transition"
                    title="Download episode"
                  >
                    <DownloadIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
