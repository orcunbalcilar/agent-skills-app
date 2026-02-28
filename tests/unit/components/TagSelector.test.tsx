// tests/unit/components/TagSelector.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockTags = [
  { id: 't1', name: 'python', isSystem: true },
  { id: 't2', name: 'frontend', isSystem: true },
  { id: 't3', name: 'custom', isSystem: false },
];

const mockCreateTag = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/features/tags/hooks/useTags', () => ({
  useTags: () => ({ data: mockTags }),
  useCreateTag: () => mockCreateTag,
}));

import { TagSelector } from '@/features/tags/components/TagSelector';

describe('TagSelector', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all tags', () => {
    render(<TagSelector selected={[]} onChange={onChange} />);
    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('custom')).toBeInTheDocument();
  });

  it('should use Star icon for system tags instead of emoji', () => {
    const { container } = render(<TagSelector selected={[]} onChange={onChange} />);
    // Should have SVG icons for system tags
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    // Should not contain ⭐ emoji
    expect(container.textContent).not.toContain('⭐');
  });

  it('should toggle tag on click', () => {
    render(<TagSelector selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('python'));
    expect(onChange).toHaveBeenCalledWith(['t1']);
  });

  it('should deselect tag when already selected', () => {
    render(<TagSelector selected={['t1']} onChange={onChange} />);
    fireEvent.click(screen.getByText('python'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('should show selected count', () => {
    render(<TagSelector selected={['t1', 't2']} onChange={onChange} max={10} />);
    expect(screen.getByText('2/10 tags selected')).toBeInTheDocument();
  });

  it('should render custom tag input', () => {
    render(<TagSelector selected={[]} onChange={onChange} />);
    expect(screen.getByPlaceholderText('Add custom tag...')).toBeInTheDocument();
  });

  it('should add existing tag by name via custom input', async () => {
    render(<TagSelector selected={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Add custom tag...');
    fireEvent.change(input, { target: { value: 'python' } });
    fireEvent.click(screen.getByText('Add'));

    expect(onChange).toHaveBeenCalledWith(['t1']);
  });

  it('should create new tag via custom input', async () => {
    mockCreateTag.mutateAsync.mockResolvedValue({ data: { id: 'new-id', name: 'new-tag' } });
    render(<TagSelector selected={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Add custom tag...');
    fireEvent.change(input, { target: { value: 'new-tag' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(mockCreateTag.mutateAsync).toHaveBeenCalledWith('new-tag');
    });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['new-id']);
    });
  });

  it('should not add created tag if already selected', async () => {
    mockCreateTag.mutateAsync.mockResolvedValue({ data: { id: 'new-id', name: 'new-tag' } });
    render(<TagSelector selected={['new-id']} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Add custom tag...');
    fireEvent.change(input, { target: { value: 'new-tag' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(mockCreateTag.mutateAsync).toHaveBeenCalledWith('new-tag');
    });
    // onChange should NOT be called because the tag is already selected
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should disable Add button when at max', () => {
    render(<TagSelector selected={['t1', 't2']} onChange={onChange} max={2} />);
    const addButton = screen.getByText('Add');
    expect(addButton).toBeDisabled();
  });

  it('should handle Enter key on custom input', () => {
    render(<TagSelector selected={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Add custom tag...');
    fireEvent.change(input, { target: { value: 'python' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalled();
  });

  it('should not trigger add on non-Enter key', () => {
    render(<TagSelector selected={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Add custom tag...');
    fireEvent.change(input, { target: { value: 'python' } });
    fireEvent.keyDown(input, { key: 'a' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should not exceed max tags', () => {
    render(<TagSelector selected={['t1', 't2']} onChange={onChange} max={2} />);
    fireEvent.click(screen.getByText('custom'));
    // Should not call onChange since we're at max
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should handle create tag failure gracefully', async () => {
    mockCreateTag.mutateAsync.mockRejectedValue(new Error('fail'));
    render(<TagSelector selected={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Add custom tag...');
    fireEvent.change(input, { target: { value: 'failing-tag' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(mockCreateTag.mutateAsync).toHaveBeenCalled();
    });
    // Should not crash
    expect(screen.getByPlaceholderText('Add custom tag...')).toBeInTheDocument();
  });

  it('should not add empty custom tags', () => {
    render(<TagSelector selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('Add'));
    expect(onChange).not.toHaveBeenCalled();
    expect(mockCreateTag.mutateAsync).not.toHaveBeenCalled();
  });

  it('should not add duplicate of already selected tag', () => {
    render(<TagSelector selected={['t1']} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Add custom tag...');
    fireEvent.change(input, { target: { value: 'python' } });
    fireEvent.click(screen.getByText('Add'));
    // Should not add since t1 (python) is already selected
    expect(onChange).not.toHaveBeenCalled();
  });
});
