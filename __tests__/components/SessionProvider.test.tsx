import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import SessionProvider from '@/components/SessionProvider'
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  SessionProvider: jest.fn(({ children }) => <div data-testid="session-provider">{children}</div>),
}))

describe('SessionProvider', () => {
  it('should render NextAuth SessionProvider with children', () => {
    const { container } = render(
      <SessionProvider>
        <div>Test Content</div>
      </SessionProvider>
    )

    expect(container.querySelector('[data-testid="session-provider"]')).toBeInTheDocument()
    expect(container.textContent).toContain('Test Content')
  })

  it('should pass children to NextAuth SessionProvider', () => {
    render(
      <SessionProvider>
        <div data-testid="child">Child Content</div>
      </SessionProvider>
    )

    expect(NextAuthSessionProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        children: expect.anything(),
      }),
      expect.anything()
    )
  })
})
