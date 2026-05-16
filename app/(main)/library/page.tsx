'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlayerStore } from '@/context/playerStore'
import { Nasheed } from '@/lib/types'
import { useRouter } from 'next/navigation'

type Playlist = { id: string; title: string; track_count: number; created_at: string }
type PlaylistTrack = {
  id: string; position: number
  nasheeds: { id: string; title: string; duration: number; audio_url: string; artist_id: string | null; cover_url: string | null }
}
type LikedRow = {
  nasheed_id: string
  nasheeds: { id: string; title: string; duration: number; audio_url: string; artist_id: string | null; cover_url: string | null }
}

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#f59e0b','#ec4899','#10b981','#f97316','#3b82f6']
const fmtDur = (s: number) => s ? `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` : '—'

export default function LibraryPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [user, setUser]                 = useState<any>(null)
  const [tab, setTab]                   = useState<'playlists'|'liked'>('playlists')
  const [playlists, setPlaylists]       = useState<Playlist[]>([])
  const [liked, setLiked]               = useState<LikedRow[]>([])
  const [artists, setArtists]           = useState<Record<string,string>>({})
  const [loading, setLoading]           = useState(true)
  // Playlist creation
  const [creating, setCreating]         = useState(false)
  const [newName, setNewName]           = useState('')
  // Open playlist view
  const [openPlaylist, setOpenPlaylist] = useState<Playlist|null>(null)
  const [plTracks, setPlTracks]         = useState<PlaylistTrack[]>([])
  const [plLoading, setPlLoading]       = useState(false)
  // Edit playlist name
  const [editingId, setEditingId]       = useState<string|null>(null)
  const [editName, setEditName]         = useState('')
  // Toast
  const [toast, setToast]               = useState<string|null>(null)

  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore()

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      loadAll(data.user.id)
    })
  }, [])

  async function loadAll(uid: string) {
    const [{ data: pl }, { data: lk }] = await Promise.all([
      supabase.from('playlists').select('id, title, track_count, created_at')
        .eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('liked_songs')
        .select('nasheed_id, nasheeds(id, title, duration, audio_url, artist_id, cover_url)')
        .eq('user_id', uid).order('liked_at', { ascending: false }).limit(100),
    ])
    setPlaylists((pl || []) as Playlist[])
    const rows = (lk || []) as LikedRow[]
    setLiked(rows)
    setLoading(false)
    fetchArtistsFromRows([
      ...rows.map(r => r.nasheeds?.artist_id),
    ])
  }

  async function fetchArtistsFromRows(ids: (string|null|undefined)[]) {
    const unique = [...new Set(ids.filter(Boolean))] as string[]
    if (!unique.length) return
    const { data } = await supabase.from('artists').select('id, name').in('id', unique)
    if (data) {
      const map: Record<string,string> = {}
      data.forEach((a: any) => { map[a.id] = a.name })
      setArtists(prev => ({ ...prev, ...map }))
    }
  }

  async function openPlaylistView(pl: Playlist) {
    setOpenPlaylist(pl)
    setPlLoading(true)

    // Step 1: get row ids + nasheed_ids (no RLS issues)
    const { data: ptRows, error } = await supabase
      .from('playlist_tracks')
      .select('id, position, nasheed_id')
      .eq('playlist_id', pl.id)
      .order('position', { ascending: true })

    if (error) console.warn('playlist_tracks:', error.message)
    if (!ptRows || ptRows.length === 0) { setPlTracks([]); setPlLoading(false); return }

    // Step 2: fetch from nasheed_search (UNRESTRICTED - bypasses RLS)
    const ids = ptRows.map((r: any) => r.nasheed_id)
    const { data: songs } = await supabase
      .from('nasheed_search')
      .select('id, title, duration, audio_url, artist_id, cover_url')
      .in('id', ids)

    const songMap: Record<string, any> = {}
    ;(songs || []).forEach((s: any) => { songMap[s.id] = s })

    const tracks: PlaylistTrack[] = ptRows
      .map((r: any) => ({ id: r.id, position: r.position, nasheeds: songMap[r.nasheed_id] ?? null }))
      .filter((t: any) => t.nasheeds)

    setPlTracks(tracks)
    setPlLoading(false)
    fetchArtistsFromRows(tracks.map(t => t.nasheeds?.artist_id))
  }

  async function createPlaylist() {
    if (!newName.trim() || !user) return
    const { data, error } = await supabase
      .from('playlists').insert({ title: newName.trim(), user_id: user.id }).select().single()
    if (data) setPlaylists(p => [data as Playlist, ...p])
    if (error) showToast('⚠ Could not create playlist')
    setNewName(''); setCreating(false)
  }

  async function saveEditName(id: string) {
    if (!editName.trim()) return
    const { error } = await supabase.from('playlists').update({ title: editName.trim() }).eq('id', id)
    if (!error) setPlaylists(p => p.map(pl => pl.id === id ? { ...pl, title: editName.trim() } : pl))
    if (openPlaylist?.id === id) setOpenPlaylist(prev => prev ? { ...prev, title: editName.trim() } : null)
    setEditingId(null)
    showToast(error ? '⚠ Could not rename' : '✓ Playlist renamed')
  }

  async function deletePlaylist(id: string) {
    if (!confirm('Delete this playlist?')) return
    const { error } = await supabase.from('playlists').delete().eq('id', id)
    if (!error) {
      setPlaylists(p => p.filter(pl => pl.id !== id))
      if (openPlaylist?.id === id) setOpenPlaylist(null)
    }
    showToast(error ? '⚠ Could not delete' : '✓ Playlist deleted')
  }

  async function removeFromPlaylist(trackRowId: string) {
    const { error } = await supabase.from('playlist_tracks').delete().eq('id', trackRowId)
    if (!error) setPlTracks(t => t.filter(r => r.id !== trackRowId))
    showToast(error ? '⚠ Error removing track' : '✓ Removed from playlist')
  }

  async function unlikeSong(nasheedId: string) {
    if (!user) return
    const { error } = await supabase.from('liked_songs')
      .delete().eq('user_id', user.id).eq('nasheed_id', nasheedId)
    if (!error) setLiked(l => l.filter(r => r.nasheed_id !== nasheedId))
    showToast(error ? '⚠ Error' : '✓ Removed from Liked Songs')
  }

  const getArtist = (artistId: string|null) =>
    artistId ? (artists[artistId] ?? '…') : 'Unknown'

  function playFromPlaylist(track: PlaylistTrack) {
    const n = track.nasheeds
    if (!n?.audio_url) return
    if (currentTrack?.id === n.id) { togglePlay(); return }
    const queue = plTracks.filter(t => t.nasheeds?.audio_url).map(t => ({
      id: t.nasheeds.id, title: t.nasheeds.title, slug: t.nasheeds.id,
      audio_url: t.nasheeds.audio_url, cover_url: t.nasheeds.cover_url ?? undefined,
      duration: t.nasheeds.duration, play_count: 0, like_count: 0,
      language: '', is_published: true, created_at: '',
      artist_id: t.nasheeds.artist_id ?? undefined,
      artist_name: getArtist(t.nasheeds.artist_id),
    } as Nasheed))
    playTrack({
      id: n.id, title: n.title, slug: n.id, audio_url: n.audio_url,
      cover_url: n.cover_url ?? undefined, duration: n.duration,
      play_count: 0, like_count: 0, language: '', is_published: true, created_at: '',
      artist_id: n.artist_id ?? undefined, artist_name: getArtist(n.artist_id),
    }, queue)
  }

  function playFromLiked(row: LikedRow) {
    const n = row.nasheeds
    if (!n?.audio_url) return
    if (currentTrack?.id === n.id) { togglePlay(); return }
    const queue = liked.filter(r => r.nasheeds?.audio_url).map(r => ({
      id: r.nasheeds.id, title: r.nasheeds.title, slug: r.nasheeds.id,
      audio_url: r.nasheeds.audio_url, cover_url: r.nasheeds.cover_url ?? undefined,
      duration: r.nasheeds.duration, play_count: 0, like_count: 0,
      language: '', is_published: true, created_at: '',
      artist_id: r.nasheeds.artist_id ?? undefined, artist_name: getArtist(r.nasheeds.artist_id),
    } as Nasheed))
    playTrack({
      id: n.id, title: n.title, slug: n.id, audio_url: n.audio_url,
      cover_url: n.cover_url ?? undefined, duration: n.duration,
      play_count: 0, like_count: 0, language: '', is_published: true, created_at: '',
      artist_id: n.artist_id ?? undefined, artist_name: getArtist(n.artist_id),
    }, queue)
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        .lib{font-family:'DM Sans',sans-serif;color:#fff;padding:36px 48px 88px;}
        .lib-hd{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:28px;}
        .lib-title{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;letter-spacing:-.03em;}
        .lib-tabs{display:flex;gap:3px;background:rgba(255,255,255,.05);border-radius:12px;padding:4px;}
        .lt{padding:9px 20px;border-radius:9px;border:none;background:transparent;color:rgba(255,255,255,.45);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap;}
        .lt.on{background:rgba(99,102,241,.18);color:#818cf8;}
        .lt:hover:not(.on){background:rgba(255,255,255,.06);color:rgba(255,255,255,.7);}
        .new-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:11px;padding:10px 18px;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:#fff;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:7px;}
        .new-btn:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(99,102,241,.3);}
        .new-form{display:flex;gap:10px;margin-bottom:22px;flex-wrap:wrap;}
        .new-inp{background:rgba(255,255,255,.07);border:1px solid rgba(99,102,241,.3);border-radius:11px;padding:10px 15px;color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;flex:1;min-width:180px;}
        .new-inp::placeholder{color:rgba(255,255,255,.25);}
        .pl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;}
        .pl-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:15px;overflow:hidden;cursor:pointer;transition:all .2s;position:relative;}
        .pl-card:hover{background:rgba(255,255,255,.07);transform:translateY(-3px);border-color:rgba(99,102,241,.22);}
        .pl-art{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:36px;}
        .pl-info{padding:12px 14px;}
        .pl-name{font-family:'Syne',sans-serif;font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;}
        .pl-count{font-size:12px;color:rgba(255,255,255,.32);}
        .pl-actions{position:absolute;top:8px;right:8px;display:flex;gap:5px;opacity:0;transition:opacity .15s;}
        .pl-card:hover .pl-actions{opacity:1;}
        .pl-act-btn{background:rgba(0,0,0,.55);border:none;border-radius:7px;padding:5px 7px;cursor:pointer;color:rgba(255,255,255,.7);font-size:13px;line-height:1;transition:background .12s,color .12s;}
        .pl-act-btn:hover{background:rgba(99,102,241,.4);color:#fff;}
        .pl-act-btn.del:hover{background:rgba(239,68,68,.4);color:#fca5a5;}
        .edit-inp{background:rgba(255,255,255,.1);border:1px solid rgba(99,102,241,.4);border-radius:8px;padding:5px 10px;color:#fff;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;outline:none;width:100%;}
        .back-btn{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:8px 16px;color:rgba(255,255,255,.65);font-size:13px;cursor:pointer;transition:all .15s;margin-bottom:22px;font-family:'DM Sans',sans-serif;}
        .back-btn:hover{background:rgba(255,255,255,.1);color:#fff;}
        .sec-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
        .sec-ttl{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;}
        .play-all{background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:9px;padding:8px 18px;font-size:13px;font-weight:700;color:#fff;cursor:pointer;display:flex;align-items:center;gap:7px;transition:all .15s;}
        .play-all:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(99,102,241,.3);}
        .tk-list{display:flex;flex-direction:column;gap:2px;}
        .tk-row{display:grid;grid-template-columns:32px 44px 1fr auto auto;align-items:center;gap:12px;padding:9px 10px;border-radius:11px;cursor:pointer;transition:background .12s;}
        .tk-row:hover{background:rgba(255,255,255,.05);}
        .tk-num{font-size:12px;color:rgba(255,255,255,.22);text-align:center;}
        .tk-art{width:44px;height:44px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;position:relative;flex-shrink:0;}
        .tk-pov{position:absolute;inset:0;background:rgba(0,0,0,.4);border-radius:9px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;font-size:14px;}
        .tk-row:hover .tk-pov{opacity:1;}
        .tk-ttl{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .tk-artist{font-size:12px;color:rgba(255,255,255,.36);margin-top:2px;}
        .tk-dur{font-size:12px;color:rgba(255,255,255,.28);white-space:nowrap;}
        .tk-rm{background:none;border:none;color:rgba(255,255,255,.25);cursor:pointer;padding:5px 7px;border-radius:7px;font-size:15px;opacity:0;transition:opacity .15s,background .12s,color .12s;}
        .tk-row:hover .tk-rm{opacity:1;}
        .tk-rm:hover{background:rgba(239,68,68,.12);color:#f87171;}
        .lk-list{display:flex;flex-direction:column;gap:2px;}
        .lk-row{display:grid;grid-template-columns:44px 1fr auto auto;align-items:center;gap:12px;padding:9px 10px;border-radius:11px;cursor:pointer;transition:background .12s;}
        .lk-row:hover{background:rgba(255,255,255,.05);}
        .lk-art{width:44px;height:44px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;position:relative;flex-shrink:0;}
        .lk-pov{position:absolute;inset:0;background:rgba(0,0,0,.4);border-radius:9px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;font-size:14px;}
        .lk-row:hover .lk-pov{opacity:1;}
        .lk-ttl{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .lk-artist{font-size:12px;color:rgba(255,255,255,.36);margin-top:2px;}
        .lk-dur{font-size:12px;color:rgba(255,255,255,.28);white-space:nowrap;}
        .lk-un{background:none;border:none;color:rgba(255,255,255,.25);cursor:pointer;padding:5px 7px;border-radius:7px;font-size:15px;opacity:0;transition:opacity .15s,color .12s,background .12s;}
        .lk-row:hover .lk-un{opacity:1;}
        .lk-un:hover{background:rgba(239,68,68,.12);color:#f87171;}
        .empty{text-align:center;padding:60px 0;}
        .empty-icon{font-size:44px;opacity:.28;margin-bottom:14px;}
        .empty-txt{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:rgba(255,255,255,.4);}
        .empty-sub{font-size:13px;color:rgba(255,255,255,.22);margin-top:6px;}
        .shim{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:sh 1.5s infinite;border-radius:11px;}
        @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .toast{position:fixed;bottom:92px;left:50%;transform:translateX(-50%);background:#1c1c30;border:1px solid rgba(99,102,241,.35);color:#fff;padding:10px 22px;border-radius:100px;font-size:13px;z-index:10000;box-shadow:0 8px 32px rgba(0,0,0,.5);white-space:nowrap;animation:tin .2s ease;}
        @keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .now-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#818cf8;animation:pulse 1s ease-in-out infinite;margin-right:5px;}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.7)}}
        @media(max-width:900px){.lib{padding:28px 18px 88px;}}
        @media(max-width:600px){.pl-grid{grid-template-columns:repeat(2,1fr);}.tk-row{grid-template-columns:40px 1fr auto;}.tk-num,.tk-dur{display:none;}.lk-row{grid-template-columns:40px 1fr auto;}.lk-dur{display:none;}}
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      <div className="lib">

        {/* ── Playlist detail view ── */}
        {openPlaylist ? (
          <>
            <button className="back-btn" onClick={() => setOpenPlaylist(null)}>
              ← Back to Library
            </button>

            <div className="sec-hd">
              {editingId === openPlaylist.id ? (
                <input
                  className="edit-inp"
                  style={{ fontSize:18, maxWidth:320 }}
                  value={editName}
                  autoFocus
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => saveEditName(openPlaylist.id)}
                  onKeyDown={e => e.key === 'Enter' && saveEditName(openPlaylist.id)}
                />
              ) : (
                <h2 className="sec-ttl">{openPlaylist.title}</h2>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <button className="pl-act-btn" style={{ background:'rgba(255,255,255,.08)', opacity:1 }}
                  onClick={() => { setEditingId(openPlaylist.id); setEditName(openPlaylist.title) }}
                  title="Rename playlist">✎</button>
                <button className="pl-act-btn del" style={{ background:'rgba(255,255,255,.06)', opacity:1 }}
                  onClick={() => deletePlaylist(openPlaylist.id)} title="Delete playlist">🗑</button>
                {plTracks.length > 0 && (
                  <button className="play-all" onClick={() => plTracks[0] && playFromPlaylist(plTracks[0])}>
                    ▶ Play all
                  </button>
                )}
              </div>
            </div>

            {plLoading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {Array(5).fill(0).map((_,i) => <div key={i} className="shim" style={{ height:54 }}/>)}
              </div>
            ) : plTracks.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">♪</div>
                <div className="empty-txt">Playlist is empty</div>
                <div className="empty-sub">Add songs from Browse</div>
              </div>
            ) : (
              <div className="tk-list">
                {plTracks.map((t, i) => {
                  const n = t.nasheeds
                  if (!n) return null
                  const playing = currentTrack?.id === n.id && isPlaying
                  return (
                    <div key={t.id} className="tk-row" onClick={() => playFromPlaylist(t)}>
                      <div className="tk-num">{playing ? <span className="now-dot" style={{margin:0}}/> : i+1}</div>
                      <div className="tk-art" style={{ background:`linear-gradient(135deg,${COLORS[i%COLORS.length]}44,${COLORS[(i+3)%COLORS.length]}22)` }}>
                        ♪ <div className="tk-pov">{playing ? '⏸' : '▶'}</div>
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div className="tk-ttl" style={{ color: playing ? '#818cf8' : '#fff' }}>
                          {playing && <span className="now-dot"/>}{n.title}
                        </div>
                        <div className="tk-artist">{getArtist(n.artist_id)}</div>
                      </div>
                      <div className="tk-dur">{fmtDur(n.duration)}</div>
                      <button
                        className="tk-rm"
                        onClick={e => { e.stopPropagation(); removeFromPlaylist(t.id) }}
                        title="Remove from playlist"
                      >✕</button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          /* ── Main library view ── */
          <>
            <div className="lib-hd">
              <h1 className="lib-title">Library</h1>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                <div className="lib-tabs">
                  <button className={`lt ${tab==='playlists'?'on':''}`} onClick={() => setTab('playlists')}>
                    Playlists ({playlists.length})
                  </button>
                  <button className={`lt ${tab==='liked'?'on':''}`} onClick={() => setTab('liked')}>
                    ♥ Liked ({liked.length})
                  </button>
                </div>
                {tab==='playlists' && (
                  <button className="new-btn" onClick={() => setCreating(!creating)}>
                    + New Playlist
                  </button>
                )}
              </div>
            </div>

            {creating && (
              <div className="new-form">
                <input
                  className="new-inp"
                  placeholder="Playlist name…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && createPlaylist()}
                  autoFocus
                />
                <button className="new-btn" onClick={createPlaylist} disabled={!newName.trim()}>Create</button>
                <button onClick={() => { setCreating(false); setNewName('') }}
                  style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:11, padding:'10px 16px', color:'rgba(255,255,255,.5)', cursor:'pointer', fontSize:13 }}>
                  Cancel
                </button>
              </div>
            )}

            {loading ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14 }}>
                {Array(6).fill(0).map((_,i) => <div key={i} className="shim" style={{ height:230 }}/>)}
              </div>
            ) : tab==='playlists' ? (
              playlists.length===0 ? (
                <div className="empty">
                  <div className="empty-icon">♪</div>
                  <div className="empty-txt">No playlists yet</div>
                  <div className="empty-sub">Create one above and add songs from Browse</div>
                </div>
              ) : (
                <div className="pl-grid">
                  {playlists.map((pl, i) => (
                    <div key={pl.id} className="pl-card" onClick={() => openPlaylistView(pl)}>
                      <div className="pl-art" style={{ background:`linear-gradient(135deg,${COLORS[i%COLORS.length]}44,${COLORS[(i+2)%COLORS.length]}22)` }}>
                        ♪
                      </div>
                      <div className="pl-info">
                        {editingId===pl.id ? (
                          <input
                            className="edit-inp"
                            value={editName}
                            autoFocus
                            onClick={e => e.stopPropagation()}
                            onChange={e => setEditName(e.target.value)}
                            onBlur={() => saveEditName(pl.id)}
                            onKeyDown={e => e.key==='Enter' && saveEditName(pl.id)}
                          />
                        ) : (
                          <div className="pl-name">{pl.title}</div>
                        )}
                        <div className="pl-count">{pl.track_count ?? 0} tracks</div>
                      </div>
                      <div className="pl-actions" onClick={e => e.stopPropagation()}>
                        <button className="pl-act-btn"
                          onClick={() => { setEditingId(pl.id); setEditName(pl.title) }}
                          title="Rename">✎</button>
                        <button className="pl-act-btn del"
                          onClick={() => deletePlaylist(pl.id)}
                          title="Delete">🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Liked songs */
              liked.length===0 ? (
                <div className="empty">
                  <div className="empty-icon">♥</div>
                  <div className="empty-txt">No liked songs yet</div>
                  <div className="empty-sub">Tap ⋯ on any track in Browse to like it</div>
                </div>
              ) : (
                <div className="lk-list">
                  {liked.map((row, i) => {
                    const n = row.nasheeds
                    if (!n) return null
                    const playing = currentTrack?.id === n.id && isPlaying
                    return (
                      <div key={row.nasheed_id} className="lk-row" onClick={() => playFromLiked(row)}>
                        <div className="lk-art" style={{ background:`linear-gradient(135deg,${COLORS[i%COLORS.length]}44,${COLORS[(i+3)%COLORS.length]}22)` }}>
                          ♪ <div className="lk-pov">{playing ? '⏸' : '▶'}</div>
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div className="lk-ttl" style={{ color: playing ? '#818cf8' : '#fff' }}>
                            {playing && <span className="now-dot"/>}{n.title}
                          </div>
                          <div className="lk-artist">{getArtist(n.artist_id)}</div>
                        </div>
                        <div className="lk-dur">{fmtDur(n.duration)}</div>
                        <button
                          className="lk-un"
                          onClick={e => { e.stopPropagation(); unlikeSong(n.id) }}
                          title="Unlike">♥</button>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </>
  )
}