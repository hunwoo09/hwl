import { imageProps } from '../../sanityImage'

const mono = '"Sequel Sans Heavy Disp"'

export default function Hero({ heading, subheading, image, variant = 'full' }) {
  const img = imageProps(image, { sizes: variant === 'full' ? '100vw' : '50vw' })

  const Heading = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {heading && (
        <h2
          className="font-serif text-white font-light leading-[0.95] tracking-tight"
          style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)' }}
        >
          {heading}
        </h2>
      )}
      {subheading && (
        <p
          style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.3em' }}
          className="text-[#888] uppercase"
        >
          {subheading}
        </p>
      )}
    </div>
  )

  if (variant === 'text-only') {
    return (
      <section className="w-full py-24 px-8 md:px-16 bg-black">
        {Heading}
      </section>
    )
  }

  if (variant === 'split-left' || variant === 'split-right') {
    const imageFirst = variant === 'split-left'
    return (
      <section className="w-full bg-black flex flex-col md:flex-row">
        {imageFirst && img && (
          <div className="w-full md:w-1/2 aspect-[4/5] overflow-hidden">
            <img {...img} alt={heading || ''} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="w-full md:w-1/2 flex items-center px-8 md:px-16 py-16">
          {Heading}
        </div>
        {!imageFirst && img && (
          <div className="w-full md:w-1/2 aspect-[4/5] overflow-hidden">
            <img {...img} alt={heading || ''} className="w-full h-full object-cover" />
          </div>
        )}
      </section>
    )
  }

  // full-bleed
  return (
    <section className="relative w-full bg-black" style={{ height: '85vh' }}>
      {img && (
        <img {...img} alt={heading || ''} className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 45%)' }}
      />
      <div className="absolute bottom-0 left-0 right-0 px-8 md:px-16 pb-16">
        {Heading}
      </div>
    </section>
  )
}
