// ============================================================
// NASHEED HUB - TypeScript Types
// ============================================================

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  image_url?: string;
  country?: string;
  verified: boolean;
  follower_count: number;
  created_at: string;
}

export interface Album {
  id: string;
  title: string;
  slug: string;
  artist_id?: string;
  cover_url?: string;
  release_year?: number;
  description?: string;
  created_at: string;
  artist?: Artist;
}

export interface Nasheed {
  id: string;
  title: string;
  slug: string;
  artist_id?: string;
  album_id?: string;
  audio_url: string;
  cover_url?: string;
  duration?: number;
  play_count: number;
  like_count: number;
  lyrics?: string;
  language: string;
  tags?: string[];
  source_url?: string;
  is_published: boolean;
  created_at: string;
  // Joined fields
  artist?: Artist;
  album?: Album;
  artist_name?: string;
  album_title?: string;
}

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  is_admin: boolean;
  created_at: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_url?: string;
  is_public: boolean;
  track_count: number;
  created_at: string;
  // Joined
  profile?: Profile;
  tracks?: PlaylistTrack[];
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  nasheed_id: string;
  position: number;
  added_at: string;
  nasheed?: Nasheed;
}

export interface LikedSong {
  user_id: string;
  nasheed_id: string;
  liked_at: string;
  nasheed?: Nasheed;
}

export interface ListeningHistory {
  id: string;
  user_id: string;
  nasheed_id: string;
  played_at: string;
  progress_sec: number;
  nasheed?: Nasheed;
}

// Player state
export interface PlayerState {
  currentTrack: Nasheed | null;
  queue: Nasheed[];
  queueIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  progress: number;
  duration: number;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
