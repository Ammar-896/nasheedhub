'use client'

import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '@/context/playerStore'

const fmt = (s: number) =>
  isNaN(s) || !isFinite(s) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function AudioPlayer() {
  const {
    currentTrack, isPlaying, volume, isMuted,
    shuffle, repeat,
    togglePlay, nextTrack, prevTrack,
    setVolume, toggleMute, toggleShuffle, cycleRepeat,
    setProgress, setDuration,
  } = usePlayerStore()

  const audioRef  = useRef<HTMLAudioElement>(null)
  const [current, setCurrent] = useState(0)
  const [total,   setTotal]   = useState(0)
  const [seeking, setSeeking] = useState(false)
  const [showVol, setShowVol] = useState(false)

  // Load new track
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack?.audio_url) return
    audio.src = currentTrack.audio_url
    audio.load()
    if (isPlaying) audio.play().catch(() => {})
  }, [currentTrack?.id])

  // Play / pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.play().catch(() => {})
    else audio.pause()
  }, [isPlaying])

  // Volume / mute
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  // ── Hide completely when nothing is playing ──
  if (!currentTrack) return null

  const pct = total > 0 ? (current / total) * 100 : 0

  function onTimeUpdate() {
    const audio = audioRef.current
    if (!audio || seeking) return
    setCurrent(audio.currentTime)
    setProgress(audio.currentTime)
  }

  function onLoadedMetadata() {
    const audio = audioRef.current
    if (!audio) return
    setTotal(audio.duration)
    setDuration(audio.duration)
  }

  function onEnded() { nextTrack() }

  function onSeekChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value)
    setCurrent(val)
    const audio = audioRef.current
    if (audio) audio.currentTime = val
  }

  function onVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVolume(parseFloat(e.target.value))
  }

  const repeatColor = repeat !== 'none' ? '#818cf8' : 'rgba(255,255,255,0.4)'
  const shuffleColor = shuffle ? '#818cf8' : 'rgba(255,255,255,0.4)'

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        preload="metadata"
      />

      <style suppressHydrationWarning>{`
        .ap { display:flex; align-items:center; height:80px; padding:0 24px; gap:20px; font-family:'DM Sans',sans-serif; color:#fff; }
        .ap-track { display:flex; align-items:center; gap:12px; min-width:0; flex:0 0 260px; }
        .ap-art { width:46px; height:46px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; background:linear-gradient(135deg,rgba(99,102,241,.4),rgba(139,92,246,.3)); }
        .ap-info { min-width:0; }
        .ap-title { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; color:#fff; }
        .ap-artist { font-size:11px; color:rgba(255,255,255,.4); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; }
        .ap-controls { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .ap-btn { background:none; border:none; cursor:pointer; color:rgba(255,255,255,.5); padding:6px; border-radius:8px; display:flex; align-items:center; justify-content:center; transition:color .15s,background .15s; }
        .ap-btn:hover { color:#fff; background:rgba(255,255,255,.07); }
        .ap-play { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#fff; font-size:16px; transition:transform .15s,box-shadow .15s; flex-shrink:0; }
        .ap-play:hover { transform:scale(1.07); box-shadow:0 4px 20px rgba(99,102,241,.4); }
        .ap-seek { flex:1; display:flex; align-items:center; gap:10px; min-width:0; }
        .ap-time { font-size:11px; color:rgba(255,255,255,.35); white-space:nowrap; flex-shrink:0; width:36px; }
        .ap-time.right { text-align:right; }
        .ap-range { -webkit-appearance:none; appearance:none; height:4px; border-radius:4px; outline:none; cursor:pointer; flex:1; min-width:0; }
        .ap-range.seek { background:linear-gradient(to right, #6366f1 ${pct}%, rgba(255,255,255,0.15) ${pct}%); }
        .ap-range.vol { background:linear-gradient(to right, rgba(255,255,255,0.6) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) ${(isMuted ? 0 : volume) * 100}%); width:80px; flex:none; }
        .ap-range::-webkit-slider-thumb { -webkit-appearance:none; width:13px; height:13px; border-radius:50%; background:#fff; cursor:pointer; transition:transform .15s; }
        .ap-range:hover::-webkit-slider-thumb { transform:scale(1.3); }
        .ap-vol-wrap { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        @media(max-width:768px) {
          .ap-track { flex:0 0 160px; }
          .ap-title,.ap-artist { max-width:120px; }
          .ap-btn.hide-mobile { display:none; }
          .ap-vol-wrap .ap-range { width:60px; }
        }
        @media(max-width:560px) {
          .ap { padding:0 12px; gap:10px; }
          .ap-track { flex:0 0 auto; max-width:130px; }
          .ap-seek .ap-time { display:none; }
        }
      `}</style>

      <div className="ap">
        {/* Track info */}
        <div className="ap-track">
          <div className="ap-art">♪</div>
          <div className="ap-info">
            <div className="ap-title">{currentTrack.title}</div>
            <div className="ap-artist">{currentTrack.artist_name || '—'}</div>
          </div>
        </div>

        {/* Controls + seek */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          {/* Buttons */}
          <div className="ap-controls" style={{ justifyContent: 'center' }}>
            <button className="ap-btn hide-mobile" onClick={toggleShuffle} title="Shuffle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={shuffleColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
              </svg>
            </button>

            <button className="ap-btn" onClick={prevTrack} title="Previous">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"/></svg>
            </button>

            <button className="ap-play" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft:2}}><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>

            <button className="ap-btn" onClick={nextTrack} title="Next">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"/></svg>
            </button>

            <button className="ap-btn hide-mobile" onClick={cycleRepeat} title="Repeat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={repeatColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                {repeat === 'one' && <text x="9" y="14" fontSize="7" fill={repeatColor} stroke="none">1</text>}
              </svg>
            </button>
          </div>

          {/* Seek bar */}
          <div className="ap-seek">
            <span className="ap-time">{fmt(current)}</span>
            <input
              type="range"
              className="ap-range seek"
              min={0}
              max={total || 100}
              step={0.1}
              value={current}
              onMouseDown={() => setSeeking(true)}
              onMouseUp={() => setSeeking(false)}
              onChange={onSeekChange}
            />
            <span className="ap-time right">{fmt(total)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="ap-vol-wrap">
          <button className="ap-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted || volume === 0
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : volume < 0.5
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            }
          </button>
          <input
            type="range"
            className="ap-range vol"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={onVolumeChange}
          />
        </div>
      </div>
    </>
  )
}