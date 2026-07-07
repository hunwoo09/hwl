import { imageProps } from '../../sanityImage'

const mono = '"Sequel Sans Heavy Body"'

const GRID_COLS = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
}

export default function Gallery({ images, columns = '3' }) {
  if (!images?.length) return null
  const gridCols = GRID_COLS[columns] || GRID_COLS['3']

  return (
    <section className="w-full bg-black max-w-[1400px] mx-auto" style={{ paddingInline: 64, paddingBlock: 64 }}>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-8`}>
        {images.map((image, i) => {
          const img = imageProps(image, { sizes: `(min-width: 768px) ${Math.round(100 / Number(columns))}vw, 100vw` })
          if (!img) return null

          return (
            <figure key={image._key || i} style={{ margin: 0 }}>
              <div className="w-full overflow-hidden">
                <img {...img} alt={image.caption || ''} className="w-full h-auto" />
              </div>
              {image.caption && (
                <figcaption
                  style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.25em' }}
                  className="text-[#555] uppercase pt-4"
                >
                  {image.caption}
                </figcaption>
              )}
            </figure>
          )
        })}
      </div>
    </section>
  )
}
