import { imageProps } from '../../sanityImage'

const mono = '"Sequel Sans Heavy Body"'

export default function ImageTextSplit({ image, heading, text, caption, side = 'left' }) {
  const img = imageProps(image)
  const imageFirst = side !== 'right'

  return (
    <section className="w-full bg-black max-w-[1400px] mx-auto" style={{ paddingInline: 64, paddingBlock: 64 }}>
      <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-14">
        <figure
          className={`md:w-1/2 ${imageFirst ? 'md:order-1' : 'md:order-2'}`}
        >
          {img && (
            <div className="w-full overflow-hidden">
              <img {...img} alt={caption || ''} className="w-full h-auto" />
            </div>
          )}
          {caption && (
            <figcaption
              style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.25em' }}
              className="text-[#555] uppercase pt-4"
            >
              {caption}
            </figcaption>
          )}
        </figure>

        <div className={`md:w-1/2 ${imageFirst ? 'md:order-2' : 'md:order-1'}`}>
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
      </div>
    </section>
  )
}
