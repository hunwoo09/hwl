import imageUrlBuilder from '@sanity/image-url'
import { client } from './sanityClient'

const builder = imageUrlBuilder(client)

// Base builder: callers chain .width()/.height()/etc before calling .url()
export function urlFor(source) {
  return builder.image(source)
}

// Auto-format (avif/webp) + quality, ready-to-use <img> props with a
// responsive srcSet — avoids next/image since this app is Vite, not Next.
export function imageProps(source, { widths = [640, 960, 1280, 1920], sizes = '100vw' } = {}) {
  if (!source?.asset) return null
  const base = urlFor(source).auto('format').quality(80)
  return {
    src:    base.width(widths[widths.length - 1]).url(),
    srcSet: widths.map(w => `${base.width(w).url()} ${w}w`).join(', '),
    sizes,
    loading: 'lazy',
    decoding: 'async',
  }
}
