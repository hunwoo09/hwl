const mono = '"Sequel Sans Heavy Body"'

const MAX_WIDTH = {
  full:   '100%',
  large:  '1400px',
  medium: '1000px',
  small:  '700px',
}

// The p5.js Web Editor's /full/, /present/ and /sketches/ views render the
// editor's own title bar above the canvas. /embed/ renders the canvas alone,
// and it is cross-origin so CSS can't hide the bar — the URL has to change.
function embedUrl(url) {
  if (!url) return url
  return url.replace(
    /^(https:\/\/editor\.p5js\.org\/[^/]+\/)(full|present|sketches)\//,
    '$1embed/'
  )
}

export default function SketchEmbed({ title, url, code, size = 'medium', aspectRatio = '4 / 3' }) {
  if (!url && !code) return null

  // The sketch must run in an iframe: p5 needs its scripts to execute, which
  // innerHTML / dangerouslySetInnerHTML never does. `allow` grants the webcam.
  const frameProps = url ? { src: embedUrl(url) } : { srcDoc: code }
  const maxWidth = MAX_WIDTH[size] ?? MAX_WIDTH.medium

  return (
    <figure
      className="w-full bg-black mx-auto"
      style={{ maxWidth, paddingInline: size === 'full' ? 0 : 64, paddingBlock: 40 }}
    >
      <iframe
        {...frameProps}
        title={title || 'Interactive sketch'}
        allow="camera; microphone"
        loading="lazy"
        className="w-full rounded-lg"
        style={{ aspectRatio, border: 0, display: 'block' }}
      />
      {title && (
        <figcaption
          style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.25em', paddingBlock: 16 }}
          className="text-[#555] uppercase"
        >
          {title}
        </figcaption>
      )}
    </figure>
  )
}
