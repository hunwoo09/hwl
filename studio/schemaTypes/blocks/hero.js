export default {
  name: 'hero',
  title: 'Hero',
  type: 'object',
  icon: () => '🏔',
  fields: [
    {
      name: 'heading',
      title: 'Heading',
      type: 'string',
    },
    {
      name: 'subheading',
      title: 'Subheading',
      type: 'string',
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'variant',
      title: 'Variant',
      type: 'string',
      options: {
        list: [
          { title: 'Full-bleed image', value: 'full' },
          { title: 'Image left, text right', value: 'split-left' },
          { title: 'Text left, image right', value: 'split-right' },
          { title: 'Text only', value: 'text-only' },
        ],
        layout: 'radio',
      },
      initialValue: 'full',
    },
  ],
  preview: {
    select: { title: 'heading', subtitle: 'variant', media: 'image' },
    prepare({ title, subtitle, media }) {
      return { title: title || 'Hero', subtitle: `Hero — ${subtitle || 'full'}`, media }
    },
  },
}
