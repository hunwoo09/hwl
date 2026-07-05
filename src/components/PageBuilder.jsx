import { blockComponents } from './blocks'

export default function PageBuilder({ blocks }) {
  if (!blocks?.length) return null

  return (
    <div className="w-full bg-black">
      {blocks.map((block, i) => {
        const Component = blockComponents[block._type]
        if (!Component) {
          if (import.meta.env.DEV) console.warn(`PageBuilder: no component for block type "${block._type}"`)
          return null
        }
        return <Component key={block._key ?? i} {...block} />
      })}
    </div>
  )
}
