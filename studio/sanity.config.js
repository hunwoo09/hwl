import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'
import {schemaTypes} from './schemaTypes'

const structure = (S, context) =>
  S.list()
    .title('Content')
    .items([
      orderableDocumentListDeskItem({
        type: 'project', id: 'orderable-jpg', title: '.JPG',
        filter: '_type == "project" && category == "jpg"',
        S, context,
      }),
      orderableDocumentListDeskItem({
        type: 'project', id: 'orderable-mp4', title: '.MP4',
        filter: '_type == "project" && category == "mp4"',
        S, context,
      }),
      orderableDocumentListDeskItem({
        type: 'project', id: 'orderable-obj', title: '.OBJ',
        filter: '_type == "project" && category == "obj"',
        S, context,
      }),
      orderableDocumentListDeskItem({
        type: 'project', id: 'orderable-archive', title: 'Archive',
        filter: '_type == "project" && category == "archive"',
        S, context,
      }),
      S.divider(),
      S.listItem()
        .title('About')
        .child(
          S.editor()
            .title('About')
            .schemaType('about')
            .documentId('about')
        ),
      S.divider(),
      S.listItem()
        .title('All Projects')
        .child(
          S.documentList()
            .title('All Projects')
            .filter('_type == "project"')
        ),
    ])

export default defineConfig({
  name: 'default',
  title: 'hwl',

  projectId: '18oh8tdj',
  dataset: 'production',

  plugins: [structureTool({ structure }), visionTool()],

  schema: {
    types: schemaTypes,
  },
})
