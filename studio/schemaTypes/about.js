export default {
  name: 'about',
  title: 'About',
  type: 'document',
  fields: [
    { name: 'name',        title: 'Name',        type: 'string' },
    { name: 'nameKorean',  title: 'Korean Name',  type: 'string' },
    { name: 'role',        title: 'Role',         type: 'string' },
    { name: 'location',    title: 'Location',     type: 'string' },
    { name: 'bio',         title: 'Bio',          type: 'text',
      description: 'Short paragraph about yourself, shown beneath location on the About page.' },
    {
      name: 'education',
      title: 'Education',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'abbr',  title: 'Abbreviation', type: 'string' },
          { name: 'full',  title: 'Full Name',    type: 'string' },
          { name: 'years', title: 'Years',        type: 'string' },
        ],
        preview: { select: { title: 'abbr', subtitle: 'full' } },
      }],
    },
    {
      name: 'exhibitions',
      title: 'Exhibitions',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Title', type: 'string' },
          { name: 'event', title: 'Event', type: 'string' },
          { name: 'venue', title: 'Venue', type: 'string' },
        ],
        preview: { select: { title: 'title', subtitle: 'event' } },
      }],
    },
    {
      name: 'social',
      title: 'Social Links',
      type: 'object',
      fields: [
        { name: 'instagram', title: 'Instagram URL', type: 'url' },
        { name: 'email',     title: 'Email Address', type: 'string' },
        { name: 'linkedin',  title: 'LinkedIn URL',  type: 'url' },
      ],
    },
    {
      name: 'experiences',
      title: 'Experiences',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'role', title: 'Role',         type: 'string' },
          { name: 'org',  title: 'Organization', type: 'string' },
          { name: 'sub',  title: 'Sub Text',     type: 'string' },
        ],
        preview: { select: { title: 'role', subtitle: 'org' } },
      }],
    },
  ],
}
