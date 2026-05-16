import { create } from 'zustand';
import { Nasheed } from '@/lib/types';

interface PlayerStore {
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

  // Actions
  playTrack: (track: Nasheed, queue?: Nasheed[]) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setProgress: (p: number) => void;
  setDuration: (d: number) => void;
  addToQueue: (track: Nasheed) => void;
  clearQueue: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  volume: 0.8,
  isMuted: false,
  shuffle: false,
  repeat: 'none',
  progress: 0,
  duration: 0,

  playTrack: (track, queue) => {
    const newQueue = queue ?? [track];
    const idx = newQueue.findIndex(t => t.id === track.id);
    set({
      currentTrack: track,
      queue: newQueue,
      queueIndex: idx >= 0 ? idx : 0,
      isPlaying: true,
      progress: 0,
    });
  },

  pauseTrack: () => set({ isPlaying: false }),
  resumeTrack: () => set({ isPlaying: true }),
  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),

  nextTrack: () => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (!queue.length) return;

    let nextIdx: number;
    if (repeat === 'one') {
      nextIdx = queueIndex;
    } else if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeat === 'all') nextIdx = 0;
        else { set({ isPlaying: false }); return; }
      }
    }
    set({ currentTrack: queue[nextIdx], queueIndex: nextIdx, progress: 0 });
  },

  prevTrack: () => {
    const { queue, queueIndex, progress } = get();
    if (!queue.length) return;
    // If > 3s in, restart current; else go to prev
    if (progress > 3) {
      set({ progress: 0 });
      return;
    }
    const prevIdx = Math.max(0, queueIndex - 1);
    set({ currentTrack: queue[prevIdx], queueIndex: prevIdx, progress: 0 });
  },

  setVolume: (v) => set({ volume: v, isMuted: v === 0 }),
  toggleMute: () => set(s => ({ isMuted: !s.isMuted })),
  toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),
  cycleRepeat: () => set(s => ({
    repeat: s.repeat === 'none' ? 'all' : s.repeat === 'all' ? 'one' : 'none'
  })),
  setProgress: (p) => set({ progress: p }),
  setDuration: (d) => set({ duration: d }),
  addToQueue: (track) => set(s => ({ queue: [...s.queue, track] })),
  clearQueue: () => set({ queue: [], queueIndex: 0, currentTrack: null }),
}));
