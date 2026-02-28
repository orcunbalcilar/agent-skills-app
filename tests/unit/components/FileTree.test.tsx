// tests/unit/components/FileTree.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { FileTree, type SkillFile } from '@/features/skills/components/FileTree';

describe('FileTree', () => {
  const mockFiles: SkillFile[] = [
    { path: 'SKILL.md', content: '# Skill' },
    { path: 'scripts/setup.sh', content: '#!/bin/bash' },
    { path: 'scripts/test.ts', content: 'console.log()' },
    { path: 'references/doc.json', content: '{}' },
    { path: 'config.yaml', content: 'key: value' },
    { path: 'main.py', content: 'print()' },
    { path: 'data.csv', content: 'a,b' },
  ];

  it('should render file tree with files', () => {
    render(<FileTree files={mockFiles} selectedPath={null} onSelect={() => {}} />);
    expect(screen.getByText('SKILL.md')).toBeInTheDocument();
    expect(screen.getByText('scripts')).toBeInTheDocument();
    expect(screen.getByText('references')).toBeInTheDocument();
  });

  it('should render Files heading', () => {
    render(<FileTree files={mockFiles} selectedPath={null} onSelect={() => {}} />);
    expect(screen.getByText('Files')).toBeInTheDocument();
  });

  it('should call onSelect when file is clicked', () => {
    const onSelect = vi.fn();
    render(<FileTree files={mockFiles} selectedPath={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('SKILL.md'));
    expect(onSelect).toHaveBeenCalledWith('SKILL.md');
  });

  it('should highlight selected file', () => {
    render(<FileTree files={mockFiles} selectedPath="SKILL.md" onSelect={() => {}} />);
    const btn = screen.getByText('SKILL.md').closest('button');
    expect(btn?.className).toContain('bg-accent');
  });

  it('should collapse/expand directory on click', () => {
    render(<FileTree files={mockFiles} selectedPath={null} onSelect={() => {}} />);
    // Scripts dir contains setup.sh and test.ts
    expect(screen.getByText('setup.sh')).toBeInTheDocument();
    // Click to collapse
    fireEvent.click(screen.getByText('scripts'));
    expect(screen.queryByText('setup.sh')).not.toBeInTheDocument();
    // Click to expand
    fireEvent.click(screen.getByText('scripts'));
    expect(screen.getByText('setup.sh')).toBeInTheDocument();
  });

  it('should use Lucide icons instead of emoji', () => {
    const { container } = render(
      <FileTree files={mockFiles} selectedPath={null} onSelect={() => {}} />,
    );
    // Should not contain any emoji characters
    const textContent = container.textContent ?? '';
    expect(textContent).not.toMatch(/📁|📄|🟦|🟨|📋|⚙️|🐍|🖥️|📃|▼|▶/);
    // Should have SVG icons (Lucide renders as SVG)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('should render empty tree gracefully', () => {
    const { container } = render(<FileTree files={[]} selectedPath={null} onSelect={() => {}} />);
    expect(container).toBeTruthy();
    expect(screen.getByText('Files')).toBeInTheDocument();
  });

  it('should render nested directory structure', () => {
    const nested: SkillFile[] = [{ path: 'src/lib/utils.ts', content: '' }];
    render(<FileTree files={nested} selectedPath={null} onSelect={() => {}} />);
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('lib')).toBeInTheDocument();
    expect(screen.getByText('utils.ts')).toBeInTheDocument();
  });
});
