import { NavLink } from 'react-router-dom'
import {
  Home, BookOpen, Bookmark, TrendingUp, Sun, Moon, UserRound,
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useUIStore } from '../../store/useUIStore'

const NAV_LINKS = [
  { to: '/home',      label: 'Trang Chủ', Icon: Home      },
  { to: '/library',   label: 'Thư Viện',  Icon: BookOpen  },
  { to: '/bookmarks', label: 'Đã Lưu',    Icon: Bookmark  },
  { to: '/progress',  label: 'Tiến Độ',   Icon: TrendingUp},
]

const ACTIVE_GREEN = '#16a34a'

interface Props {
  onClearRole: () => void
}

export default function UserSidebar({ onClearRole }: Props) {
  const { theme, toggle }                           = useTheme()
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 mx-2 px-3 py-2.5 text-sm font-medium transition-all mb-0.5',
      'justify-center lg:justify-start rounded-md',
      'focus-visible:outline-none focus-visible:ring-2',
      isActive
        ? 'bg-[#dcfce7] text-[#16a34a] border-l-[3px] border-[#16a34a] pl-[calc(0.75rem-3px)]'
        : 'text-fg-secondary hover:bg-surface-3 hover:text-fg-primary border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]',
    ].join(' ')

  return (
    <aside
      role="navigation"
      aria-label="Menu đọc sách"
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
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${ACTIVE_GREEN}18` }}
          >
            <BookOpen className="w-4 h-4" style={{ color: ACTIVE_GREEN }} />
          </div>
          <div className="flex-1 min-w-0 hidden lg:block">
            <p className="text-sm font-bold text-fg-primary leading-none">Fitness Library</p>
            <p className="text-[10px] mt-0.5 font-semibold tracking-widest uppercase" style={{ color: ACTIVE_GREEN }}>
              Thư Viện Cá Nhân
            </p>
          </div>
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
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
            title={label}
            onClick={() => setMobileSidebarOpen(false)}
            className={linkClass}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: isActive ? ACTIVE_GREEN : undefined }}
                />
                <span className="hidden lg:block">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-1 flex-shrink-0">
        {/* Dark/light toggle — desktop */}
        <button
          onClick={toggle}
          className="hidden lg:flex w-full items-center gap-2 px-2 py-2 rounded-md text-fg-secondary hover:bg-surface-3 hover:text-fg-primary transition-colors text-xs"
        >
          {theme === 'dark'
            ? <><Sun className="w-3.5 h-3.5" /> Chế độ sáng</>
            : <><Moon className="w-3.5 h-3.5" /> Chế độ tối</>
          }
        </button>

        {/* Switch role */}
        <button
          onClick={onClearRole}
          title="Đổi vai trò"
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg-primary transition-colors text-xs justify-center lg:justify-start"
        >
          <UserRound className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden lg:block">Đổi vai trò</span>
        </button>
      </div>
    </aside>
  )
}
