import client from './client'

export const versionApi = {
  getLatest: async (): Promise<string> => {
    try {
      const { data } = await client.get('/app/version')
      return data.version
    } catch {
      return 'unknown'
    }
  }
}