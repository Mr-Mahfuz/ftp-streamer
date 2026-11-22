"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import SubtitleFinderModal, { ParsedCue } from "./SubtitleFinderModal";
import { SearchIcon, SparklesIcon } from "./Icons";
import { MediaItem, Episode, Season } from "../types";
import { launchExternalStream } from "../utils/playerUtils";
import {
  PlayIcon,
  PauseIcon,
  VolumeIcon,
  VolumeMuteIcon,
  SkipBack5Icon,
  SkipForward5Icon,
  FullscreenIcon,
  ExitFullscreenIcon,
  SubtitlesIcon,
  DownloadIcon,
  CloseIcon,
  CopyIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from "./Icons";

interface VideoPlayerProps {
  item: MediaItem;
  initialEpisode?: Episode;
  initialSeason?: Season;
  onClose: () => void;
  onNextEpisode?: (nextEp: Episode, season: Season) => void;
}

export default function VideoPlayer({
  item,
  initialEpisode,
  initialSeason,
  onClose,
  onNextEpisode
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<any>(null);

  // Active episode / video state
  const isSeries = item.type === "series";
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(
    initialEpisode || (item.seasons?.[0]?.episodes?.[0] ?? null)
  );
  const [activeSeason, setActiveSeason] = useState<Season | null>(
    initialSeason || (item.seasons?.[0] ?? null)
  );

  const streamUrl = isSeries ? activeEpisode?.url || "" : item.stream_url || "";
  const title = isSeries
    ? `${item.title} - ${activeSeason?.season_name || "Season"} - ${activeEpisode?.name || ""}`
    : item.title;

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  // HUD feedback for keyboard actions
  const [hudMessage, setHudMessage] = useState<string | null>(null);
  const hudTimeoutRef = useRef<any>(null);

  // Subtitles
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [showOnlineSubtitleModal, setShowOnlineSubtitleModal] = useState(false);
  const [subtitleTracks, setSubtitleTracks] = useState<{ label: string; src: string }[]>([]);
  const [selectedSubTrack, setSelectedSubTrack] = useState<string>("");
  const [subtitleSize, setSubtitleSize] = useState<"sm" | "md" | "lg" | "xl">("md");
  const [subDelay, setSubDelay] = useState(0); // seconds offset
  const [subCues, setSubCues] = useState<{ start: number; end: number; text: string }[]>([]);
  const [activeCueText, setActiveCueText] = useState<string>("");

  // Series Drawer
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const triggerHud = (msg: string) => {
    setHudMessage(msg);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setHudMessage(null), 1200);
  };

  // Setup initial subtitles (checks localStorage first, then media folder)
  useEffect(() => {
    const subKey = `dhakaflix_saved_sub_${item.id}_${activeEpisode?.name || "main"}`;
    try {
      const saved = localStorage.getItem(subKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cues && parsed.cues.length > 0) {
          setSubCues(parsed.cues);
          setShowSubtitles(true);
          triggerHud(`Loaded saved subtitle: ${parsed.label || "Online Sub"}`);
          return;
        }
      }
    } catch (e) {
      console.warn("Error reading subtitle from localStorage:", e);
    }

    const subs: { label: string; src: string }[] = [];
    if (item.subtitles && item.subtitles.length > 0) {
      item.subtitles.forEach((s, idx) => {
        subs.push({ label: `Auto Subtitle ${idx + 1}`, src: s });
      });
    }
    setSubtitleTracks(subs);
    if (subs.length > 0) {
      setSelectedSubTrack(subs[0].src);
      setShowSubtitles(true);
      loadExternalSubtitle(subs[0].src);
    }
  }, [item, activeEpisode]);

  // SRT / VTT Parser
  const parseSRT = (text: string) => {
    const srtRegex = /(\d+)\r?\n(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})\r?\n([\s\S]*?)(?=\r?\n\r?\n|\$)/g;
    const timeToSeconds = (timeStr: string) => {
      const [h, m, rest] = timeStr.replace(",", ".").split(":");
      return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(rest);
    };

    const cues = [];
    let match;
    while ((match = srtRegex.exec(text)) !== null) {
      const start = timeToSeconds(match[2]);
      const end = timeToSeconds(match[3]);
      const content = match[4].replace(/<[^>]*>/g, "").trim();
      cues.push({ start, end, text: content });
    }
    return cues;
  };

  const loadExternalSubtitle = async (url: string) => {
    try {
      const res = await fetch(url);
      const text = await res.text();
      const parsed = parseSRT(text);
      if (parsed.length > 0) {
        setSubCues(parsed);
      }
    } catch (err) {
      console.warn("Could not load subtitle URL:", err);
    }
  };

  const handleCustomSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseSRT(content);
      if (parsed.length > 0) {
        setSubCues(parsed);
        setShowSubtitles(true);
        triggerHud(`Subtitle loaded: ${file.name}`);
      } else {
        triggerHud("Could not parse subtitle format");
      }
    };
    reader.readAsText(file);
  };

  // Subtitle synchronization during playback
  useEffect(() => {
    if (!showSubtitles || subCues.length === 0) {
      setActiveCueText("");
      return;
    }
    const currentAdjustedTime = currentTime + subDelay;
    const currentCue = subCues.find(
      (cue) => currentAdjustedTime >= cue.start && currentAdjustedTime <= cue.end
    );
    setActiveCueText(currentCue ? currentCue.text : "");
  }, [currentTime, showSubtitles, subCues, subDelay]);

  // Save playback time to localStorage
  useEffect(() => {
    const key = `playback_${item.id}_${activeEpisode?.name || "main"}`;
    const saved = localStorage.getItem(key);
    if (saved && videoRef.current) {
      const parsedTime = parseFloat(saved);
      if (parsedTime > 10) {
        videoRef.current.currentTime = parsedTime;
        triggerHud(`Resumed at ${formatTime(parsedTime)}`);
      }
    }
  }, [streamUrl]);

  const savePlaybackTime = (time: number) => {
    const key = `playback_${item.id}_${activeEpisode?.name || "main"}`;
    if (time > 5) {
      localStorage.setItem(key, time.toString());
    }
  };

  // Video Event Handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Update buffer progress
    const buffered = videoRef.current.buffered;
    if (buffered.length > 0) {
      for (let i = buffered.length - 1; i >= 0; i--) {
        if (buffered.start(i) <= cur && cur <= buffered.end(i)) {
          setBufferedTime(buffered.end(i));
          break;
        }
      }
    }
    savePlaybackTime(cur);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    videoRef.current.volume = volume;
    videoRef.current.muted = isMuted;
    videoRef.current.playbackRate = playbackRate;
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      if (videoRef.current.muted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
      videoRef.current.volume = volume;
      videoRef.current.play();
      setIsPlaying(true);
      triggerHud("Play");
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerHud("Pause");
    }
  }, [volume]);

  const skipSeconds = useCallback((sec: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + sec, duration));
    triggerHud(sec > 0 ? `+${sec}s` : `${sec}s`);
  }, [duration]);

  const changeVolume = useCallback((delta: number) => {
    if (!videoRef.current) return;
    const newVol = Math.max(0, Math.min(1, volume + delta));
    videoRef.current.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
    triggerHud(`Volume: ${Math.round(newVol * 100)}%`);
  }, [volume]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    triggerHud(nextMuted ? "Muted" : `Volume: ${Math.round(volume * 100)}%`);
  }, [isMuted, volume]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard controls listener (strictly satisfies user prompt: arrow up/down volume, left/right skip 5s)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          skipSeconds(5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipSeconds(-5);
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(-0.1);
          break;
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "c":
        case "C":
          e.preventDefault();
          setShowSubtitles((prev) => {
            const next = !prev;
            triggerHud(next ? "Subtitles: ON" : "Subtitles: OFF");
            return next;
          });
          break;
        case "j":
        case "J":
          e.preventDefault();
          skipSeconds(-10);
          break;
        case "l":
        case "L":
          e.preventDefault();
          skipSeconds(10);
          break;
        case "Escape":
          if (isFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [skipSeconds, changeVolume, togglePlay, toggleFullscreen, toggleMute, isFullscreen, onClose]);

  // Controls hide timeout on mouse idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const copyDirectUrl = () => {
    navigator.clipboard.writeText(streamUrl);
    setCopiedUrl(true);
    triggerHud("Stream URL copied! (In VLC: Media > Open Network Stream or Ctrl+N)");
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const bufferPercent = duration > 0 ? (bufferedTime / duration) * 100 : 0;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={streamUrl}
        preload="metadata"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Center Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Floating HUD Feedback */}
      {hudMessage && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white font-semibold text-lg px-6 py-3 rounded-xl border border-white/20 backdrop-blur-md pointer-events-none transition-all shadow-2xl">
          {hudMessage}
        </div>
      )}

      {/* On-Screen Subtitle Rendering */}
      {showSubtitles && activeCueText && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 max-w-4xl px-4 text-center pointer-events-none">
          <p
            className={`font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] bg-black/70 px-4 py-1.5 rounded-lg inline-block whitespace-pre-wrap leading-relaxed ${
              subtitleSize === "sm"
                ? "text-base md:text-lg"
                : subtitleSize === "md"
                ? "text-lg md:text-2xl"
                : subtitleSize === "lg"
                ? "text-2xl md:text-3xl"
                : "text-3xl md:text-4xl"
            }`}
          >
            {activeCueText}
          </p>
        </div>
      )}

      {/* Top Bar Controls */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center space-x-3 text-white">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-300 hover:text-white"
            title="Close Player (Esc)"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-bold truncate max-w-xl">{title}</h2>
            <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-0.5">
              <span className="bg-red-600/80 text-white px-2 py-0.5 rounded font-medium">{item.quality}</span>
              {item.audio && <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">{item.audio}</span>}
              <span className="text-emerald-400">● BDIX Fast Stream</span>
              {bufferedTime > currentTime && (
                <span className="text-zinc-400">
                  Buffer: {Math.max(0, Math.round(bufferedTime - currentTime))}s ahead
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Top Actions: External Players, URL, Download */}
        <div className="flex items-center space-x-2">
          {isSeries && (
            <button
              onClick={() => setShowEpisodeDrawer(!showEpisodeDrawer)}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg flex items-center space-x-1.5 border border-zinc-700 transition"
            >
              <span>Episodes</span>
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          )}

          {/* 1-Click Launch in VLC / PotPlayer via .m3u Stream File */}
          <button
            onClick={() => {
              launchExternalStream(streamUrl, title);
              triggerHud("Stream file ready! Click to open in VLC or PotPlayer");
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-orange-600/30"
            title="Stream in VLC or PotPlayer directly (Opens via instant stream link with full surround sound & subtitles)"
          >
            <ExternalLinkIcon className="w-3.5 h-3.5" />
            <span>Open in VLC / PotPlayer</span>
          </button>

          <button
            onClick={copyDirectUrl}
            className="p-2 hover:bg-white/10 rounded-full text-zinc-300 hover:text-white transition"
            title="Copy Direct Stream URL"
          >
            <CopyIcon className="w-5 h-5" />
          </button>

          <a
            href={streamUrl}
            download
            className="p-2 hover:bg-white/10 rounded-full text-zinc-300 hover:text-white transition"
            title="Download Video File"
          >
            <DownloadIcon className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col space-y-3 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Timeline Slider with Progressive Buffering Display */}
        <div className="relative w-full group py-1 cursor-pointer">
          {/* Background Bar */}
          <div className="relative w-full h-1.5 group-hover:h-2.5 bg-zinc-800 rounded-full overflow-hidden transition-all">
            {/* Buffer Progress (Gray) */}
            <div
              className="absolute top-0 left-0 h-full bg-zinc-600/60 rounded-full transition-all duration-300"
              style={{ width: `${bufferPercent}%` }}
              title={`Buffered: ${Math.round(bufferPercent)}%`}
            />
            {/* Playback Progress (Red) */}
            <div
              className="absolute top-0 left-0 h-full bg-red-600 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Interactive Range Input */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between text-white">
          {/* Left Controls: Play, Skips, Volume, Timers */}
          <div className="flex items-center space-x-3 md:space-x-4">
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-white/10 rounded-full text-white transition transform active:scale-95"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <PauseIcon className="w-6 h-6 md:w-7 md:h-7" /> : <PlayIcon className="w-6 h-6 md:w-7 md:h-7" />}
            </button>

            {/* Skip 5s Backwards & Forwards (User Requirement) */}
            <button
              onClick={() => skipSeconds(-5)}
              className="p-2 hover:bg-white/10 rounded-full text-zinc-300 hover:text-white transition flex items-center justify-center"
              title="Skip -5s (Left Arrow)"
            >
              <SkipBack5Icon className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <button
              onClick={() => skipSeconds(5)}
              className="p-2 hover:bg-white/10 rounded-full text-zinc-300 hover:text-white transition flex items-center justify-center"
              title="Skip +5s (Right Arrow)"
            >
              <SkipForward5Icon className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center space-x-2 group">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white/10 rounded-full text-zinc-300 hover:text-white transition"
                title="Mute (M)"
              >
                {isMuted || volume === 0 ? (
                  <VolumeMuteIcon className="w-5 h-5 md:w-6 md:h-6" />
                ) : (
                  <VolumeIcon className="w-5 h-5 md:w-6 md:h-6" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  setIsMuted(val === 0);
                  if (videoRef.current) videoRef.current.volume = val;
                }}
                className="w-16 md:w-24 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
            </div>

            {/* Timers */}
            <div className="text-xs md:text-sm text-zinc-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Subtitles, Volume Boost, Speed, Fullscreen */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Direct VLC / PotPlayer Stream for Dolby / DTS */}
            <button
              onClick={() => {
                launchExternalStream(streamUrl, title);
                triggerHud("Stream file ready! Click to open in VLC/PotPlayer");
              }}
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 bg-orange-600/90 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition"
              title="Stream in VLC or PotPlayer directly (Supports 5.1/7.1 Dolby AC3 & DTS)"
            >
              <span>VLC / PotPlayer (.m3u)</span>
            </button>

            {/* Playback Rate Dropdown */}
            <select
              value={playbackRate}
              onChange={(e) => {
                const rate = parseFloat(e.target.value);
                setPlaybackRate(rate);
                if (videoRef.current) videoRef.current.playbackRate = rate;
              }}
              className="bg-zinc-800/90 text-xs text-zinc-300 px-2 py-1.5 rounded-lg border border-zinc-700 cursor-pointer focus:outline-none"
              title="Playback Speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2.0x</option>
            </select>

            {/* Subtitle Toggle & Menu */}
            <div className="relative group">
              <button
                onClick={() => {
                  setShowSubtitles(!showSubtitles);
                  triggerHud(!showSubtitles ? "Subtitles: ON" : "Subtitles: OFF");
                }}
                className={`p-2 rounded-full transition ${
                  showSubtitles ? "text-red-500 bg-red-500/20" : "text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
                title="Toggle Subtitle (C)"
              >
                <SubtitlesIcon className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              {/* Subtitle Settings Popover on Hover */}
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-zinc-900/95 border border-zinc-800 rounded-xl p-3 text-xs shadow-2xl backdrop-blur-md hidden group-hover:flex flex-col space-y-2 pointer-events-auto">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                  <span className="font-semibold text-white">Subtitle Settings</span>
                  <span className="text-zinc-400 text-[10px]">Key: 'C'</span>
                </div>

                {/* Online Subtitle Finder Trigger */}
                <button
                  type="button"
                  onClick={() => setShowOnlineSubtitleModal(true)}
                  className="w-full py-1.5 px-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-md shadow-red-600/30"
                >
                  <SearchIcon className="w-3.5 h-3.5" />
                  <span>Find Online Subtitles (Auto-Save)</span>
                </button>

                {/* Upload Local SRT */}
                <div>
                  <label className="block text-zinc-400 mb-1">Load Custom Subtitle (.srt / .vtt):</label>
                  <input
                    type="file"
                    accept=".srt,.vtt"
                    onChange={handleCustomSubtitleUpload}
                    className="w-full text-[11px] text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                  />
                </div>

                {/* Subtitle Font Size */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-400">Font Size:</span>
                  <div className="flex space-x-1">
                    {(["sm", "md", "lg", "xl"] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSubtitleSize(sz)}
                        className={`px-1.5 py-0.5 rounded uppercase font-bold text-[10px] ${
                          subtitleSize === sz ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subtitle Sync Offset */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-400">Sync Delay:</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setSubDelay((d) => d - 0.5)}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200"
                    >
                      -0.5s
                    </button>
                    <span className="text-white w-8 text-center">{subDelay.toFixed(1)}s</span>
                    <button
                      onClick={() => setSubDelay((d) => d + 0.5)}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-full text-zinc-300 hover:text-white transition"
              title="Fullscreen (F)"
            >
              {isFullscreen ? (
                <ExitFullscreenIcon className="w-5 h-5 md:w-6 md:h-6" />
              ) : (
                <FullscreenIcon className="w-5 h-5 md:w-6 md:h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Series Episode Selector Drawer */}
      {isSeries && showEpisodeDrawer && (
        <div className="absolute top-0 right-0 bottom-0 w-80 md:w-96 bg-zinc-950/95 border-l border-zinc-800 z-50 p-4 overflow-y-auto flex flex-col shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="font-bold text-white text-base">Series Episodes</h3>
            <button
              onClick={() => setShowEpisodeDrawer(false)}
              className="p-1 text-zinc-400 hover:text-white"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Season Selector */}
          <div className="mt-3 flex flex-wrap gap-1.5 pb-2">
            {item.seasons?.map((season) => (
              <button
                key={season.season}
                onClick={() => setActiveSeason(season)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  activeSeason?.season === season.season
                    ? "bg-red-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {season.season_name}
              </button>
            ))}
          </div>

          {/* Episode List */}
          <div className="mt-2 space-y-1.5 flex-1 overflow-y-auto">
            {activeSeason?.episodes.map((ep, idx) => {
              const isCurrent = activeEpisode?.name === ep.name;
              return (
                <div
                  key={ep.name}
                  onClick={() => {
                    setActiveEpisode(ep);
                    setShowEpisodeDrawer(false);
                    triggerHud(`Playing ${ep.name}`);
                  }}
                  className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between transition ${
                    isCurrent
                      ? "bg-red-600/20 border border-red-500/50 text-white"
                      : "bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-300 border border-transparent"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <span className="text-xs font-bold text-zinc-500 w-5">{idx + 1}</span>
                    <span className="text-xs font-medium truncate">{ep.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-zinc-400 flex-shrink-0">
                    <span>{ep.size}</span>
                    {isCurrent && <span className="text-red-500 font-bold">●</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Online Subtitle Finder Modal */}
      {showOnlineSubtitleModal && (
        <SubtitleFinderModal
          mediaId={item.id}
          mediaTitle={item.title}
          year={item.year}
          seasonNum={activeSeason?.season}
          episodeName={activeEpisode?.name}
          onApplySubtitle={(cues, label) => {
            setSubCues(cues);
            setShowSubtitles(true);
            triggerHud(`Applied & Saved Subtitle: ${label}`);
          }}
          onClose={() => setShowOnlineSubtitleModal(false)}
        />
      )}
    </div>
  );
}
