// tests/unit/components/VersionDiff.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/features/skills/hooks/useSkillVersions', () => ({
  useSkillVersion: vi.fn(),
}));

vi.mock('@/features/skills/components/SkillCodeEditor', () => ({
  SkillDiffEditor: ({ path }: { path: string }) =>
    React.createElement('div', { 'data-testid': 'diff-editor' }, `diff: ${path}`),
}));

vi.mock('@/features/skills/components/FileTree', () => ({
  FileTree: ({
    files,
    onSelect,
  }: {
    files: Array<{ path: string }>;
    onSelect: (p: string) => void;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'file-tree' },
      files.map((f) =>
        React.createElement('button', { key: f.path, onClick: () => onSelect(f.path) }, f.path),
      ),
    ),
}));

import { VersionDiff } from '@/features/skills/components/VersionDiff';
import { useSkillVersion } from '@/features/skills/hooks/useSkillVersions';

describe('VersionDiff', () => {
  it('should show loading state', () => {
    vi.mocked(useSkillVersion)
      .mockReturnValueOnce({ data: undefined, isLoading: true } as never)
      .mockReturnValueOnce({ data: undefined, isLoading: true } as never);

    render(<VersionDiff skillId="s1" fromVersion={1} toVersion={2} onClose={() => {}} />);
    expect(screen.getByText(/Loading versions/)).toBeInTheDocument();
  });

  it('should show error when version not found', () => {
    vi.mocked(useSkillVersion)
      .mockReturnValueOnce({ data: undefined, isLoading: false } as never)
      .mockReturnValueOnce({ data: undefined, isLoading: false } as never);

    render(<VersionDiff skillId="s1" fromVersion={1} toVersion={2} onClose={() => {}} />);
    expect(screen.getByText(/Failed to load versions/)).toBeInTheDocument();
  });

  it('should render diff with version badges and arrow icon', () => {
    vi.mocked(useSkillVersion)
      .mockReturnValueOnce({
        data: { files: [{ path: 'SKILL.md', content: 'old' }] },
        isLoading: false,
      } as never)
      .mockReturnValueOnce({
        data: { files: [{ path: 'SKILL.md', content: 'new' }] },
        isLoading: false,
      } as never);

    const { container } = render(
      <VersionDiff skillId="s1" fromVersion={1} toVersion={2} onClose={() => {}} />,
    );
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    // Should use Lucide ArrowRight icon instead of → text
    expect(container.textContent).not.toContain('→');
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('should render file tree and diff editor', () => {
    vi.mocked(useSkillVersion)
      .mockReturnValueOnce({
        data: { files: [{ path: 'SKILL.md', content: 'old' }] },
        isLoading: false,
      } as never)
      .mockReturnValueOnce({
        data: { files: [{ path: 'SKILL.md', content: 'new' }] },
        isLoading: false,
      } as never);

    render(<VersionDiff skillId="s1" fromVersion={1} toVersion={2} onClose={() => {}} />);
    expect(screen.getByTestId('file-tree')).toBeInTheDocument();
    expect(screen.getByTestId('diff-editor')).toBeInTheDocument();
  });

  it('should handle no files case', () => {
    vi.mocked(useSkillVersion)
      .mockReturnValueOnce({
        data: { files: null },
        isLoading: false,
      } as never)
      .mockReturnValueOnce({
        data: { files: null },
        isLoading: false,
      } as never);

    render(<VersionDiff skillId="s1" fromVersion={1} toVersion={2} onClose={() => {}} />);
    expect(screen.getByText(/No files to compare/)).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    vi.mocked(useSkillVersion)
      .mockReturnValueOnce({
        data: { files: [{ path: 'SKILL.md', content: 'old' }] },
        isLoading: false,
      } as never)
      .mockReturnValueOnce({
        data: { files: [{ path: 'SKILL.md', content: 'new' }] },
        isLoading: false,
      } as never);

    const onClose = vi.fn();
    render(<VersionDiff skillId="s1" fromVersion={1} toVersion={2} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close diff'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should switch file when clicking in file tree', () => {
    vi.mocked(useSkillVersion).mockImplementation(
      (_id: string, version: number | null) =>
        ({
          data:
            version === 1
              ? {
                  files: [
                    { path: 'SKILL.md', content: 'old' },
                    { path: 'scripts/run.sh', content: 'old-sh' },
                  ],
                }
              : {
                  files: [
                    { path: 'SKILL.md', content: 'new' },
                    { path: 'scripts/run.sh', content: 'new-sh' },
                  ],
                },
          isLoading: false,
        }) as never,
    );

    render(<VersionDiff skillId="s1" fromVersion={1} toVersion={2} onClose={() => {}} />);
    fireEvent.click(screen.getByText('scripts/run.sh'));
    expect(screen.getByText('diff: scripts/run.sh')).toBeInTheDocument();
  });
});
