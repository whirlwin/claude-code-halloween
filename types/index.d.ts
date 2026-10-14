export type IsHidden = boolean

declare module 'claude-code' {
  interface PluginState {
    'haunted-clawd': { isHidden: IsHidden }
  }
}
