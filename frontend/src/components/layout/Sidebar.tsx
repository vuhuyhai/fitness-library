import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Library, FilePlus, Upload, Settings,
  Wifi, WifiOff, User, Sun, Moon,
} from 'lucide-react'
import { api } from '../../lib/wailsApi'
import { useLibraryStore } from '../../store/useLibraryStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useTheme } from '../../contexts/ThemeContext'
import { useUIStore } from '../../store/useUIStore'

const NAV_LINKS = [
  { to: '/',         label: 'Dashboard',       Icon: LayoutDashboard },
  { to: '/library',  label: 'Thư Viện',        Icon: Library         },
  { to: '/add',      label: 'Thêm Tài Liệu',  Icon: FilePlus        },
  { to: '/import',   label: 'Nhập Hàng Loạt', Icon: Upload          },
  { to: '/settings', label: 'Cài Đặt',        Icon: Settings        },
]

export default function Sidebar() {
  const { setCategories } = useLibraryStore()
  const { aiStatus, settings } = useSettingsStore()
  const { theme, toggle } = useTheme()
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error)
  }, [])

  const hasApiKey = !!(settings['ai.api_key'])

  return (
    <aside
      role="navigation"
      aria-label="Menu chính"
      className={[
        'bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0 overflow-hidden',
        'transition-all duration-200',
        // Mobile: fixed overlay
        'fixed inset-y-0 left-0 z-50',
        // Desktop: relative, always shown
        'md:relative md:z-auto',
        // Width: 56px icon-only md, 240px full lg
        'w-60 md:w-14 lg:w-60',
        // Visibility
        mobileSidebarOpen ? 'flex' : 'hidden md:flex',
      ].join(' ')}
    >
      {/* Logo + theme toggle */}
      <div className="px-3 py-4 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center justify-center lg:justify-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💪</span>
          </div>
          <div className="flex-1 min-w-0 hidden lg:block">
            <p className="text-sm font-bold text-fg-primary leading-none">Fitness Library</p>
            <p className="text-[10px] text-fg-muted mt-0.5 truncate">Thư viện kiến thức cá nhân</p>
          </div>
          {/* Theme toggle — always visible */}
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
            className="flex flex-shrink-0 p-1.5 rounded-md text-fg-muted hover:text-fg-primary hover:bg-surface-3 transition-colors"
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_LINKS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            onClick={() => setMobileSidebarOpen(false)}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 mx-2 px-3 py-2.5 text-sm font-medium transition-all mb-0.5',
                'justify-center lg:justify-start rounded-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                isActive
                  ? 'bg-primary-light text-primary border-l-[3px] border-primary pl-[calc(0.75rem-3px)]'
                  : 'text-fg-secondary hover:bg-surface-3 hover:text-fg-primary border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-fg-muted'}`} />
                <span className="hidden lg:block">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: AI status + author — hidden in icon-only mode */}
      <div className="border-t border-sidebar-border p-3 space-y-3 hidden lg:block flex-shrink-0">
        {/* AI Status */}
        <div className="flex items-center gap-2">
          {aiStatus === 'connected' ? (
            <>
              <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-success">AI Connected</p>
                <p className="text-[10px] text-fg-muted truncate">
                  {settings['ai.model'] || 'claude-sonnet-4-20250514'}
                </p>
              </div>
              <Wifi className="w-3.5 h-3.5 text-success flex-shrink-0" />
            </>
          ) : aiStatus === 'offline' ? (
            <>
              <div className="w-2 h-2 rounded-full bg-danger flex-shrink-0" />
              <p className="text-xs text-danger flex-1">AI Offline</p>
              <WifiOff className="w-3.5 h-3.5 text-danger flex-shrink-0" />
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-border flex-shrink-0" />
              <p className="text-xs text-fg-muted">{hasApiKey ? 'AI chưa kiểm tra' : 'Chưa cấu hình AI'}</p>
            </>
          )}
        </div>

        {/* Author */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-xs text-fg-muted">Vũ Hải</span>
        </div>

        {/* Theme toggle label (full width) */}
        <button
          onClick={toggle}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-fg-secondary hover:bg-surface-3 hover:text-fg-primary transition-colors text-xs"
          aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        >
          {theme === 'dark'
            ? <><Sun className="w-3.5 h-3.5" /> Chế độ sáng</>
            : <><Moon className="w-3.5 h-3.5" /> Chế độ tối</>
          }
        </button>
      </div>
    </aside>
  )
}
