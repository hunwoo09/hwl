import { imageProps } from '../../sanityImage'

const mono = '"Sequel Sans Heavy Body"'

function Figure({ image, caption, className = '' }) {
  const img = imageProps(image)
  if (!img) return null

  return (
    <figure className={className}>
      <div className="w-full overflow-hidden">
        <img {...img} alt={caption || ''} className="w-full h-auto" />
      </div>
      {caption && (
        <figcaption
          style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.25em' }}
          className="text-[#555] uppercase pt-4"
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

function TextColumn({ heading, text, className = '' }) {
  return (
    <div className={className}>
      {heading && (
        <h3
          style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.3em' }}
          className="text-[#888] uppercase mb-3"
        >
          {heading}
        </h3>
      )}
      {text && (
        <p
          className="text-[#ccc] text-[15px] leading-relaxed font-light text-balance"
          style={{ fontFamily: mono, whiteSpace: 'pre-wrap' }}
        >
          {text}
        </p>
      )}
    </div>
  )
}

export default function ImageTextSplit({ image, image2, heading, text, caption, caption2, side = 'left' }) {
  const imageFirst = side !== 'right'

  // Two images: fixed image / text / image layout, text stays centered between them.
  if (image2) {
    return (
      <section className="w-full bg-black max-w-[1400px] mx-auto" style={{ paddingInline: 64, paddingBlock: 64 }}>
        <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-14">
          <Figure image={image} caption={caption} className="md:w-1/3" />
          <TextColumn heading={heading} text={text} className="md:w-1/3" />
          <Figure image={image2} caption={caption2} className="md:w-1/3" />
        </div>
      </section>
    )
  }

  return (
    <section className="w-full bg-black max-w-[1400px] mx-auto" style={{ paddingInline: 64, paddingBlock: 64 }}>
      <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-14">
        <Figure image={image} caption={caption} className={`md:w-1/2 ${imageFirst ? 'md:order-1' : 'md:order-2'}`} />
        <TextColumn heading={heading} text={text} className={`md:w-1/2 ${imageFirst ? 'md:order-2' : 'md:order-1'}`} />
      </div>
    </section>
  )
}
