import { useEffect, useCallback, useRef } from 'react'

export interface SelectionInfo {
  text: string
  /** Bounding rect of the selection in viewport coords */
  rect: DOMRect
}

interface Options {
  /** Container element to restrict selection detection to (default: document) */
  containerRef?: React.RefObject<HTMLElement>
  /** Min word count (default: 1) */
  minWords?: number
  /** Max word count (default: 5) */
  maxWords?: number
  enabled?: boolean
}

/**
 * Detects text selections within a container.
 * Calls onSelect when user selects 1-5 words; calls onDeselect when selection clears.
 */
export function useTextSelection(
  onSelect: (info: SelectionInfo) => void,
  onDeselect: () => void,
  options: Options = {},
) {
  const { containerRef, minWords = 1, maxWords = 5, enabled = true } = options
  const onSelectRef = useRef(onSelect)
  const onDeselectRef = useRef(onDeselect)
  onSelectRef.current = onSelect
  onDeselectRef.current = onDeselect

  const handleSelectionChange = useCallback(() => {
    if (!enabled) return
    const selection = window.getSelection()

    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      onDeselectRef.current()
      return
    }

    const text = selection.toString().trim()
    if (!text) {
      onDeselectRef.current()
      return
    }

    // Check word count (split on whitespace/punctuation)
    const words = text.split(/[\s\-–—]+/).filter(w => w.length > 0)
    if (words.length < minWords || words.length > maxWords) {
      onDeselectRef.current()
      return
    }

    // Restrict to container if specified
    if (containerRef?.current) {
      const range = selection.getRangeAt(0)
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        onDeselectRef.current()
        return
      }
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    // Ignore zero-size rects (e.g. selections in hidden elements)
    if (rect.width === 0 && rect.height === 0) {
      onDeselectRef.current()
      return
    }

    onSelectRef.current({ text, rect })
  }, [enabled, minWords, maxWords, containerRef])

  useEffect(() => {
    if (!enabled) return

    // mouseup covers desktop; touchend covers mobile
    const handleMouseUp = () => {
      // Small delay so selection is stable after mouseup
      setTimeout(handleSelectionChange, 10)
    }
    const handleTouchEnd = () => {
      setTimeout(handleSelectionChange, 100)
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('selectionchange', handleSelectionChange)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [enabled, handleSelectionChange])
}
