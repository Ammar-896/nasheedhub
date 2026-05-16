'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Playlist = { id: string; title: string }

function HomeIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function SearchIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function LibraryIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> }
function ChevronLeft() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg> }
function ChevronRight(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg> }
function MusicIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> }
function SignOutIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
function PlusIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }

export default function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase
          .from('playlists')
          .select('id, title')
          .eq('user_id', data.user.id)
          .order('created_at', { ascending: false })
          .limit(15)
          .then(({ data: pl, error }) => {
            if (error) console.warn('Playlists:', error.message)
            setPlaylists(pl || [])
          })
      }
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const c = mounted && collapsed
  const W = c ? 68 : 248

  const navItems = [
    { href: '/',        label: 'Home',    icon: <HomeIcon /> },
    { href: '/search',  label: 'Browse',  icon: <SearchIcon /> },
    { href: '/library', label: 'Library', icon: <LibraryIcon /> },
  ]

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside style={{
      width: W,
      minWidth: W,
      height: '100vh',
      background: '#0d0d1a',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.28s cubic-bezier(.4,0,.2,1), min-width 0.28s cubic-bezier(.4,0,.2,1)',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative',
    }}>

      {/* Logo row */}
      <div style={{
        padding: c ? '20px 0' : '20px 20px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: c ? 'center' : 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        minHeight: 64,
      }}>
        {!c && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>♪</div>
            <span style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800, fontSize: 16,
              background: 'linear-gradient(135deg,#818cf8,#c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap',
            }}>NasheedHub</span>
          </div>
        )}

        {c && (
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>♪</div>
        )}

        {/* Collapse toggle — always visible */}
        {!c && (
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
              transition: 'background 0.15s, color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.2)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#818cf8'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            <ChevronLeft />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {c && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.2)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#818cf8'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            <ChevronRight />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav style={{ padding: c ? '8px 0' : '8px 12px', flex: 0 }}>
        {navItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={c ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: c ? '11px 0' : '11px 12px',
                justifyContent: c ? 'center' : 'flex-start',
                borderRadius: 10,
                marginBottom: 2,
                textDecoration: 'none',
                color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
                paddingLeft: active && !c ? 9 : undefined,
                transition: 'all 0.15s',
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {!c && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Playlists */}
      {!c && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 12px',
          marginTop: 8,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.22)',
            padding: '0 12px',
            marginBottom: 8,
          }}>Your Library</div>

          {playlists.length === 0 && user && (
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.22)',
              padding: '8px 12px',
            }}>No playlists yet</div>
          )}

          {!user && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', padding: '8px 12px' }}>
              <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none' }}>Sign in</Link> to see playlists
            </div>
          )}

          {playlists.map(pl => (
            <Link
              key={pl.id}
              href={`/library`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                color: 'rgba(255,255,255,0.42)',
                fontSize: 13,
                transition: 'all 0.12s',
                marginBottom: 2,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}
            >
              <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}><MusicIcon /></span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pl.title}
              </span>
            </Link>
          ))}

          <Link
            href="/library"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              textDecoration: 'none',
              color: 'rgba(255,255,255,0.25)',
              fontSize: 13,
              marginTop: 4,
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background='rgba(255,255,255,0.05)'; (e.currentTarget as HTMLAnchorElement).style.color='rgba(255,255,255,0.55)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background='transparent'; (e.currentTarget as HTMLAnchorElement).style.color='rgba(255,255,255,0.25)' }}
          >
            <PlusIcon />
            <span>New Playlist</span>
          </Link>
        </div>
      )}

      {/* User avatar / sign out */}
      {user && (
        <div style={{
          padding: c ? '12px 0' : '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: c ? 'center' : 'space-between',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
            </div>
            {!c && (
              <span style={{
                fontSize: 13, color: 'rgba(255,255,255,0.65)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
            )}
          </div>
          {!c && (
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)', padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center', transition: 'color 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,100,100,0.8)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'}
            >
              <SignOutIcon />
            </button>
          )}
        </div>
      )}

      {!user && (
        <div style={{
          padding: c ? '12px 0' : '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: c ? 'none' : 'block',
        }}>
          <Link href="/login" style={{
            display: 'block',
            textAlign: 'center',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff', textDecoration: 'none',
            borderRadius: 9, padding: '9px 16px',
            fontSize: 13, fontWeight: 600,
          }}>Sign In</Link>
        </div>
      )}
    </aside>
  )
}