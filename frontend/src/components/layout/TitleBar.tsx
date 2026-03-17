import { Minus, Square, X, Dumbbell, Menu } from 'lucide-react'
import { WindowMinimise, WindowToggleMaximise, Quit } from '../../lib/events'
import { useUIStore } from '../../store/useUIStore'

export default function TitleBar() {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()

  return (
    <div className="flex items-center justify-between h-9 bg-sidebar border-b border-sidebar-border select-none flex-shrink-0 drag-region">
      <div className="flex items-center gap-2 px-3 no-drag">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="md:hidden p-1 rounded-md text-fg-muted hover:text-fg-primary hover:bg-surface-3 transition-colors"
          aria-label={mobileSidebarOpen ? 'Đóng menu' : 'Mở menu'}
        >
          <Menu className="w-4 h-4" />
        </button>

        <Dumbbell className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-fg-primary tracking-wide">Fitness Library</span>
        <span className="text-xs text-fg-muted ml-0.5">by Vũ Hải</span>
      </div>

      <div className="flex items-center h-full no-drag">
        <button
          onClick={WindowMinimise}
          aria-label="Thu nhỏ"
          className="flex items-center justify-center w-11 h-full text-fg-muted hover:text-fg-primary hover:bg-surface-3 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={WindowToggleMaximise}
          aria-label="Phóng to / Thu nhỏ"
          className="flex items-center justify-center w-11 h-full text-fg-muted hover:text-fg-primary hover:bg-surface-3 transition-colors"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={Quit}
          aria-label="Đóng ứng dụng"
          className="flex items-center justify-center w-11 h-full text-fg-muted hover:text-white hover:bg-danger transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
