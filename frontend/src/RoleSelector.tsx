import { useState } from 'react'
import { ShieldCheck, BookOpen, Dumbbell, Sun, Moon } from 'lucide-react'
import { useTheme } from './contexts/ThemeContext'

interface Props {
  onSelect: (role: 'admin' | 'user', remember: boolean) => void
}

export default function RoleSelector({ onSelect }: Props) {
  const [remember, setRemember]   = useState(false)
  const [hovered, setHovered]     = useState<'admin' | 'user' | null>(null)
  const { theme, toggle }         = useTheme()

  return (
    <div className="h-screen bg-surface flex flex-col items-center justify-center px-6 relative">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
        className="absolute top-4 right-4 p-2 rounded-md text-fg-muted hover:text-fg-primary hover:bg-surface-3 transition-colors"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
          <Dumbbell className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-fg-primary">Fitness Library</h1>
          <p className="text-xs text-fg-muted">by Vũ Hải</p>
        </div>
      </div>

      <p className="text-fg-secondary text-sm mb-10 mt-1">Chọn giao diện của bạn</p>

      {/* Role cards */}
      <div className="flex gap-6 w-full max-w-2xl">
        {/* Admin card */}
        <button
          onMouseEnter={() => setHovered('admin')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelect('admin', remember)}
          className={[
            'flex-1 p-7 rounded-2xl border-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            hovered === 'admin'
              ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10 -translate-y-1'
              : 'border-border bg-surface-2 hover:border-primary/40',
          ].join(' ')}
        >
          <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center mb-5">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-bold text-fg-primary text-lg mb-2">Quản Trị Viên</h2>
          <p className="text-sm text-fg-secondary leading-relaxed mb-5">
            Thêm, sửa, xóa tài liệu. Quản lý danh mục,
            import hàng loạt và cấu hình hệ thống.
          </p>
          <span className={[
            'inline-block px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
            hovered === 'admin' ? 'bg-primary text-white' : 'bg-primary-light text-primary',
          ].join(' ')}>
            Vào trang Quản trị →
          </span>
        </button>

        {/* User card */}
        <button
          onMouseEnter={() => setHovered('user')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelect('user', remember)}
          className={[
            'flex-1 p-7 rounded-2xl border-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a]/50',
            hovered === 'user'
              ? 'border-[#16a34a] bg-[#16a34a]/5 shadow-xl shadow-[#16a34a]/10 -translate-y-1'
              : 'border-border bg-surface-2 hover:border-[#16a34a]/40',
          ].join(' ')}
        >
          <div className="w-14 h-14 rounded-xl bg-[#16a34a]/15 flex items-center justify-center mb-5">
            <BookOpen className="w-7 h-7 text-[#16a34a]" />
          </div>
          <h2 className="font-bold text-fg-primary text-lg mb-2">Độc Giả</h2>
          <p className="text-sm text-fg-secondary leading-relaxed mb-5">
            Khám phá thư viện, đọc tài liệu, lưu bookmark
            và theo dõi tiến độ học tập cá nhân.
          </p>
          <span className={[
            'inline-block px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
            hovered === 'user' ? 'bg-[#16a34a] text-white' : 'bg-[#16a34a]/10 text-[#16a34a]',
          ].join(' ')}>
            Vào Thư Viện →
          </span>
        </button>
      </div>

      {/* Remember checkbox */}
      <label className="flex items-center gap-2.5 mt-8 cursor-pointer text-sm text-fg-secondary hover:text-fg-primary transition-colors select-none">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
        />
        Nhớ lựa chọn, không hỏi lại
      </label>
    </div>
  )
}
