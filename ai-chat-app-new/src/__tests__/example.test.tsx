import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Simple test to validate testing environment
describe('Testing Environment', () => {
  test('should render a simple component', () => {
    const TestComponent = () => <div>Hello Test World</div>
    
    render(<TestComponent />)
    
    expect(screen.getByText('Hello Test World')).toBeInTheDocument()
  })

  test('should support async testing', async () => {
    const AsyncComponent = () => {
      return <div>Async Content</div>
    }
    
    render(<AsyncComponent />)
    
    const element = await screen.findByText('Async Content')
    expect(element).toBeInTheDocument()
  })
})