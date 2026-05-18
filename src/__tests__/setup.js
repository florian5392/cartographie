import '@testing-library/jest-dom'

// Polyfill crypto.randomUUID in jsdom
if (!globalThis.crypto) {
  globalThis.crypto = {}
}
if (!globalThis.crypto.randomUUID) {
  let counter = 0
  globalThis.crypto.randomUUID = () => `test-uuid-${++counter}`
}

// Silence React Flow's ResizeObserver warning in jsdom
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
