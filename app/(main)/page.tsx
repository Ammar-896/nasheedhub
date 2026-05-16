'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlayerStore } from '@/context/playerStore'
import { Nasheed } from '@/lib/types'
import Link from 'next/link'

type NasheedRow = {
  id: string
  title: string
  audio_url: string
  duration: number
  play_count: number
  artist_id: string | null
  language: string
  cover_url: string | null
}

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#f59e0b','#ec4899','#10b981','#f97316','#3b82f6']
const fmtDur = (s: number) => s ? `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` : '—'
const fmtPlays = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n || 0)

const CATS = [
  { name:'Arabic',       emoji:'🌙', color:'#6366f1' },
  { name:'English',      emoji:'✨', color:'#8b5cf6' },
  { name:'Urdu',         emoji:'🕌', color:'#06b6d4' },
  { name:'A Cappella',   emoji:'🎵', color:'#f59e0b' },
  { name:'Children',     emoji:'⭐', color:'#10b981' },
  { name:'Devotional',   emoji:'🤲', color:'#ec4899' },
  { name:'New Releases', emoji:'🔥', color:'#f97316' },
  { name:'Top Played',   emoji:'📈', color:'#3b82f6' },
]

export default function HomePage() {
  const [nasheeds, setNasheeds] = useState<NasheedRow[]>([])
  const [artists, setArtists] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    // Use nasheed_search view — it's UNRESTRICTED (bypasses RLS)
    // This is why it shows all songs regardless of is_published status
    supabase
      .from('nasheed_search')
      .select('id, title, audio_url, duration, play_count, artist_id, language, cover_url')
      .order('play_count', { ascending: false })
      .limit(24)
      .then(async ({ data, error }) => {
        if (error) {
          console.warn('nasheed_search error, falling back to nasheeds table:', error.message)
          // Fallback: query nasheeds table without is_published filter
          const { data: d2 } = await supabase
            .from('nasheeds')
            .select('id, title, audio_url, duration, play_count, artist_id, language, cover_url')
            .order('play_count', { ascending: false })
            .limit(24)
          const rows = (d2 || []) as NasheedRow[]
          setNasheeds(rows)
          fetchArtists(rows)
        } else {
          const rows = (data || []) as NasheedRow[]
          setNasheeds(rows)
          fetchArtists(rows)
        }
        setLoading(false)
      })
  }, [])

  async function fetchArtists(rows: NasheedRow[]) {
    const ids = [...new Set(rows.map(r => r.artist_id).filter(Boolean))] as string[]
    if (!ids.length) return
    const { data } = await supabase.from('artists').select('id, name').in('id', ids)
    if (data) {
      const map: Record<string, string> = {}
      data.forEach((a: any) => { map[a.id] = a.name })
      setArtists(map)
    }
  }

  const getArtist = (n: NasheedRow) =>
    n.artist_id ? (artists[n.artist_id] ?? '…') : 'Unknown Artist'

  // Convert NasheedRow to Nasheed type for playerStore
  const toTrack = (n: NasheedRow): Nasheed => ({
    id: n.id,
    title: n.title,
    slug: n.id,
    audio_url: n.audio_url,
    cover_url: n.cover_url ?? undefined,
    duration: n.duration,
    play_count: n.play_count,
    like_count: 0,
    language: n.language,
    is_published: true,
    created_at: '',
    artist_id: n.artist_id ?? undefined,
    artist_name: getArtist(n),
  })

  function handlePlay(n: NasheedRow, queue: NasheedRow[]) {
    if (!n.audio_url) return
    if (currentTrack?.id === n.id) {
      togglePlay()
      return
    }
    playTrack(toTrack(n), queue.filter(r => r.audio_url).map(toTrack))
  }

  const featured  = nasheeds.slice(0, 6)
  const trending  = nasheeds.slice(0, 10)
  const moreToExp = nasheeds.slice(10, 18)

  return (
    <>
      <style suppressHydrationWarning>{`
        .hp { font-family:'DM Sans',sans-serif; color:#fff; }
        .hp-hero { position:relative; padding:60px 48px 72px; overflow:hidden; }
        .hp-hero-bg {
          position:absolute; inset:0; pointer-events:none;
          background:
            radial-gradient(ellipse 65% 75% at -5% 50%, rgba(99,102,241,.2) 0%, transparent 60%),
            radial-gradient(ellipse 50% 55% at 105% 25%, rgba(139,92,246,.17) 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 55% 100%, rgba(245,158,11,.09) 0%, transparent 50%);
        }
        .hp-eyebrow { display:inline-flex; align-items:center; gap:8px; background:rgba(99,102,241,.11); border:1px solid rgba(99,102,241,.24); border-radius:100px; padding:6px 14px; font-size:11px; font-weight:500; color:#818cf8; letter-spacing:.09em; text-transform:uppercase; margin-bottom:22px; position:relative; z-index:1; }
        .hp-eyebrow::before { content:''; width:6px; height:6px; border-radius:50%; background:#6366f1; animation:blink 2s ease-in-out infinite; display:inline-block; }
        @keyframes blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
        .hp-title { font-family:'Syne',sans-serif; font-size:clamp(32px,4.5vw,60px); font-weight:800; line-height:1.06; letter-spacing:-.04em; color:#fff; margin-bottom:18px; position:relative; z-index:1; }
        .hp-title span { background:linear-gradient(135deg,#818cf8 0%,#c084fc 45%,#f59e0b 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .hp-sub { font-size:16px; color:rgba(255,255,255,.42); line-height:1.68; max-width:460px; margin-bottom:34px; position:relative; z-index:1; }
        .hp-actions { display:flex; gap:12px; align-items:center; position:relative; z-index:1; flex-wrap:wrap; }
        .hp-cta { background:linear-gradient(135deg,#6366f1,#8b5cf6); border:none; border-radius:11px; padding:13px 26px; font-family:'Syne',sans-serif; font-size:14px; font-weight:700; color:#fff; text-decoration:none; display:inline-block; transition:transform .15s,box-shadow .15s; box-shadow:0 0 28px rgba(99,102,241,.28); cursor:pointer; }
        .hp-cta:hover { transform:translateY(-2px); box-shadow:0 8px 36px rgba(99,102,241,.38); }
        .hp-ghost { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:11px; padding:13px 26px; font-family:'Syne',sans-serif; font-size:14px; font-weight:600; color:rgba(255,255,255,.65); text-decoration:none; display:inline-block; transition:background .15s,color .15s; }
        .hp-ghost:hover { background:rgba(255,255,255,.09); color:#fff; }
        .sec { padding:0 48px 52px; }
        .sec-hd { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:22px; }
        .sec-title { font-family:'Syne',sans-serif; font-size:19px; font-weight:700; letter-spacing:-.02em; }
        .sec-more { font-size:13px; color:rgba(255,255,255,.3); text-decoration:none; transition:color .2s; }
        .sec-more:hover { color:#818cf8; }
        .card-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(165px,1fr)); gap:14px; }
        .n-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06); border-radius:15px; overflow:hidden; cursor:pointer; transition:background .2s,transform .2s,border-color .2s; }
        .n-card:hover { background:rgba(255,255,255,.07); transform:translateY(-3px); border-color:rgba(99,102,241,.25); }
        .n-art { width:100%; aspect-ratio:1; display:flex; align-items:center; justify-content:center; font-size:44px; position:relative; overflow:hidden; }
        .n-overlay { position:absolute; inset:0; background:rgba(0,0,0,.38); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .2s; }
        .n-card:hover .n-overlay { opacity:1; }
        .n-play { width:48px; height:48px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#000; transform:scale(.82); transition:transform .15s; box-shadow:0 4px 18px rgba(0,0,0,.4); }
        .n-card:hover .n-play { transform:scale(1); }
        .n-info { padding:13px 15px 15px; }
        .n-title { font-family:'Syne',sans-serif; font-size:13px; font-weight:700; color:#fff; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .n-artist { font-size:12px; color:rgba(255,255,255,.38); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tr-list { display:flex; flex-direction:column; gap:2px; }
        .tr-row { display:grid; grid-template-columns:28px 50px 1fr auto auto; align-items:center; gap:14px; padding:9px 12px; border-radius:11px; cursor:pointer; transition:background .15s; }
        .tr-row:hover { background:rgba(255,255,255,.05); }
        .tr-num { font-size:13px; color:rgba(255,255,255,.22); text-align:center; }
        .tr-row:hover .tr-num { visibility:hidden; }
        .tr-thumb { width:50px; height:50px; border-radius:9px; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:22px; position:relative; }
        .tr-play-abs { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.45); opacity:0; transition:opacity .15s; border-radius:9px; font-size:16px; }
        .tr-row:hover .tr-play-abs { opacity:1; }
        .tr-name { font-size:14px; font-weight:500; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tr-artist { font-size:12px; color:rgba(255,255,255,.36); margin-top:2px; }
        .tr-plays { font-size:12px; color:rgba(255,255,255,.22); white-space:nowrap; }
        .tr-dur { font-size:13px; color:rgba(255,255,255,.28); white-space:nowrap; }
        .cat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(148px,1fr)); gap:11px; }
        .cat-card { border-radius:13px; padding:22px 18px; position:relative; overflow:hidden; cursor:pointer; text-decoration:none; display:block; transition:transform .2s,filter .2s; }
        .cat-card:hover { transform:scale(1.04); filter:brightness(1.1); }
        .cat-name { font-family:'Syne',sans-serif; font-size:15px; font-weight:700; color:#fff; position:relative; z-index:1; }
        .cat-emoji { position:absolute; bottom:-4px; right:8px; font-size:50px; opacity:.55; transform:rotate(10deg); }
        .shimmer { background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%); background-size:200% 100%; animation:sh 1.5s infinite; border-radius:13px; }
        @keyframes sh { 0%{background-position:200% 0}100%{background-position:-200% 0} }
        .hp-empty { text-align:center; padding:80px 40px; }
        .hp-empty-icon { font-size:52px; opacity:.35; margin-bottom:18px; }
        .hp-empty-title { font-family:'Syne',sans-serif; font-size:22px; font-weight:700; color:rgba(255,255,255,.5); margin-bottom:8px; }
        .hp-empty-sub { font-size:14px; color:rgba(255,255,255,.25); line-height:1.6; max-width:320px; margin:0 auto 8px; }
        .now-playing-indicator { display:inline-block; width:8px; height:8px; border-radius:50%; background:#6366f1; animation:pulse 1s ease-in-out infinite; margin-right:6px; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.7)} }
        @media(max-width:900px) {
          .hp-hero,.sec{padding-left:20px;padding-right:20px;}
          .hp-hero{padding-top:40px;padding-bottom:50px;}
        }
        @media(max-width:600px) {
          .card-grid{grid-template-columns:repeat(2,1fr);}
          .cat-grid{grid-template-columns:repeat(2,1fr);}
          .tr-row{grid-template-columns:28px 40px 1fr auto;}
          .tr-plays{display:none;}
        }
      `}</style>

      <div className="hp">
        {/* Hero */}
        <section className="hp-hero">
          <div className="hp-hero-bg" />
          <div className="hp-eyebrow">Now streaming</div>
          <h1 className="hp-title">Your favourite<br /><span>nasheeds.</span></h1>
          <p className="hp-sub">Vocals-only and instrumental nasheeds from artists around the world.</p>
          <div className="hp-actions">
            {user
              ? <Link href="/search" className="hp-cta">Browse Library</Link>
              : <Link href="/signup" className="hp-cta">Get Started — Free</Link>}
            <Link href="/search" className="hp-ghost">Explore</Link>
          </div>
        </section>

        {loading ? (
          <section className="sec">
            <div className="card-grid">
              {Array(6).fill(0).map((_,i) => <div key={i} className="shimmer" style={{height:250}}/>)}
            </div>
          </section>
        ) : nasheeds.length === 0 ? (
          <section className="sec">
            <div className="hp-empty">
              <div className="hp-empty-icon">♪</div>
              <div className="hp-empty-title">Library is empty</div>
              <p className="hp-empty-sub">Run the scraper to import nasheeds, or add them via Supabase.</p>
              <Link href="/search" className="hp-ghost" style={{display:'inline-block',marginTop:8}}>Explore →</Link>
            </div>
          </section>
        ) : (
          <>
            {/* Featured */}
            <section className="sec">
              <div className="sec-hd">
                <h2 className="sec-title">Featured</h2>
                <Link href="/search" className="sec-more">See all →</Link>
              </div>
              <div className="card-grid">
                {featured.map((n, i) => {
                  const playing = currentTrack?.id === n.id && isPlaying
                  return (
                    <div
                      key={n.id}
                      className="n-card"
                      onClick={() => handlePlay(n, featured)}
                    >
                      <div className="n-art" style={{background:`linear-gradient(135deg,${COLORS[i%COLORS.length]}38,${COLORS[(i+2)%COLORS.length]}22)`}}>
                        <span style={{fontSize:44, opacity:.75}}>♪</span>
                        <div className="n-overlay">
                          <div className="n-play" style={{fontSize:18}}>
                            {playing ? '⏸' : '▶'}
                          </div>
                        </div>
                      </div>
                      <div className="n-info">
                        <div className="n-title">
                          {playing && <span className="now-playing-indicator"/>}
                          {n.title}
                        </div>
                        <div className="n-artist">{getArtist(n)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Trending */}
            <section className="sec">
              <div className="sec-hd">
                <h2 className="sec-title">Trending</h2>
                <Link href="/search" className="sec-more">See all →</Link>
              </div>
              <div className="tr-list">
                {trending.map((n, i) => {
                  const playing = currentTrack?.id === n.id && isPlaying
                  return (
                    <div
                      key={n.id}
                      className="tr-row"
                      onClick={() => handlePlay(n, trending)}
                    >
                      <div className="tr-num">
                        {playing ? <span className="now-playing-indicator" style={{marginRight:0}}/> : i+1}
                      </div>
                      <div className="tr-thumb" style={{background:`linear-gradient(135deg,${COLORS[i%COLORS.length]}44,${COLORS[(i+3)%COLORS.length]}22)`}}>
                        ♪
                        <div className="tr-play-abs">{playing ? '⏸' : '▶'}</div>
                      </div>
                      <div style={{minWidth:0}}>
                        <div className="tr-name" style={{color: playing ? '#818cf8' : '#fff'}}>{n.title}</div>
                        <div className="tr-artist">{getArtist(n)}</div>
                      </div>
                      <div className="tr-plays">{fmtPlays(n.play_count)} plays</div>
                      <div className="tr-dur">{fmtDur(n.duration)}</div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Browse categories */}
            <section className="sec">
              <div className="sec-hd"><h2 className="sec-title">Browse</h2></div>
              <div className="cat-grid">
                {CATS.map(cat => (
                  <Link
                    key={cat.name}
                    href={`/search?genre=${encodeURIComponent(cat.name.toLowerCase())}`}
                    className="cat-card"
                    style={{background:`linear-gradient(135deg,${cat.color}cc,${cat.color}66)`}}
                  >
                    <div className="cat-name">{cat.name}</div>
                    <div className="cat-emoji">{cat.emoji}</div>
                  </Link>
                ))}
              </div>
            </section>

            {/* More to explore */}
            {moreToExp.length > 0 && (
              <section className="sec">
                <div className="sec-hd">
                  <h2 className="sec-title">More to explore</h2>
                  <Link href="/search" className="sec-more">See all →</Link>
                </div>
                <div className="card-grid">
                  {moreToExp.map((n, i) => {
                    const playing = currentTrack?.id === n.id && isPlaying
                    return (
                      <div
                        key={n.id}
                        className="n-card"
                        onClick={() => handlePlay(n, moreToExp)}
                      >
                        <div className="n-art" style={{background:`linear-gradient(135deg,${COLORS[(i+4)%COLORS.length]}38,${COLORS[(i+6)%COLORS.length]}22)`}}>
                          <span style={{fontSize:44, opacity:.75}}>♪</span>
                          <div className="n-overlay">
                            <div className="n-play" style={{fontSize:18}}>
                              {playing ? '⏸' : '▶'}
                            </div>
                          </div>
                        </div>
                        <div className="n-info">
                          <div className="n-title">
                            {playing && <span className="now-playing-indicator"/>}
                            {n.title}
                          </div>
                          <div className="n-artist">{getArtist(n)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}