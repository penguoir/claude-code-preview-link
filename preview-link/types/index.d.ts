export type PreviewLink = { url: string; seenAt: number }
export type PreviewLogin = { email: string; password: string }

declare module 'claude-code' {
  interface PluginState {
    'preview-link': { latest: PreviewLink | null; login: PreviewLogin | null }
  }
}
