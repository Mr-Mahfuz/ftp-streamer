"use client";

import React, { useState, useEffect } from "react";
import { CloseIcon, SearchIcon, DownloadIcon, CheckIcon, ExternalLinkIcon, SparklesIcon, TrashIcon } from "./Icons";

export interface ParsedCue {
  start: number;
  end: number;
  text: string;
}

export interface SubtitleResult {
  id: string;
  title: string;
  lang: string;
  source: string;
  downloadUrl?: string;
  srtContent?: string;
}

interface SubtitleFinderModalProps {
  mediaId: string;
  mediaTitle: string;
  year?: string;
  seasonNum?: number;
  episodeName?: string;
  onApplySubtitle: (cues: ParsedCue[], label: string, rawText?: string) => void;
  onClose: () => void;
}

// Robust SRT / VTT Parser
export function parseSRT(text: string): ParsedCue[] {
  // Normalize line breaks
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const srtRegex = /(\d+)\n(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})\n([\s\S]*?)(?=\n\n|\n*$)/g;

  const timeToSeconds = (timeStr: string) => {
    const [h, m, rest] = timeStr.replace(",", ".").split(":");
    return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(rest);
  };

  const cues: ParsedCue[] = [];
  let match;
  while ((match = srtRegex.exec(normalized)) !== null) {
    const start = timeToSeconds(match[2]);
    const end = timeToSeconds(match[3]);
    const content = match[4].replace(/<[^>]*>/g, "").trim();
    if (content) {
      cues.push({ start, end, text: content });
    }
  }

  // Fallback if standard regex didn't catch (e.g. slight formatting variations)
  if (cues.length === 0) {
    const blocks = normalized.split(/\n\s*\n/);
    for (const block of blocks) {
      const lines = block.trim().split("\n");
      const arrowLine = lines.find((l) => l.includes("-->"));
      if (arrowLine) {
        const parts = arrowLine.split("-->");
        if (parts.length === 2) {
          const start = timeToSeconds(parts[0].trim());
          const end = timeToSeconds(parts[1].trim());
          const textLines = lines.slice(lines.indexOf(arrowLine) + 1).join("\n").replace(/<[^>]*>/g, "").trim();
          if (textLines) {
            cues.push({ start, end, text: textLines });
          }
        }
      }
    }
  }

  return cues;
}

