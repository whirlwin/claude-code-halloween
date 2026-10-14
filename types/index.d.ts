export type IsHidden = boolean

declare module 'claude-code' {
  interface PluginState {
    'haunted-claude': { isHidden: IsHidden }
  }
}
