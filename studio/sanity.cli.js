import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '18oh8tdj',
    dataset: 'production'
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
    appId: 'klx0pzqzo2xs3cksr35902x1',
  }
})
