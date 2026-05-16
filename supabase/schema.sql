-- ============================================================
-- NASHEED HUB - Production Schema for Supabase (PostgreSQL)
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search

-- ============================================================
-- ARTISTS
-- ============================================================
CREATE TABLE artists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  bio         TEXT,
  image_url   TEXT,
  country     TEXT,
  verified    BOOLEAN DEFAULT false,
  follower_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_artists_slug ON artists(slug);
CREATE INDEX idx_artists_name_trgm ON artists USING gin(name gin_trgm_ops);

-- ============================================================
-- ALBUMS
-- ============================================================
CREATE TABLE albums (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  artist_id    UUID REFERENCES artists(id) ON DELETE SET NULL,
  cover_url    TEXT,
  release_year INT,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_albums_artist_id ON albums(artist_id);

-- ============================================================
-- NASHEEDS (main tracks table)
-- ============================================================
CREATE TABLE nasheeds (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  artist_id    UUID REFERENCES artists(id) ON DELETE SET NULL,
  album_id     UUID REFERENCES albums(id) ON DELETE SET NULL,
  audio_url    TEXT NOT NULL,
  cover_url    TEXT,
  duration     INT,              -- duration in seconds
  play_count   BIGINT DEFAULT 0,
  like_count   INT DEFAULT 0,
  lyrics       TEXT,
  language     TEXT DEFAULT 'Arabic',
  tags         TEXT[],
  source_url   TEXT,             -- original scrape source
  is_published BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_nasheeds_artist_id ON nasheeds(artist_id);
CREATE INDEX idx_nasheeds_album_id ON nasheeds(album_id);
CREATE INDEX idx_nasheeds_play_count ON nasheeds(play_count DESC);
CREATE INDEX idx_nasheeds_title_trgm ON nasheeds USING gin(title gin_trgm_ops);
CREATE INDEX idx_nasheeds_tags ON nasheeds USING gin(tags);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT UNIQUE,
  full_name    TEXT,
  avatar_url   TEXT,
  bio          TEXT,
  is_admin     BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_profiles_username ON profiles(username);

-- ============================================================
-- PLAYLISTS
-- ============================================================
CREATE TABLE playlists (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  cover_url    TEXT,
  is_public    BOOLEAN DEFAULT false,
  track_count  INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_playlists_user_id ON playlists(user_id);

-- ============================================================
-- PLAYLIST TRACKS
-- ============================================================
CREATE TABLE playlist_tracks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id  UUID REFERENCES playlists(id) ON DELETE CASCADE,
  nasheed_id   UUID REFERENCES nasheeds(id) ON DELETE CASCADE,
  position     INT NOT NULL DEFAULT 0,
  added_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (playlist_id, nasheed_id)
);
CREATE INDEX idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);

-- ============================================================
-- LIKED SONGS
-- ============================================================
CREATE TABLE liked_songs (
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  nasheed_id   UUID REFERENCES nasheeds(id) ON DELETE CASCADE,
  liked_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, nasheed_id)
);
CREATE INDEX idx_liked_songs_user_id ON liked_songs(user_id);

-- ============================================================
-- LISTENING HISTORY
-- ============================================================
CREATE TABLE listening_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  nasheed_id   UUID REFERENCES nasheeds(id) ON DELETE CASCADE,
  played_at    TIMESTAMPTZ DEFAULT NOW(),
  progress_sec INT DEFAULT 0      -- how far they got
);
CREATE INDEX idx_listening_history_user_id ON listening_history(user_id, played_at DESC);

-- ============================================================
-- FOLLOWED ARTISTS
-- ============================================================
CREATE TABLE followed_artists (
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  artist_id    UUID REFERENCES artists(id) ON DELETE CASCADE,
  followed_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, artist_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE liked_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE followed_artists ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, only update their own
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Playlists: public ones visible to all, private only to owner
CREATE POLICY "playlists_select" ON playlists FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "playlists_insert" ON playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "playlists_update_own" ON playlists FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "playlists_delete_own" ON playlists FOR DELETE
  USING (auth.uid() = user_id);

-- Playlist tracks: same access as playlist
CREATE POLICY "playlist_tracks_select" ON playlist_tracks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM playlists p
    WHERE p.id = playlist_id AND (p.is_public = true OR p.user_id = auth.uid())
  ));
CREATE POLICY "playlist_tracks_modify" ON playlist_tracks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()
  ));

-- Liked songs: only own
CREATE POLICY "liked_songs_own" ON liked_songs FOR ALL USING (auth.uid() = user_id);

-- Listening history: only own
CREATE POLICY "listening_history_own" ON listening_history FOR ALL USING (auth.uid() = user_id);

-- Followed artists: only own
CREATE POLICY "followed_artists_own" ON followed_artists FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Increment play count
CREATE OR REPLACE FUNCTION increment_play_count(nasheed_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE nasheeds SET play_count = play_count + 1 WHERE id = nasheed_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update playlist track count
CREATE OR REPLACE FUNCTION update_playlist_track_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists SET track_count = track_count + 1 WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists SET track_count = track_count - 1 WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlist_track_count_trigger
  AFTER INSERT OR DELETE ON playlist_tracks
  FOR EACH ROW EXECUTE FUNCTION update_playlist_track_count();

-- Update like count
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE nasheeds SET like_count = like_count + 1 WHERE id = NEW.nasheed_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE nasheeds SET like_count = like_count - 1 WHERE id = OLD.nasheed_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nasheed_like_count_trigger
  AFTER INSERT OR DELETE ON liked_songs
  FOR EACH ROW EXECUTE FUNCTION update_like_count();

-- ============================================================
-- FULL-TEXT SEARCH VIEW
-- ============================================================
CREATE OR REPLACE VIEW nasheed_search AS
SELECT
  n.id,
  n.title,
  n.slug,
  n.audio_url,
  n.cover_url,
  n.duration,
  n.play_count,
  n.like_count,
  n.language,
  n.tags,
  a.name AS artist_name,
  a.id   AS artist_id,
  al.title AS album_title,
  al.id    AS album_id,
  to_tsvector('english', n.title || ' ' || COALESCE(a.name, '') || ' ' || COALESCE(al.title, '')) AS search_vector
FROM nasheeds n
LEFT JOIN artists a ON n.artist_id = a.id
LEFT JOIN albums al ON n.album_id = al.id
WHERE n.is_published = true;
