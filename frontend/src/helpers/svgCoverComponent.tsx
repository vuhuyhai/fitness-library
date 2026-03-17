import { useMemo } from 'react'
import { generateSvgCover, svgToDataURI } from './svgCover'

interface SvgCoverProps {
  docId: string
  catId: string
  className?: string
  width?: number
  height?: number
}

export default function SvgCover({ docId, catId, className = '', width = 400, height = 260 }: SvgCoverProps) {
  const src = useMemo(
    () => svgToDataURI(generateSvgCover(docId, catId, width, height)),
    [docId, catId, width, height]
  )
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={className}
      style={{ objectFit: 'cover' }}
    />
  )
}
