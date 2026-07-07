import Hero from './Hero'
import ThreeColumnText from './ThreeColumnText'
import FullWidthImage from './FullWidthImage'
import PullQuote from './PullQuote'
import ImageTextSplit from './ImageTextSplit'
import Gallery from './Gallery'

// Sanity block `_type` → React component. Add new modules here and in
// studio/schemaTypes/blocks — nothing else needs to change.
export const blockComponents = {
  hero: Hero,
  threeColumnText: ThreeColumnText,
  fullWidthImage: FullWidthImage,
  pullQuote: PullQuote,
  imageTextSplit: ImageTextSplit,
  gallery: Gallery,
}
