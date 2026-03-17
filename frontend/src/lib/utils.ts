export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ')
}

export function formatDate(isoString: string): string {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('vi-VN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

export const TYPE_LABELS: Record<string, string> = {
  article: 'Bài viết',
  pdf:     'PDF',
  workout: 'Giáo án',
  video:   'Video',
  note:    'Ghi chú',
}

export const TYPE_COLORS: Record<string, string> = {
  article: 'bg-blue-900/60 text-blue-300 border border-blue-700/30',
  pdf:     'bg-red-900/60 text-red-300 border border-red-700/30',
  workout: 'bg-orange-900/60 text-orange-300 border border-orange-700/30',
  video:   'bg-purple-900/60 text-purple-300 border border-purple-700/30',
  note:    'bg-gray-700/60 text-gray-300 border border-gray-600/30',
}

export const CAT_COLORS: Record<string, string> = {
  'cat-workout':   '#F97316',
  'cat-nutrition': '#22C55E',
  'cat-recovery':  '#3B82F6',
  'cat-mindset':   '#A855F7',
  'cat-science':   '#06B6D4',
}

export const CAT_NAMES: Record<string, string> = {
  'cat-workout':   '💪 Tập Luyện',
  'cat-nutrition': '🥗 Dinh Dưỡng',
  'cat-recovery':  '🧘 Phục Hồi',
  'cat-mindset':   '🧠 Tâm Lý',
  'cat-science':   '🔬 Khoa Học',
}
