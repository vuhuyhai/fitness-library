import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Library, FilePlus, Upload, Settings,
  FolderTree, Sparkles, Wifi, WifiOff, ShieldCheck,
  Sun, Moon, BookOpen, LogOut,
} from 'lucide-react'
import { api } from '../../lib/wailsApi'
import { useLibraryStore } from '../../store/useLibraryStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useTheme } from '../../contexts/ThemeContext'
import { useUIStore } from '../../store/useUIStore'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard',       Icon: LayoutDashboard },
  { to: '/library',   label: 'Thư Viện',        Icon: Library         },
  { to: '/add',       label: 'Thêm Tài Liệu',  Icon: FilePlus        },
  { to: '/import',    label: 'Nhập Hàng Loạt', Icon: Upload          },
  { to: '/settings',  label: 'Cài Đặt',        Icon: Settings        },
]

interface Props {
  onSwitchToUser: () => void
  onLogout: () => void
}

export default function AdminSidebar({ onSwitchToUser, onLogout }: Props) {
  const { setCategories } = useLibraryStore()
  const { aiStatus, settings } = useSettingsStore()
  const { theme, toggle }      = useTheme()
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error)
  }, [])

  const hasApiKey = !!(settings['ai.api_key'] || settings['ai.gemini_api_key'] || settings['ai.openai_api_key'])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 mx-2 px-3 py-2.5 text-sm font-medium transition-all mb-0.5',
      'justify-center lg:justify-start rounded-md',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
      isActive
        ? 'bg-primary-light text-primary border-l-[3px] border-primary pl-[calc(0.75rem-3px)]'
        : 'text-fg-secondary hover:bg-surface-3 hover:text-fg-primary border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]',
    ].join(' ')

  return (
    <aside
      role="navigation"
      aria-label="Menu quản trị"
      className={[
        'bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0 overflow-hidden',
        'transition-all duration-200',
        'fixed inset-y-0 left-0 z-50',
        'md:relative md:z-auto',
        'w-60 md:w-14 lg:w-60',
        mobileSidebarOpen ? 'flex' : 'hidden md:flex',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="px-3 py-4 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center justify-center lg:justify-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 hidden lg:block">
            <p className="text-sm font-bold text-fg-primary leading-none">Fitness Library</p>
            <p className="text-[10px] text-primary mt-0.5 font-semibold tracking-widest uppercase">Chế độ Quản trị</p>
          </div>
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            className="flex flex-shrink-0 p-1.5 rounded-md text-fg-muted hover:text-fg-primary hover:bg-surface-3 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_LINKS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            title={label}
            onClick={() => setMobileSidebarOpen(false)}
            className={linkClass}
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-fg-muted'}`} />
                <span className="hidden lg:block">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* AI shortcut */}
        <NavLink
          to="/settings"
          title="AI & Phân Loại"
          onClick={() => setMobileSidebarOpen(false)}
          className={({ isActive }) => [
            'flex items-center gap-3 mx-2 px-3 py-2.5 text-sm font-medium transition-all mb-0.5',
            'justify-center lg:justify-start rounded-md border-l-[3px] pl-[calc(0.75rem-3px)]',
            isActive ? 'border-primary' : 'border-transparent',
            'text-fg-muted hover:bg-surface-3 hover:text-fg-primary',
          ].join(' ')}
        >
          {() => (
            <>
              <Sparkles className="w-4 h-4 flex-shrink-0 text-fg-muted" />
              <span className="hidden lg:block">AI & Phân Loại</span>
            </>
          )}
        </NavLink>

        {/* Categories */}
        <NavLink
          to="/settings"
          title="Danh Mục"
          onClick={() => setMobileSidebarOpen(false)}
          className={({ isActive }) => [
            'flex items-center gap-3 mx-2 px-3 py-2.5 text-sm font-medium transition-all mb-0.5',
            'justify-center lg:justify-start rounded-md border-l-[3px] pl-[calc(0.75rem-3px)]',
            isActive ? 'border-primary' : 'border-transparent',
            'text-fg-muted hover:bg-surface-3 hover:text-fg-primary',
          ].join(' ')}
        >
          {() => (
            <>
              <FolderTree className="w-4 h-4 flex-shrink-0 text-fg-muted" />
              <span className="hidden lg:block">Danh Mục</span>
            </>
          )}
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-2 flex-shrink-0">
        {/* AI status — desktop only */}
        <div className="hidden lg:flex items-center gap-2">
          {aiStatus === 'connected' ? (
            <>
              <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-success">AI Connected</p>
                <p className="text-[10px] text-fg-muted truncate">
                  {settings['ai.model'] || (
                    settings['ai.provider'] === 'gemini' ? 'gemini-2.0-flash' :
                    settings['ai.provider'] === 'openai' ? 'gpt-4o-mini' :
                    'claude-sonnet-4'
                  )}
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

        {/* Admin identity — desktop only */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] text-white font-bold">VH</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-fg-primary leading-none">Vũ Hải</p>
            <p className="text-[10px] text-fg-muted">Quản trị viên</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="border-t border-sidebar-border pt-2 space-y-0.5">
          <button
            onClick={onSwitchToUser}
            title="Chuyển sang giao diện người dùng"
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg-primary transition-colors text-xs justify-center lg:justify-start"
          >
            <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden lg:block">← Xem thư viện</span>
          </button>

          <button
            onClick={onLogout}
            title="Đăng xuất khỏi trang quản trị"
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-fg-muted hover:bg-danger/10 hover:text-danger transition-colors text-xs justify-center lg:justify-start"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden lg:block">Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
