const mono = '"Sequel Sans Heavy Body"'

const MAX_WIDTH = {
  full:   '100%',
  large:  '1400px',
  medium: '1000px',
  small:  '700px',
}

const P5_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.js'

// Editors paste either a complete index.html or just the sketch's JavaScript.
// Bare JS has nothing to execute it, so the iframe would render it as plain
// text — wrap it in a minimal p5 document instead.
function isHtmlDocument(code) {
  return /<\s*(!doctype|html|script|body)\b/i.test(code)
}

function sketchDocument(code) {
  if (isHtmlDocument(code)) return code
  return [
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />',
    '<script src="' + P5_CDN + '"></script>',
    '<style>html,body{margin:0;padding:0;background:#000;}',
    'canvas{display:block;}input[type=range]{margin:6px 8px 0 8px;}</style>',
    '</head><body><main></main>',
    '<script>' + code + '</script>',
    '</body></html>',
  ].join('')
}

export default function SketchEmbed({ title, url, code, size = 'medium', aspectRatio = '4 / 3' }) {
  if (!url && !code) return null

  // The sketch must run in an iframe: p5 needs its scripts to execute, which
  // innerHTML / dangerouslySetInnerHTML never does. `allow` grants the webcam.
  // Note: a p5.js Web Editor URL always paints the editor's own title bar and
  // it is cross-origin, so CSS can't hide it — paste the HTML instead.
  const frameProps = url ? { src: url } : { srcDoc: sketchDocument(code) }
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
