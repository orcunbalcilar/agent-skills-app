// tests/unit/components/CategoryFilter.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const { mockUseTags } = vi.hoisted(() => ({
  mockUseTags: vi.fn(),
}));

vi.mock('@/features/tags/hooks/useTags', () => ({
  useTags: mockUseTags,
}));

import { CategoryFilter } from '@/features/tags/components/CategoryFilter';

const systemTags = [
  { id: 't1', name: 'python', isSystem: true },
  { id: 't2', name: 'frontend', isSystem: true },
];

const mixedTags = [...systemTags, { id: 't3', name: 'custom-tag', isSystem: false }];

describe('CategoryFilter', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTags.mockReturnValue({ data: mixedTags });
  });

  it('should render Categories heading', () => {
    render(<CategoryFilter selected={[]} onChange={onChange} />);
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('should render only system tags', () => {
    render(<CategoryFilter selected={[]} onChange={onChange} />);
    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.queryByText('custom-tag')).not.toBeInTheDocument();
  });

  it('should show Star icons for categories', () => {
    const { container } = render(<CategoryFilter selected={[]} onChange={onChange} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('should toggle tag when clicked', () => {
    render(<CategoryFilter selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('python'));
    expect(onChange).toHaveBeenCalledWith(['t1']);
  });

  it('should deselect tag when already selected', () => {
    render(<CategoryFilter selected={['t1']} onChange={onChange} />);
    fireEvent.click(screen.getByText('python'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('should render selected tags with default variant', () => {
    render(<CategoryFilter selected={['t1']} onChange={onChange} />);
    const pythonBadge = screen.getByText('python').closest('[data-slot="badge"]');
    expect(pythonBadge).toBeTruthy();
  });

  it('should return null when no system tags exist', () => {
    mockUseTags.mockReturnValue({ data: [{ id: 't3', name: 'custom', isSystem: false }] });
    const { container } = render(<CategoryFilter selected={[]} onChange={onChange} />);
    expect(container.innerHTML).toBe('');
  });

  it('should return null when tags are undefined', () => {
    mockUseTags.mockReturnValue({ data: undefined });
    const { container } = render(<CategoryFilter selected={[]} onChange={onChange} />);
    expect(container.innerHTML).toBe('');
  });

  it('should apply selected styling', () => {
    render(<CategoryFilter selected={['t1']} onChange={onChange} />);
    const badge = screen.getByText('python').closest('[data-slot="badge"]');
    expect(badge?.className).toContain('shadow-sm');
  });

  it('should toggle tag on Enter key', () => {
    render(<CategoryFilter selected={[]} onChange={onChange} />);
    fireEvent.keyDown(screen.getByText('python'), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['t1']);
  });

  it('should toggle tag on Space key', () => {
    render(<CategoryFilter selected={[]} onChange={onChange} />);
    fireEvent.keyDown(screen.getByText('python'), { key: ' ' });
    expect(onChange).toHaveBeenCalledWith(['t1']);
  });

  it('should not toggle tag on other keys', () => {
    render(<CategoryFilter selected={[]} onChange={onChange} />);
    fireEvent.keyDown(screen.getByText('python'), { key: 'Tab' });
    expect(onChange).not.toHaveBeenCalled();
  });
});
