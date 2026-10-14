export type IsHidden = boolean

declare module 'claude-code' {
  interface PluginState {
    'halloween': { isHidden: IsHidden }
  }
}
