const mono = '"Sequel Sans Heavy Body"'

const MAX_WIDTH = {
  full:   '100%',
  large:  '1400px',
  medium: '1000px',
  small:  '700px',
}

export default function SketchEmbed({ title, url, code, size = 'medium', aspectRatio = '4 / 3' }) {
  if (!url && !code) return null

  // The sketch must run in an iframe: p5 needs its scripts to execute, which
  // innerHTML / dangerouslySetInnerHTML never does. `allow` grants the webcam.
  // Note: a p5.js Web Editor URL always paints the editor's own title bar and
  // it is cross-origin, so CSS can't hide it — paste the HTML instead.
  const frameProps = url ? { src: url } : { srcDoc: code }
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
