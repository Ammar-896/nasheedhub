'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlayerStore } from '@/context/playerStore'
import { Nasheed } from '@/lib/types'

type NasheedRow = {
  id: string; title: string; audio_url: string
  duration: number; language: string; cover_url: string | null; artist_id: string | null
}
type Playlist = { id: string; title: string }

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#f59e0b','#ec4899','#10b981','#f97316','#3b82f6','#a855f7','#14b8a6']
const fmtDur = (s: number) => s ? `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` : '—'

export default function BrowsePage() {
  const [query, setQuery]           = useState('')
  const [all, setAll]               = useState<NasheedRow[]>([])
  const [results, setResults]       = useState<NasheedRow[]>([])
  const [artists, setArtists]       = useState<Record<string,string>>({})
  const [loading, setLoading]       = useState(true)
  const [playlists, setPlaylists]   = useState<Playlist[]>([])
  const [user, setUser]             = useState<any>(null)
  const [menu, setMenu]             = useState<{ track: NasheedRow; x: number; y: number } | null>(null)
  const [toast, setToast]           = useState<string|null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore()

  // Load everything on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase.from('playlists').select('id, title')
          .eq('user_id', data.user.id).order('created_at', { ascending: false })
          .then(({ data: pl }) => setPlaylists(pl || []))
      }
    })

    // Load all nasheeds from unrestricted view
    supabase
      .from('nasheed_search')
      .select('id, title, audio_url, duration, language, cover_url, artist_id')
      .order('play_count', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) console.warn('nasheed_search error:', error.message)
        const rows = (data || []) as NasheedRow[]
        setAll(rows)
        setResults(rows)
        setLoading(false)
        // Fetch all artist names
        const ids = [...new Set(rows.map(r => r.artist_id).filter(Boolean))] as string[]
        if (ids.length) {
          supabase.from('artists').select('id, name').in('id', ids).then(({ data: a }) => {
            if (a) {
              const map: Record<string,string> = {}
              a.forEach((x: any) => { map[x.id] = x.name })
              setArtists(map)
            }
          })
        }
      })
  }, [])

  // Search: match title OR artist name — runs client-side after data loaded
  useEffect(() => {
    if (!query.trim()) { setResults(all); return }
    const q = query.toLowerCase()
    // First: filter by title
    const byTitle = all.filter(n => n.title.toLowerCase().includes(q))
    // Second: find artist IDs whose name matches
    const matchedArtistIds = new Set(
      Object.entries(artists)
        .filter(([, name]) => name.toLowerCase().includes(q))
        .map(([id]) => id)
    )
    const byArtist = all.filter(n => n.artist_id && matchedArtistIds.has(n.artist_id))
    // Merge, deduplicate
    const seen = new Set<string>()
    const merged: NasheedRow[] = []
    for (const n of [...byTitle, ...byArtist]) {
      if (!seen.has(n.id)) { seen.add(n.id); merged.push(n) }
    }
    setResults(merged)
  }, [query, all, artists])

  const getArtist = (n: NasheedRow) => n.artist_id ? (artists[n.artist_id] ?? '…') : 'Unknown'

  // Close menu on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const toTrack = (n: NasheedRow): Nasheed => ({
    id: n.id, title: n.title, slug: n.id, audio_url: n.audio_url,
    cover_url: n.cover_url ?? undefined, duration: n.duration,
    play_count: 0, like_count: 0, language: n.language,
    is_published: true, created_at: '',
    artist_id: n.artist_id ?? undefined, artist_name: getArtist(n),
  })

  function handlePlay(n: NasheedRow) {
    if (!n.audio_url) return
    if (currentTrack?.id === n.id) { togglePlay(); return }
    playTrack(toTrack(n), results.filter(r => r.audio_url).map(toTrack))
  }

  function openMenu(e: React.MouseEvent, n: NasheedRow) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.min(rect.left - 160, window.innerWidth - 216)
    const y = rect.bottom + 4 + window.scrollY
    setMenu({ track: n, x: Math.max(8, x), y })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function addToPlaylist(playlistId: string) {
    if (!menu || !user) return
    const { count } = await supabase
      .from('playlist_tracks').select('id', { count: 'exact', head: true })
      .eq('playlist_id', playlistId)
    const { error } = await supabase.from('playlist_tracks').upsert({
      playlist_id: playlistId, nasheed_id: menu.track.id, position: (count || 0) + 1,
    }, { onConflict: 'playlist_id,nasheed_id' })
    const pl = playlists.find(p => p.id === playlistId)
    setMenu(null)
    showToast(error ? '⚠ Already in playlist' : `✓ Added to "${pl?.title}"`)
  }

  async function likeTrack() {
    if (!user || !menu) { showToast('Sign in to like songs'); return }
    const { error } = await supabase.from('liked_songs').upsert({
      user_id: user.id, nasheed_id: menu.track.id, liked_at: new Date().toISOString()
    }, { onConflict: 'user_id,nasheed_id' })
    setMenu(null)
    showToast(error ? '⚠ Already liked' : '♥ Added to Liked Songs')
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        .br{font-family:'DM Sans',sans-serif;color:#fff;padding:36px 48px 88px;}
        .br-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;gap:16px;flex-wrap:wrap;}
        .br-title{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;letter-spacing:-.03em;}
        .br-count{font-size:13px;color:rgba(255,255,255,.3);}
        .br-bar{position:relative;flex:1;min-width:220px;max-width:460px;}
        .br-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,.3);pointer-events:none;display:flex;}
        .br-input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:13px;padding:12px 16px 12px 44px;font-family:'DM Sans',sans-serif;font-size:15px;color:#fff;outline:none;transition:border-color .2s,background .2s;}
        .br-input:focus{border-color:rgba(99,102,241,.5);background:rgba(99,102,241,.06);}
        .br-input::placeholder{color:rgba(255,255,255,.22);}
        .br-clear{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.1);border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;color:rgba(255,255,255,.5);font-size:13px;display:flex;align-items:center;justify-content:center;}
        .br-clear:hover{background:rgba(255,255,255,.18);}
        .n-list{display:flex;flex-direction:column;gap:2px;}
        .n-row{display:grid;grid-template-columns:44px 1fr auto auto auto;align-items:center;gap:13px;padding:9px 10px;border-radius:11px;cursor:pointer;transition:background .12s;}
        .n-row:hover{background:rgba(255,255,255,.05);}
        .n-art{width:44px;height:44px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;position:relative;flex-shrink:0;}
        .n-pov{position:absolute;inset:0;background:rgba(0,0,0,.4);border-radius:9px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;font-size:15px;}
        .n-row:hover .n-pov{opacity:1;}
        .n-ttl{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .n-art-name{font-size:12px;color:rgba(255,255,255,.38);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .n-dur{font-size:12px;color:rgba(255,255,255,.28);white-space:nowrap;}
        .n-lang{font-size:11px;padding:3px 9px;border-radius:100px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.4);white-space:nowrap;}
        .n-more{background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;padding:5px 7px;border-radius:7px;font-size:17px;opacity:0;transition:opacity .15s,background .12s;line-height:1;display:flex;align-items:center;justify-content:center;}
        .n-row:hover .n-more{opacity:1;}
        .n-more:hover{background:rgba(255,255,255,.09);color:#fff;}
        .ctx{position:fixed;background:#16162a;border:1px solid rgba(255,255,255,.1);border-radius:13px;min-width:210px;z-index:9999;box-shadow:0 16px 48px rgba(0,0,0,.7);padding:6px;overflow:hidden;}
        .ctx-head{padding:10px 13px 8px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:4px;}
        .ctx-ttl{font-size:13px;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ctx-sub{font-size:11px;color:rgba(255,255,255,.35);margin-top:2px;}
        .ctx-it{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;font-size:13px;color:rgba(255,255,255,.7);transition:all .12s;border:none;background:none;width:100%;text-align:left;}
        .ctx-it:hover{background:rgba(99,102,241,.15);color:#fff;}
        .ctx-sec{font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.25);padding:8px 12px 3px;}
        .ctx-div{height:1px;background:rgba(255,255,255,.07);margin:4px 0;}
        .ctx-pl-it{display:flex;align-items:center;gap:9px;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;color:rgba(255,255,255,.65);transition:all .12s;border:none;background:none;width:100%;text-align:left;}
        .ctx-pl-it:hover{background:rgba(99,102,241,.15);color:#fff;}
        .toast{position:fixed;bottom:92px;left:50%;transform:translateX(-50%);background:#1c1c30;border:1px solid rgba(99,102,241,.35);color:#fff;padding:10px 22px;border-radius:100px;font-size:13px;z-index:10000;box-shadow:0 8px 32px rgba(0,0,0,.5);white-space:nowrap;animation:tin .2s ease;}
        @keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .no-r{text-align:center;padding:60px 0;color:rgba(255,255,255,.25);}
        .shim{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:sh 1.5s infinite;border-radius:11px;}
        @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .now-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#818cf8;animation:pulse 1s ease-in-out infinite;margin-right:5px;}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.7)}}
        @media(max-width:900px){.br{padding:28px 18px 88px;}}
        @media(max-width:600px){.n-row{grid-template-columns:40px 1fr auto;}.n-dur,.n-lang{display:none;}}
      `}</style>

      {/* Context menu */}
      {menu && (
        <div ref={menuRef} className="ctx" style={{ top: menu.y, left: menu.x }}>
          <div className="ctx-head">
            <div className="ctx-ttl">{menu.track.title}</div>
            <div className="ctx-sub">{getArtist(menu.track)}</div>
          </div>
          <button className="ctx-it" onClick={() => { handlePlay(menu.track); setMenu(null) }}>
            <span>▶</span> Play now
          </button>
          <button className="ctx-it" onClick={likeTrack}>
            <span>♥</span> Add to Liked Songs
          </button>
          {playlists.length > 0 && (
            <>
              <div className="ctx-div"/>
              <div className="ctx-sec">Add to playlist</div>
              {playlists.map(pl => (
                <button key={pl.id} className="ctx-pl-it" onClick={() => addToPlaylist(pl.id)}>
                  <span style={{fontSize:11}}>♪</span>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pl.title}</span>
                </button>
              ))}
            </>
          )}
          {user && playlists.length === 0 && (
            <>
              <div className="ctx-div"/>
              <button className="ctx-it" onClick={() => { setMenu(null); window.location.href='/library' }}>
                <span>+</span> Create a playlist first
              </button>
            </>
          )}
          {!user && (
            <>
              <div className="ctx-div"/>
              <button className="ctx-it" onClick={() => { setMenu(null); window.location.href='/login' }}>
                <span>→</span> Sign in to save
              </button>
            </>
          )}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <div className="br">
        <div className="br-top">
          <div>
            <h1 className="br-title">Browse</h1>
            {!loading && <div className="br-count">{results.length} nasheeds{query ? ` for "${query}"` : ''}</div>}
          </div>
          <div className="br-bar">
            <div className="br-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <input
              className="br-input"
              type="text"
              placeholder="Search by song or artist name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <button className="br-clear" onClick={() => setQuery('')}>✕</button>}
          </div>
        </div>

        {loading ? (
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {Array(10).fill(0).map((_,i) => <div key={i} className="shim" style={{height:54}}/>)}
          </div>
        ) : results.length === 0 ? (
          <div className="no-r">
            <div style={{fontSize:38,marginBottom:12}}>♪</div>
            <div>No results for "{query}"</div>
            <div style={{fontSize:13,marginTop:6,color:'rgba(255,255,255,.18)'}}>Try a different song or artist name</div>
          </div>
        ) : (
          <div className="n-list">
            {results.map((n, i) => {
              const playing = currentTrack?.id === n.id && isPlaying
              return (
                <div key={n.id} className="n-row" onClick={() => handlePlay(n)}>
                  <div className="n-art" style={{background:`linear-gradient(135deg,${COLORS[i%COLORS.length]}44,${COLORS[(i+3)%COLORS.length]}22)`}}>
                    ♪
                    <div className="n-pov">{playing ? '⏸' : '▶'}</div>
                  </div>
                  <div style={{minWidth:0}}>
                    <div className="n-ttl" style={{color:playing?'#818cf8':'#fff'}}>
                      {playing && <span className="now-dot"/>}{n.title}
                    </div>
                    <div className="n-art-name">{getArtist(n)}</div>
                  </div>
                  {n.language && <div className="n-lang">{n.language}</div>}
                  <div className="n-dur">{fmtDur(n.duration)}</div>
                  <button className="n-more" onClick={e => openMenu(e, n)} title="More options">⋯</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}