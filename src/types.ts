export interface SubtitleTrack {
  label: string;
  src: string;
  lang?: string;
  isExternal?: boolean;
}

export interface Episode {
  name: string;
  url: string;
  size: string;
  date?: string;
}

export interface Season {
  season: number;
  season_name: string;
  episodes: Episode[];
  subtitles?: string[];
}

export interface MediaItem {
  id: string;
  title: string;
  raw_name: string;
  type: "movie" | "series";
  category_id: string;
  category_name: string;
  menu: "movies" | "tv-series";
  year: string;
  quality: string;
  audio?: string;
  poster: string;
  folder_url: string;
  stream_url?: string;
  filename?: string;
  size?: string;
  date?: string;
  subtitles?: string[];
  seasons?: Season[];
  total_episodes?: number;
}

export interface Category {
  id: string;
  name: string;
  type: "movie" | "series";
  menu: "movies" | "tv-series";
  url: string;
  origin: string;
}

export interface PlaybackState {
  currentTime: number;
  duration: number;
  lastUpdated: number;
}
