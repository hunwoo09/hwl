export default {
  name: 'pullQuote',
  title: 'Pull Quote',
  type: 'object',
  icon: () => '❝',
  fields: [
    {
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 3,
    },
    {
      name: 'attribution',
      title: 'Attribution',
      type: 'string',
    },
    {
      name: 'variant',
      title: 'Variant',
      type: 'string',
      options: {
        list: [
          { title: 'Centered', value: 'center' },
          { title: 'Left aligned, indented', value: 'left-indent' },
        ],
        layout: 'radio',
      },
      initialValue: 'center',
    },
  ],
  preview: {
    select: { title: 'quote', subtitle: 'attribution' },
    prepare({ title, subtitle }) {
      return { title: title ? `“${title}”` : 'Pull Quote', subtitle }
    },
  },
}
