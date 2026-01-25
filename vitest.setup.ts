import { vi } from 'vitest'

// Mock next/cache functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}))

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