export default function SubtitleFinderModal({
  mediaId,
  mediaTitle,
  year,
  seasonNum,
  episodeName,
  onApplySubtitle,
  onClose
}: SubtitleFinderModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "url" | "paste">("search");

  // Initial search query
  const defaultQuery = episodeName
    ? `${mediaTitle} ${episodeName}`
    : year
    ? `${mediaTitle} ${year}`
    : mediaTitle;

  const [query, setQuery] = useState(defaultQuery);
  const [lang, setLang] = useState("English");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SubtitleResult[]>([]);
  const [directUrl, setDirectUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [savedSubInfo, setSavedSubInfo] = useState<{ label: string; date: string } | null>(null);

  const storageKey = `dhakaflix_saved_sub_${mediaId}_${episodeName || "main"}`;

  // Check if browser localStorage already has a saved subtitle for this movie/episode
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedSubInfo({
          label: parsed.label || "Saved Subtitle",
          date: parsed.savedAt ? new Date(parsed.savedAt).toLocaleDateString() : "Previously saved"
        });
      }
    } catch (e) {
      console.warn("Could not read from localStorage:", e);
    }
  }, [storageKey]);

  // Search online subtitle sources
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);

    try {
      const cleanQ = encodeURIComponent(query.trim());
      const fetchedResults: SubtitleResult[] = [];

      // 1. Query YTS Subs
      try {
        const ytsRes = await fetch(`https://yts-subs.com/search/ajax/${cleanQ}`);
        if (ytsRes.ok) {
          const ytsData = await ytsRes.json();
          if (Array.isArray(ytsData)) {
            ytsData.forEach((item: any) => {
              fetchedResults.push({
                id: `yts_${item.mov_id}`,
                title: `${item.titleWithYear || item.mov_title} [YTS Subtitles]`,
                lang: "English / Multi",
                source: "YTS Subs",
                downloadUrl: `https://yts-subs.com/movie-imdb/${item.mov_imdb_code}`
              });
            });
          }
        }
      } catch (err) {
        // Fallback gracefully
      }

      // Add high-relevance search provider links
      fetchedResults.push(
        {
          id: "opensubtitles_web",
          title: `Search "${query}" on OpenSubtitles.org`,
          lang: lang,
          source: "OpenSubtitles",
          downloadUrl: `https://www.opensubtitles.org/en/search/sublanguageid-${lang.toLowerCase().slice(0, 3)}/moviename-${cleanQ}`
        },
        {
          id: "subsource_web",
          title: `Search "${query}" on SubSource.net`,
          lang: lang,
          source: "SubSource",
          downloadUrl: `https://subsource.net/subtitles/${cleanQ}`
        },
        {
          id: "subscene_web",
          title: `Search "${query}" on Subscene`,
          lang: lang,
          source: "Subscene Best Match",
          downloadUrl: `https://subscene.best/subtitles/searchbytitle?query=${cleanQ}`
        }
      );

      setResults(fetchedResults);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Run initial search on mount
  useEffect(() => {
    handleSearch();
  }, []);

  // Apply subtitle and persist to browser localStorage
  const applyAndPersist = (cues: ParsedCue[], label: string, rawSrt?: string) => {
    if (cues.length === 0) {
      alert("No valid subtitle cues found in the provided text.");
      return;
    }

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          label,
          cues,
          rawText: rawSrt || "",
          savedAt: Date.now()
        })
      );
    } catch (e) {
      console.warn("LocalStorage quota full or unavailable:", e);
    }

    onApplySubtitle(cues, label, rawSrt);
    onClose();
  };

  // Fetch from direct URL
  const handleFetchDirectUrl = async () => {
    if (!directUrl.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(directUrl.trim());
      const text = await res.text();
      const parsed = parseSRT(text);
      if (parsed.length > 0) {
        applyAndPersist(parsed, `Online: ${directUrl.split("/").pop() || "Custom Sub"}`, text);
      } else {
        alert("Could not parse subtitle format from URL. Ensure it points to a raw .srt or .vtt file.");
      }
    } catch (err: any) {
      alert(`Could not fetch subtitle URL: ${err.message}. If blocked by CORS, copy and paste the raw SRT text into the "Paste Text" tab.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle pasted text
  const handleApplyPastedText = () => {
    if (!rawText.trim()) return;
    const parsed = parseSRT(rawText);
    if (parsed.length > 0) {
      applyAndPersist(parsed, "Pasted Subtitle", rawText);
    } else {
      alert("Invalid SRT format. Please ensure the pasted text has numbered subtitle cues with timestamps (00:01:20,000 --> 00:01:25,000).");
    }
  };

  // Clear cached subtitle from localStorage
  const handleClearSaved = () => {
    localStorage.removeItem(storageKey);
    setSavedSubInfo(null);
    alert("Saved subtitle removed from browser local storage.");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-red-600/20 text-red-400 rounded-xl">
              <SparklesIcon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-white text-base">Online Subtitle Finder</h3>
              <p className="text-xs text-zinc-400">
                Find online subtitles by title and save to browser storage for auto-load
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Saved Subtitle Banner if present */}
        {savedSubInfo && (
          <div className="mx-5 mt-4 p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center space-x-2">
              <CheckIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong>Saved in LocalStorage:</strong> {savedSubInfo.label} ({savedSubInfo.date})
              </span>
            </div>
            <button
              onClick={handleClearSaved}
              className="px-2 py-1 bg-emerald-900/50 hover:bg-red-900/60 text-emerald-200 hover:text-red-300 rounded-lg text-[11px] transition flex items-center space-x-1"
              title="Delete from local storage"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 px-5 pt-4 border-b border-zinc-800/60 pb-3">
          <button
            onClick={() => setActiveTab("search")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "search"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            Search by Title
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "url"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            Direct Subtitle URL
          </button>
          <button
            onClick={() => setActiveTab("paste")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "paste"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            Paste Raw SRT
          </button>
        </div>

        {/* Tab 1: Search Online */}
        {activeTab === "search" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Movie or series title..."
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 px-3 py-2 rounded-xl focus:outline-none"
              >
                <option value="English">English</option>
                <option value="Bengali">Bengali / Bangla</option>
                <option value="Hindi">Hindi</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="Arabic">Arabic</option>
                <option value="All">All Languages</option>
              </select>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Results List */}
            <div className="space-y-2 mt-2">
              {results.map((res) => (
                <div
                  key={res.id}
                  className="p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 rounded-2xl flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-white truncate">{res.title}</h4>
                    <div className="flex items-center space-x-2 text-[10px] text-zinc-400 mt-0.5">
                      <span className="bg-zinc-800 px-1.5 py-0.5 rounded">{res.source}</span>
                      <span>●</span>
                      <span>{res.lang}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {res.downloadUrl && (
                      <a
                        href={res.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-xl flex items-center space-x-1 transition border border-zinc-700"
                        title="Open on provider site"
                      >
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                        <span>Visit & Download</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed text-center pt-2">
              Tip: When you download the .srt from the provider, either upload it or copy & paste its text into the "Paste Raw SRT" tab to permanently save it in your browser!
            </p>
          </div>
        )}

        {/* Tab 2: Direct URL */}
        {activeTab === "url" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Direct .srt or .vtt Subtitle URL:
              </label>
              <input
                type="url"
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
                placeholder="https://example.com/subtitles/movie.srt"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              onClick={handleFetchDirectUrl}
              disabled={loading || !directUrl.trim()}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 shadow-lg shadow-red-600/30"
            >
              {loading ? "Fetching..." : "Fetch & Apply to Video"}
            </button>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Fetches the subtitle over HTTP/HTTPS, synchronizes the cues with the video, and caches it in local storage.
            </p>
          </div>
        )}

        {/* Tab 3: Paste Raw SRT */}
        {activeTab === "paste" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Paste Raw SRT / VTT Text:
              </label>
              <textarea
                rows={8}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="1&#10;00:00:15,000 --> 00:00:18,500&#10;Welcome to DhakaFlix!&#10;&#10;2&#10;00:00:20,000 --> 00:00:23,000&#10;Subtitle loaded successfully."
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500 leading-relaxed"
              />
            </div>

            <button
              onClick={handleApplyPastedText}
              disabled={!rawText.trim()}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 shadow-lg shadow-red-600/30"
            >
              Parse, Apply & Save to Browser Storage
            </button>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Works 100% offline with zero CORS restrictions. Once applied, this subtitle is permanently saved in browser storage for this title.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
