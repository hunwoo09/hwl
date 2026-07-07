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
    },
  ],
  preview: {
    select: { title: 'heading', media: 'image', side: 'side' },
    prepare({ title, media, side }) {
      return { title: title || 'Image / Text Split', subtitle: `Image ${side || 'left'}`, media }
    },
  },
}
