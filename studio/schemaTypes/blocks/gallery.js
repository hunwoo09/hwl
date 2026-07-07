export default {
  name: 'gallery',
  title: 'Gallery',
  type: 'object',
  icon: () => '▦',
  fields: [
    {
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
            },
          ],
        },
      ],
      options: { layout: 'grid' },
      validation: (Rule) => Rule.min(1),
    },
    {
      name: 'columns',
      title: 'Columns',
      type: 'string',
      options: {
        list: [
          { title: '2 columns', value: '2' },
          { title: '3 columns', value: '3' },
          { title: '4 columns', value: '4' },
        ],
        layout: 'radio',
      },
      initialValue: '3',
    },
  ],
  preview: {
    select: { images: 'images', columns: 'columns' },
    prepare({ images, columns }) {
      return {
        title: 'Gallery',
        subtitle: `${images?.length || 0} image${images?.length === 1 ? '' : 's'} · ${columns || 3} columns`,
        media: images?.[0],
      }
    },
  },
}
