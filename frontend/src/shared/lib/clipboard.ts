/**
 * Clipboard utilities for Facebook caption sharing.
 * Falls back to execCommand for WebView2 compatibility.
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to execCommand fallback
  }
  // Fallback for WebView2 / older browsers
  const el = document.createElement('textarea')
  el.value = text
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.focus()
  el.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(el)
  return ok
}

export function buildFacebookShareUrl(shareBaseUrl: string, docId: string): string {
  const pageUrl = encodeURIComponent(`${shareBaseUrl}/doc/${docId}`)
  return `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`
}

export function buildCaptionWithHashtags(content: string, hashtags: string[]): string {
  if (hashtags.length === 0) return content
  return `${content}\n\n${hashtags.join(' ')}`
}
