import imageUrlBuilder from '@sanity/image-url'
import { client } from './sanityClient'

const builder = imageUrlBuilder(client)

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID
const dataset   = import.meta.env.VITE_SANITY_DATASET

// Direct CDN URL for file assets (video/audio) — @sanity/image-url only
// handles images, so file refs are expanded by hand.
export function fileUrlFor(ref) {
  return `https://cdn.sanity.io/files/${projectId}/${dataset}/${ref
    .replace('file-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

// Direct CDN URL base for an image ref, for callers that append their own
// query params (e.g. the WebGL hero canvas).
export function imageCdnBase(ref) {
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${ref
    .replace('image-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

// Base builder: callers chain .width()/.height()/etc before calling .url()
export function urlFor(source) {
  return builder.image(source)
}

// Auto-format (avif/webp) + quality, ready-to-use <img> props with a
// responsive srcSet — avoids next/image since this app is Vite, not Next.
export function imageProps(source, { widths = [640, 960, 1280, 1920], sizes = '100vw', priority = false } = {}) {
  if (!source?.asset) return null
  const base = urlFor(source).auto('format').quality(80)
  return {
    src:    base.width(widths[widths.length - 1]).url(),
    srcSet: widths.map(w => `${base.width(w).url()} ${w}w`).join(', '),
    sizes,
    loading: priority ? 'eager' : 'lazy',
    decoding: priority ? 'sync' : 'async',
    fetchPriority: priority ? 'high' : 'auto',
  }
}
