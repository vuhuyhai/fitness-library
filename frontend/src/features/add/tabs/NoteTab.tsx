interface NoteTabProps {
  content: string
  setContent: (v: string) => void
}

export default function NoteTab({ content, setContent }: NoteTabProps) {
  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      placeholder="Viết ghi chú của bạn ở đây..."
      className="w-full bg-surface border border-border rounded-lg p-4 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-border-focus resize-none transition-colors"
      style={{ minHeight: '320px' }}
    />
  )
}
