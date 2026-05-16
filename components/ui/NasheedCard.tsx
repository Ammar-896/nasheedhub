'use client';

import { useState } from 'react';
import { Play, Pause, Heart, MoreHorizontal, Plus } from 'lucide-react';
import { usePlayerStore } from '@/context/playerStore';
import type { Nasheed } from '@/lib/types';

interface NasheedCardProps {
  nasheed: Nasheed;
  queue?: Nasheed[];
  variant?: 'grid' | 'list';
  showIndex?: number;
  isLiked?: boolean;
  onLike?: (id: string) => void;
  onAddToPlaylist?: (nasheed: Nasheed) => void;
}

function formatDuration(s?: number) {
  if (!s) return '--:--';
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function formatPlays(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function NasheedCard({
  nasheed, queue, variant = 'grid', showIndex,
  isLiked = false, onLike, onAddToPlaylist,
}: NasheedCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const [hovered, setHovered] = useState(false);
  const [liked, setLiked] = useState(isLiked);

  const isCurrent = currentTrack?.id === nasheed.id;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCurrent) { togglePlay(); }
    else { playTrack(nasheed, queue ?? [nasheed]); }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    setLiked(!liked);
    onLike?.(nasheed.id);
  };

  if (variant === 'list') {
    return (
      <div
        className="flex items-center gap-4 px-4 py-2.5 rounded-lg group transition-all"
        style={{ background: isCurrent ? 'rgba(201,168,76,0.06)' : hovered ? 'var(--bg-hover)' : 'transparent' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Index / play button */}
        <div className="w-8 text-center shrink-0">
          {hovered || isCurrent ? (
            <button onClick={handlePlay} className="w-8 h-8 flex items-center justify-center" style={{ color: 'var(--gold)' }}>
              {isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
          ) : (
            <span className="text-sm tabular-nums" style={{ color: isCurrent ? 'var(--gold)' : 'var(--text-muted)' }}>
              {showIndex ?? '•'}
            </span>
          )}
        </div>

        {/* Cover */}
        <div className="w-10 h-10 rounded shrink-0 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          {nasheed.cover_url
            ? <img src={nasheed.cover_url} alt={nasheed.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-base">🎵</div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: isCurrent ? 'var(--gold)' : 'var(--text-primary)' }}>
            {nasheed.title}
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {nasheed.artist?.name || nasheed.artist_name || 'Unknown Artist'}
          </div>
        </div>

        {/* Album */}
        <div className="hidden md:block w-32 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
          {nasheed.album?.title || nasheed.album_title || '—'}
        </div>

        {/* Plays */}
        <div className="hidden lg:block w-16 text-right text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {formatPlays(nasheed.play_count)}
        </div>

        {/* Like */}
        <button onClick={handleLike} className="opacity-0 group-hover:opacity-100 transition-opacity p-1" style={{ color: liked ? '#e05c5c' : 'var(--text-muted)' }}>
          <Heart size={16} fill={liked ? '#e05c5c' : 'none'} />
        </button>

        {/* Duration */}
        <div className="text-xs tabular-nums w-10 text-right" style={{ color: 'var(--text-muted)' }}>
          {formatDuration(nasheed.duration)}
        </div>

        {/* More */}
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1" style={{ color: 'var(--text-muted)' }}
          onClick={e => { e.preventDefault(); onAddToPlaylist?.(nasheed); }}>
          <MoreHorizontal size={16} />
        </button>
      </div>
    );
  }

  // Grid variant
  return (
    <div
      className="rounded-xl p-4 transition-all cursor-pointer group relative"
      style={{ background: hovered ? 'var(--bg-hover)' : 'var(--bg-card)', border: `1px solid ${isCurrent ? 'rgba(201,168,76,0.3)' : 'transparent'}` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handlePlay}
    >
      {/* Cover art */}
      <div className="relative aspect-square rounded-lg overflow-hidden mb-4" style={{ background: 'var(--bg-elevated)' }}>
        {nasheed.cover_url ? (
          <img src={nasheed.cover_url} alt={nasheed.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(45,122,79,0.1))' }}>
            🕌
          </div>
        )}

        {/* Play overlay */}
        <div
          className="absolute inset-0 flex items-end justify-end p-3 transition-opacity"
          style={{ opacity: hovered || isCurrent ? 1 : 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }}
        >
          <button
            className="w-11 h-11 rounded-full flex items-center justify-center shadow-xl transition-transform"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', transform: hovered ? 'scale(1)' : 'scale(0.8)' }}
            onClick={handlePlay}
          >
            {isCurrent && isPlaying
              ? <Pause size={18} fill="#080810" color="#080810" />
              : <Play size={18} fill="#080810" color="#080810" style={{ marginLeft: '2px' }} />
            }
          </button>
        </div>

        {/* Currently playing indicator */}
        {isCurrent && isPlaying && (
          <div className="absolute top-2 left-2 flex gap-0.5 items-end h-4">
            {[1,2,3].map(i => (
              <div
                key={i}
                className="w-1 rounded-sm"
                style={{
                  background: 'var(--gold)',
                  height: `${Math.random() * 100}%`,
                  animation: `bounceBar${i} 0.6s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.15}s`
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <div className="text-sm font-medium truncate mb-0.5" style={{ color: isCurrent ? 'var(--gold)' : 'var(--text-primary)' }}>
          {nasheed.title}
        </div>
        <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
          {nasheed.artist?.name || nasheed.artist_name || 'Unknown Artist'}
        </div>
      </div>

      {/* Quick actions */}
      <div
        className="absolute top-2 right-2 flex gap-1 transition-opacity"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        <button
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', color: liked ? '#e05c5c' : 'white' }}
          onClick={handleLike}
        >
          <Heart size={13} fill={liked ? '#e05c5c' : 'none'} />
        </button>
        <button
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
          onClick={e => { e.stopPropagation(); onAddToPlaylist?.(nasheed); }}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
