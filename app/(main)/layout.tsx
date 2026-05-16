import Sidebar from '@/components/ui/Sidebar'
import PlayerBar from '@/components/player/PlayerBar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#06060e',
      overflow: 'hidden',
    }}>
      <Sidebar />

      <main style={{
        flex: 1,
        overflowY: 'auto',
        minWidth: 0,
        paddingBottom: '90px',
      }}>
        {children}
      </main>

      {/* Only renders when a track is loaded */}
      <PlayerBar />
    </div>
  )
}