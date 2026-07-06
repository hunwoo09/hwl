import { imageProps } from '../../sanityImage'

const mono = '"Sequel Sans Heavy Disp"'

const ASPECT = {
  wide:     'aspect-[21/9]',
  standard: 'aspect-[16/9]',
  native:   '',
}

export default function FullWidthImage({ image, caption, aspect = 'standard' }) {
  const img = imageProps(image)
  if (!img) return null

  return (
    <figure className="w-full bg-black">
      <div className={`w-full overflow-hidden ${aspect in ASPECT ? ASPECT[aspect] : ASPECT.standard}`}>
        <img {...img} alt={caption || ''} className={`w-full ${aspect === 'native' ? 'h-auto' : 'h-full object-cover'}`} />
      </div>
      {caption && (
        <figcaption
          style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.25em' }}
          className="text-[#555] uppercase px-8 md:px-16 py-4"
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
