import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../../components/ErrorBoundary';

// Component that throws an error
const ErrorComponent = () => {
  throw new Error('Test error');
};

// Component that doesn't throw an error
const SafeComponent = () => <div>Safe component</div>;

describe('ErrorBoundary', () => {
  // Mock console.error to avoid noise in test output
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe component')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong.')).toBeInTheDocument();
    expect(screen.getByText("We're sorry, but something unexpected happened.")).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();

    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  it('does not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development Only)')).not.toBeInTheDocument();

    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  it('allows retrying after an error', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    // Initially shows error
    expect(screen.getByText('Oops! Something went wrong.')).toBeInTheDocument();

    // Click try again button
    fireEvent.click(screen.getByText('Try Again'));

    // Rerender with safe component - the state should reset
    rerender(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe component')).toBeInTheDocument();
  });

  it('logs errors to console', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    );
  });
});
