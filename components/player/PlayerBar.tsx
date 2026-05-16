'use client'

import { usePlayerStore } from '@/context/playerStore'
import AudioPlayer from '@/components/player/AudioPlayer'

export default function PlayerBar() {
  const currentTrack = usePlayerStore(s => s.currentTrack)

  if (!currentTrack) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '80px',
      background: '#0c0c1e',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      zIndex: 100,
    }}>
      <AudioPlayer />
    </div>
  )
}