export default {
  name: 'fullWidthImage',
  title: 'Full Width Image',
  type: 'object',
  icon: () => '▭',
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
      name: 'aspect',
      title: 'Aspect Ratio',
      type: 'string',
      options: {
        list: [
          { title: 'Wide (21:9)', value: 'wide' },
          { title: 'Standard (16:9)', value: 'standard' },
          { title: 'Full bleed (native)', value: 'native' },
        ],
        layout: 'radio',
      },
      initialValue: 'standard',
    },
  ],
  preview: {
    select: { title: 'caption', media: 'image' },
    prepare({ title, media }) {
      return { title: title || 'Full Width Image', subtitle: 'Full Width Image', media }
    },
  },
}
