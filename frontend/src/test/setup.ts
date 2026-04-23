import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import { testServer } from './mocks/server'

// Mock URL.createObjectURL 和 revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// 每个测试后自动清理
afterEach(() => {
  cleanup()
})

// 启动 MSW 服务器
beforeAll(() => {
  testServer.listen({ onUnhandledRequest: 'error' })
})

// 重置 handlers
afterEach(() => {
  testServer.resetHandlers()
})

// 关闭 MSW 服务器
afterAll(() => {
  testServer.close()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Suppress console errors during tests (optional)
// Uncomment if you want to hide console.error in tests
// vi.spyOn(console, 'error').mockImplementation(() => {})
