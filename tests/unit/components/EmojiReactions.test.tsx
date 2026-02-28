// tests/unit/components/EmojiReactions.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { EmojiReactions } from '@/features/skills/components/EmojiReactions';

describe('EmojiReactions', () => {
  it('should render emoji buttons with counts', () => {
    render(<EmojiReactions counts={{ THUMBS_UP: 5, HEART: 2 }} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show active state for user reactions', () => {
    render(<EmojiReactions counts={{ THUMBS_UP: 5 }} userReactions={['THUMBS_UP']} />);
    const btn = screen.getByLabelText('Thumbs up (5)');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('should call onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<EmojiReactions counts={{ HEART: 1 }} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText('Heart (1)'));
    expect(onToggle).toHaveBeenCalledWith('HEART');
  });

  it('should hide zero-count reactions when disabled', () => {
    render(<EmojiReactions counts={{ THUMBS_UP: 0, HEART: 3 }} disabled />);
    expect(screen.queryByLabelText('Thumbs up')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Heart (3)')).toBeInTheDocument();
  });

  it('should show zero-count reactions when not disabled', () => {
    render(<EmojiReactions counts={{ THUMBS_UP: 0 }} />);
    expect(screen.getByLabelText('Thumbs up')).toBeInTheDocument();
  });

  it('should render accessible fieldset', () => {
    const { container } = render(<EmojiReactions counts={{ THUMBS_UP: 1 }} />);
    expect(container.querySelector('fieldset')).toBeTruthy();
    expect(screen.getByText('Emoji reactions')).toBeInTheDocument();
  });
});
