import { Bold, Italic, Heading2, Link, Code, Image } from 'lucide-react'

type PreviewMode = 'edit' | 'preview' | 'split'

interface ArticleTabProps {
  content: string
  setContent: (v: string) => void
  previewMode: PreviewMode
  setPreviewMode: (m: PreviewMode) => void
  editorRef: React.RefObject<HTMLTextAreaElement>
  insertMd: (prefix: string, suffix?: string, placeholder?: string) => void
}

const TOOLBAR_BUTTONS = (insertMd: ArticleTabProps['insertMd']) => [
  { icon: Bold,     action: () => insertMd('**', '**', 'bold text')    },
  { icon: Italic,   action: () => insertMd('_', '_', 'italic text')    },
  { icon: Heading2, action: () => insertMd('## ', '', 'Heading')       },
  { icon: Link,     action: () => insertMd('[', '](url)', 'link text') },
  { icon: Code,     action: () => insertMd('`', '`', 'code')          },
  { icon: Image,    action: () => insertMd('![', '](url)', 'alt text') },
]

export default function ArticleTab({
  content, setContent, previewMode, setPreviewMode, editorRef, insertMd,
}: ArticleTabProps) {
  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1 border border-border">
          {TOOLBAR_BUTTONS(insertMd).map(({ icon: Icon, action }, i) => (
            <button
              key={i}
              onClick={action}
              className="p-1.5 text-fg-secondary hover:text-fg-primary hover:bg-surface-3 rounded-md transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {(['edit', 'split', 'preview'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setPreviewMode(m)}
              className={`px-2.5 py-1.5 transition-colors ${
                previewMode === m
                  ? 'bg-surface-3 text-fg-primary'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-surface-3'
              }`}
            >
              {m === 'edit' ? 'Viết' : m === 'split' ? 'Split' : 'Xem'}
            </button>
          ))}
        </div>
      </div>

      {/* Editor / preview area */}
      <div className="flex gap-3" style={{ minHeight: '320px' }}>
        {(previewMode === 'edit' || previewMode === 'split') && (
          <textarea
            ref={editorRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Viết nội dung Markdown ở đây..."
            className={`${previewMode === 'split' ? 'flex-1' : 'w-full'} bg-surface border border-border rounded-lg p-3 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-border-focus font-mono resize-none transition-colors`}
            style={{ minHeight: '320px' }}
          />
        )}
        {(previewMode === 'preview' || previewMode === 'split') && (
          <div
            className={`${previewMode === 'split' ? 'flex-1' : 'w-full'} bg-surface border border-border rounded-lg p-4 overflow-y-auto prose prose-sm max-w-none dark:prose-invert`}
            style={{ minHeight: '320px' }}
          >
            {content ? (
              <pre className="text-fg-secondary text-xs font-mono whitespace-pre-wrap">{content}</pre>
            ) : (
              <p className="text-fg-muted italic text-sm">Nội dung xem trước sẽ hiện ở đây...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
