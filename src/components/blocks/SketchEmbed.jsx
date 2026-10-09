const mono = '"Sequel Sans Heavy Body"'

export default function SketchEmbed({ title, url, code, aspectRatio = '4 / 3' }) {
  if (!url && !code) return null

  // The sketch must run in an iframe: p5 needs its scripts to execute, which
  // innerHTML / dangerouslySetInnerHTML never does. `allow` grants the webcam.
  const frameProps = url ? { src: url } : { srcDoc: code }

  return (
    <figure className="w-full bg-black">
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
          style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.25em', paddingInline: 64, paddingBlock: 16 }}
          className="text-[#555] uppercase"
        >
          {title}
        </figcaption>
      )}
    </figure>
  )
}
