// tests/unit/components/MainLayout.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock child components
vi.mock('@/components/layout/Header', () => ({
  Header: ({ user }: { user?: unknown }) =>
    React.createElement('div', { 'data-testid': 'header' }, user ? 'logged-in' : 'anon'),
}));

vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: ({ isAdmin }: { isAdmin?: boolean }) =>
    React.createElement(
      'div',
      { 'data-testid': 'sidebar' },
      isAdmin ? 'admin-sidebar' : 'user-sidebar',
    ),
}));

vi.mock('@/components/shared/SseProvider', () => ({
  SseProvider: ({ children, userId }: { children: React.ReactNode; userId?: string }) =>
    React.createElement(
      'div',
      { 'data-testid': 'sse-provider', 'data-userid': userId ?? '' },
      children,
    ),
}));

import { MainLayout } from '@/components/layout/MainLayout';

describe('MainLayout', () => {
  it('should render Header, Sidebar, and children', () => {
    render(
      <MainLayout>
        <div data-testid="content">Hello</div>
      </MainLayout>,
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('should pass user to Header', () => {
    render(
      <MainLayout user={{ name: 'Alice', email: 'a@b.com', image: null }}>
        <div>child</div>
      </MainLayout>,
    );

    expect(screen.getByTestId('header')).toHaveTextContent('logged-in');
  });

  it('should pass isAdmin to Sidebar', () => {
    render(
      <MainLayout isAdmin>
        <div>child</div>
      </MainLayout>,
    );

    expect(screen.getByTestId('sidebar')).toHaveTextContent('admin-sidebar');
  });

  it('should pass userId to SseProvider', () => {
    render(
      <MainLayout userId="u1">
        <div>child</div>
      </MainLayout>,
    );

    expect(screen.getByTestId('sse-provider')).toHaveAttribute('data-userid', 'u1');
  });

  it('should pass empty userId to SseProvider when not provided', () => {
    render(
      <MainLayout>
        <div>child</div>
      </MainLayout>,
    );

    expect(screen.getByTestId('sse-provider')).toHaveAttribute('data-userid', '');
  });
});
