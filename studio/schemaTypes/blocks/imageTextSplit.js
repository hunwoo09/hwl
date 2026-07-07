export default {
  name: 'imageTextSplit',
  title: 'Image / Text Split',
  type: 'object',
  icon: () => '◫',
  fields: [
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'caption',
      title: 'Caption',
      type: 'string',
    },
    {
      name: 'heading',
      title: 'Heading',
      type: 'string',
    },
    {
      name: 'text',
      title: 'Text',
      type: 'text',
    },
    {
      name: 'side',
      title: 'Image Side',
      type: 'string',
      options: {
        list: [
          { title: 'Image left, text right', value: 'left' },
          { title: 'Image right, text left', value: 'right' },
        ],
        layout: 'radio',
      },
      initialValue: 'left',
      hidden: ({ parent }) => !!parent?.image2,
      description: 'Ignored when a second image is set below (layout becomes image / text / image).',
    },
    {
      name: 'image2',
      title: 'Second Image (optional)',
      description: 'Add this to flank the text with an image on both sides.',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'caption2',
      title: 'Second Image Caption',
      type: 'string',
      hidden: ({ parent }) => !parent?.image2,
    },
  ],
  preview: {
    select: { title: 'heading', media: 'image', side: 'side', image2: 'image2' },
    prepare({ title, media, side, image2 }) {
      return {
        title: title || 'Image / Text Split',
        subtitle: image2 ? 'Image / text / image' : `Image ${side || 'left'}`,
        media,
      }
    },
  },
}
