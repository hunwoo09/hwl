export default {
  name: 'threeColumnText',
  title: 'Three Column Text',
  type: 'object',
  icon: () => '▤',
  fields: [
    {
      name: 'heading',
      title: 'Heading',
      description: 'Optional heading above the columns',
      type: 'string',
    },
    {
      name: 'columns',
      title: 'Columns',
      description: 'Add up to three columns of text',
      type: 'array',
      of: [{ type: 'text' }],
      validation: (Rule) => Rule.max(3),
    },
    {
      name: 'variant',
      title: 'Variant',
      type: 'string',
      options: {
        list: [
          { title: 'Even columns', value: 'even' },
          { title: 'Lead column wide', value: 'lead-wide' },
        ],
        layout: 'radio',
      },
      initialValue: 'even',
    },
  ],
  preview: {
    select: { title: 'heading', columns: 'columns' },
    prepare({ title, columns }) {
      return { title: title || 'Three Column Text', subtitle: `${columns?.length || 0} column(s)` }
    },
  },
}
