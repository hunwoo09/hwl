import { imageProps } from '../../sanityImage'

const mono = '"Sequel Sans Heavy Body"'

export default function ImageTextSplit({ image, heading, text, caption, side = 'left' }) {
  const img = imageProps(image)
  const imageFirst = side !== 'right'

  return (
    <section className="w-full bg-black max-w-[1400px] mx-auto" style={{ paddingInline: 64, paddingBlock: 64 }}>
      {/* float layout: image floats to its side, text wraps it. When text is
          shorter than the image, following content flows into the space
          freed below the text instead of waiting for the image to end. */}
      <div className="md:[&::after]:content-[''] md:[&::after]:table md:[&::after]:clear-both">
        <figure
          className={`mb-8 md:mb-0 md:w-1/2 ${imageFirst ? 'md:float-left md:mr-14' : 'md:float-right md:ml-14'}`}
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

        <div>
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
