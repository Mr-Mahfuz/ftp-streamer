"use client";

import React, { useState } from "react";
import { GameSoftwareItem, GameSoftwareFile } from "../types";
import { DownloadTarget } from "./DownloadManager";
import {
  CloseIcon,
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon
} from "./Icons";

interface GamesSoftwareModalProps {
  item: GameSoftwareItem;
  onClose: () => void;
  onAddBatchTargets: (targets: DownloadTarget[]) => void;
  selectedIds: Set<string>;
  onToggleTarget: (target: DownloadTarget) => void;
}

export default function GamesSoftwareModal({
  item,
  onClose,
  onAddBatchTargets,
  selectedIds,
  onToggleTarget
}: GamesSoftwareModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const files = item.files || [];

  const handleCopyFolderUrl = () => {
    navigator.clipboard.writeText(item.folder_url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSelectAllFiles = () => {
    const targets: DownloadTarget[] = files.map((f, idx) => ({
      id: `${item.id}_file_${idx}`,
      title: item.title,
      name: f.name,
      url: f.url,
      size: f.size,
      type: "software"
    }));
    onAddBatchTargets(targets);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-zinc-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                {item.platform || "PC"}
              </span>
              <span className="text-xs text-zinc-400 font-semibold">{item.category_name}</span>
              {item.size && (
                <span className="text-xs text-zinc-500 font-mono">● {item.size}</span>
              )}
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white leading-snug">{item.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Batch Actions Banner */}
        <div className="px-5 py-3 bg-zinc-950/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-zinc-400">
            Contains <strong className="text-white">{files.length > 0 ? files.length : "1 direct"}</strong> downloadable file(s)
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyFolderUrl}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition flex items-center space-x-1.5"
            >
              <CopyIcon className="w-3.5 h-3.5" />
              <span>{copiedUrl ? "Copied Link!" : "Copy Folder URL"}</span>
            </button>
            {files.length > 0 && (
              <button
                onClick={handleSelectAllFiles}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-cyan-600/30"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                <span>Add All {files.length} Files to Downloader</span>
              </button>
            )}
          </div>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2.5">
          {files.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 bg-zinc-950/40 rounded-2xl border border-zinc-800/60">
              <p className="text-sm">Direct package download ready.</p>
              <a
                href={item.download_url}
                target="_blank"
                rel="noreferrer"
                download
                className="mt-4 inline-flex items-center space-x-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition"
              >
                <DownloadIcon className="w-4 h-4" />
                <span>Download Package ({item.size || "Direct"})</span>
              </a>
            </div>
          ) : (
            files.map((file, idx) => {
              const fileId = `${item.id}_file_${idx}`;
              const isSelected = selectedIds.has(fileId);
              const target: DownloadTarget = {
                id: fileId,
                title: item.title,
                name: file.name,
                url: file.url,
                size: file.size,
                type: "software"
              };

              return (
                <div
                  key={fileId}
                  className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-cyan-950/30 border-cyan-500/50"
                      : "bg-zinc-950/50 border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <button
                      onClick={() => onToggleTarget(target)}
                      className={`w-5 h-5 rounded-lg flex items-center justify-center transition border ${
                        isSelected
                          ? "bg-cyan-600 border-cyan-500 text-white"
                          : "border-zinc-700 bg-zinc-900 text-transparent hover:border-cyan-500"
                      }`}
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{file.name}</p>
                      {file.size && (
                        <p className="text-[11px] text-zinc-500 font-mono mt-0.5">{file.size}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1"
                      title="Download this file directly"
                    >
                      <DownloadIcon className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400">
          <span>High-speed Gigabit BDIX local download link.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
