export default {
  name: 'sketchEmbed',
  title: 'Interactive sketch',
  type: 'object',
  icon: () => '◉',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
    },
    {
      name: 'url',
      title: 'Hosted sketch URL',
      description: 'Preferred — link to a hosted sketch. p5.js Web Editor /full/ links are rewritten to /embed/ automatically so the editor title bar is hidden.',
      type: 'url',
    },
    {
      name: 'code',
      title: 'Or paste full HTML',
      description: 'A complete index.html including the p5 script tags. Only used when no URL is set.',
      type: 'text',
      rows: 20,
    },
    {
      name: 'size',
      title: 'Size',
      type: 'string',
      options: {
        list: [
          { title: 'Full width', value: 'full' },
          { title: 'Large (1400px)', value: 'large' },
          { title: 'Medium (1000px)', value: 'medium' },
          { title: 'Small (700px)', value: 'small' },
        ],
        layout: 'radio',
      },
      initialValue: 'medium',
    },
    {
      name: 'aspectRatio',
      title: 'Aspect Ratio',
      description: 'CSS aspect-ratio value, e.g. 4 / 3 or 16 / 9',
      type: 'string',
      initialValue: '4 / 3',
    },
  ],
  validation: (Rule) =>
    Rule.custom((value) =>
      value?.url || value?.code ? true : 'Add either a hosted sketch URL or pasted HTML'
    ),
  preview: {
    select: { title: 'title', url: 'url', code: 'code' },
    prepare({ title, url, code }) {
      return {
        title: title || 'Interactive sketch',
        subtitle: url ? `URL embed · ${url}` : code ? 'Code embed' : 'Empty',
      }
    },
  },
}
