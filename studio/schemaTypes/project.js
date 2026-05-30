import { orderRankField } from '@sanity/orderable-document-list'

export default {
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    orderRankField({ type: 'project' }),
    {
      name: 'title',
      title: 'Title',
      type: 'string',
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: '.jpg', value: 'jpg' },
          { title: '.mp4', value: 'mp4' },
          { title: '.obj', value: 'obj' },
          { title: 'archive', value: 'archive' },
        ],
        layout: 'radio',
      },
    },
    {
      name: 'coverImage',
      title: 'Cover Image',
      description: 'Used as thumbnail in the list view',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'images',
      title: 'Images',
      description: 'Upload multiple images for this work',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
    },
    {
      name: 'videos',
      title: 'Videos',
      description: 'Upload multiple video files',
      type: 'array',
      of: [
        {
          type: 'file',
          options: { accept: 'video/*' },
          fields: [
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
            },
          ],
        },
      ],
    },
    {
      name: 'codeFiles',
      title: 'Code / Files',
      description: 'Upload source files, ZIPs, PDFs, etc.',
      type: 'array',
      of: [
        {
          type: 'file',
          fields: [
            {
              name: 'label',
              title: 'Label',
              type: 'string',
            },
          ],
        },
      ],
    },
    {
      name: 'glbFile',
      title: 'GLB / 3D Model',
      description: 'Upload a .glb file — shown as a rotating 3D preview on the Works page (.OBJ category)',
      type: 'file',
      options: { accept: '.glb,.gltf' },
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
    },
    {
      name: 'location',
      title: 'Location',
      type: 'string',
    },
    {
      name: 'medium',
      title: 'Medium',
      type: 'string',
    },
    {
      name: 'year',
      title: 'Year',
      type: 'string',
    },
  ],
}
