import { imageProps } from '../../sanityImage'

const mono = '"Sequel Sans Heavy Disp"'

export default function ImageTextSplit({ image, heading, text, caption, side = 'left' }) {
  const img = imageProps(image)
  const imageFirst = side !== 'right'

  return (
    <section className="w-full bg-black px-6 md:px-16 py-20 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-8 items-center">
        <figure
          className={imageFirst ? 'md:order-1' : 'md:order-2'}
          style={{ margin: 0 }}
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

        <div className={imageFirst ? 'md:order-2' : 'md:order-1'}>
          {heading && (
            <h3
              style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.3em' }}
              className="text-[#888] uppercase mb-6"
            >
              {heading}
            </h3>
          )}
          {text && (
            <p
              className="font-serif text-[#ccc] text-[15px] leading-relaxed font-light text-balance"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {text}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
