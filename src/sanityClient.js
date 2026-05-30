import { createClient } from '@sanity/client'

export const client = createClient({
  projectId: '18oh8tdj',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
})