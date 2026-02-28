// tests/unit/components/SkillForm.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const { mockPush, mockBack } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockBack: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

vi.mock('@/features/tags/components/TagSelector', () => ({
  TagSelector: ({
    selected,
    onChange,
  }: {
    selected: string[];
    onChange: (tags: string[]) => void;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'tag-selector' },
      React.createElement(
        'button',
        { type: 'button', onClick: () => onChange([...selected, 'new-tag']) },
        'Toggle tag',
      ),
    ),
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

vi.mock('@/features/skills/components/SkillCodeEditor', () => ({
  SkillCodeEditor: ({ path, onChange }: { path: string; onChange: (v: string) => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'code-editor' },
      React.createElement(
        'button',
        { onClick: () => onChange('modified content') },
        `edit-${path}`,
      ),
    ),
}));

const mockCreateSkill = { mutateAsync: vi.fn(), isPending: false };
const mockUpdateSkill = { mutateAsync: vi.fn(), isPending: false };
const mockReleaseSkill = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/features/skills/hooks/useSkillMutations', () => ({
  useCreateSkill: () => mockCreateSkill,
  useUpdateSkill: () => mockUpdateSkill,
  useReleaseSkill: () => mockReleaseSkill,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? React.createElement('div', { role: 'dialog' }, children) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', null, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

import { SkillForm } from '@/features/skills/components/SkillForm';

const editData = {
  id: 's1',
  name: 'Test',
  description: 'desc',
  spec: { name: 'Test', description: 'desc' },
  files: [
    { path: 'SKILL.md', content: '# Skill' },
    { path: 'scripts/setup.sh', content: '#!/bin/bash' },
  ],
  tags: ['t1'],
  status: 'TEMPLATE',
};

describe('SkillForm', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ data: null }), { status: 200 }));
  });

  it('should render create mode title', () => {
    render(<SkillForm mode="create" />);
    expect(screen.getByText('Create New Skill')).toBeInTheDocument();
  });

  it('should render edit mode title', () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    expect(screen.getByText('Edit Skill')).toBeInTheDocument();
  });

  it('should render cancel button in edit mode', () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should not render cancel button in create mode', () => {
    render(<SkillForm mode="create" />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('should navigate back directly when cancel is clicked with no changes', () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('should show unsaved changes dialog when cancel is clicked with dirty state', async () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    fireEvent.click(screen.getByText('Toggle tag'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockBack).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('Discard changes?')).toBeInTheDocument();
    });
  });

  it('should navigate back when discard is confirmed', async () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    fireEvent.click(screen.getByText('Toggle tag'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByText('Discard changes')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Discard changes'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('should stay on form when keep editing is clicked', async () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    fireEvent.click(screen.getByText('Toggle tag'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByText('Keep editing')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Keep editing'));
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
  });

  it('should render file upload input', () => {
    render(<SkillForm mode="create" />);
    expect(screen.getByLabelText(/upload skill folder/i)).toBeInTheDocument();
  });

  it('should render release button for template in edit mode', () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    expect(screen.getByRole('button', { name: 'Release' })).toBeInTheDocument();
  });

  it('should not render release button for released skills', () => {
    render(<SkillForm mode="edit" initialData={{ ...editData, status: 'RELEASED' }} />);
    expect(screen.queryByRole('button', { name: 'Release' })).not.toBeInTheDocument();
  });

  it('should render edit message field in edit mode', () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    expect(screen.getByPlaceholderText('Describe what you changed...')).toBeInTheDocument();
  });

  it('should mark dirty when edit message changes', async () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    const editInput = screen.getByPlaceholderText('Describe what you changed...');
    fireEvent.change(editInput, { target: { value: 'Updated something' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByText('Discard changes?')).toBeInTheDocument();
    });
  });

  it('should show error when submitting without spec', () => {
    render(<SkillForm mode="create" />);
    fireEvent.submit(screen.getByRole('button', { name: 'Save as Template' }).closest('form')!);
    expect(screen.getByText('Please upload a valid skill folder (.zip) first')).toBeInTheDocument();
  });

  it('should show tag selector', () => {
    render(<SkillForm mode="create" />);
    expect(screen.getByTestId('tag-selector')).toBeInTheDocument();
  });

  it('should render spec info when parsedSpec is set in edit mode', () => {
    render(
      <SkillForm
        mode="edit"
        initialData={{
          ...editData,
          description: 'A test skill',
          spec: { name: 'Test', description: 'A test skill', license: 'MIT', compatibility: 'v1' },
        }}
      />,
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('MIT')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('should show upload label for edit mode', () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    expect(screen.getByLabelText(/re-upload skill folder/i)).toBeInTheDocument();
  });

  it('should render file tree and editor when files exist in edit mode', () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    expect(screen.getByTestId('file-tree')).toBeInTheDocument();
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
  });

  it('should select first file by default in edit mode', () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    expect(screen.getByText('edit-SKILL.md')).toBeInTheDocument();
  });

  it('should handle file content change and mark dirty', async () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    fireEvent.click(screen.getByText('edit-SKILL.md'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByText('Discard changes?')).toBeInTheDocument();
    });
  });

  it('should switch selected file when clicking in file tree', () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    fireEvent.click(screen.getByText('scripts/setup.sh'));
    expect(screen.getByText('edit-scripts/setup.sh')).toBeInTheDocument();
  });

  describe('upload handling', () => {
    it('should reject files exceeding 10MB', async () => {
      render(<SkillForm mode="create" />);
      const input = screen.getByLabelText(/upload skill folder/i);
      const bigFile = new File(['x'.repeat(100)], 'skill.zip', { type: 'application/zip' });
      Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 });
      fireEvent.change(input, { target: { files: [bigFile] } });
      await waitFor(() => {
        expect(screen.getByText('Zip file exceeds 10 MB limit')).toBeInTheDocument();
      });
    });

    it('should reject non-zip files', async () => {
      render(<SkillForm mode="create" />);
      const input = screen.getByLabelText(/upload skill folder/i);
      const txtFile = new File(['hello'], 'skill.txt', { type: 'text/plain' });
      fireEvent.change(input, { target: { files: [txtFile] } });
      await waitFor(() => {
        expect(
          screen.getByText('Please upload a .zip file containing your skill folder'),
        ).toBeInTheDocument();
      });
    });

    it('should handle successful upload', async () => {
      fetchSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            data: { name: 'My Skill', description: 'A skill' },
            files: [{ path: 'SKILL.md', content: '# My Skill' }],
          }),
          { status: 200 },
        ),
      );
      render(<SkillForm mode="create" />);
      const input = screen.getByLabelText(/upload skill folder/i);
      const zipFile = new File(['zipdata'], 'skill.zip', { type: 'application/zip' });
      fireEvent.change(input, { target: { files: [zipFile] } });
      await waitFor(() => {
        expect(screen.getByText('My Skill')).toBeInTheDocument();
      });
      expect(screen.getByTestId('file-tree')).toBeInTheDocument();
    });

    it('should handle upload API error with details', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Bad zip', details: 'Missing SKILL.md' }), {
          status: 400,
        }),
      );
      render(<SkillForm mode="create" />);
      const input = screen.getByLabelText(/upload skill folder/i);
      const zipFile = new File(['zipdata'], 'skill.zip', { type: 'application/zip' });
      fireEvent.change(input, { target: { files: [zipFile] } });
      await waitFor(() => {
        expect(screen.getByText('Missing SKILL.md')).toBeInTheDocument();
      });
    });

    it('should handle upload API error without details', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Bad zip' }), { status: 400 }),
      );
      render(<SkillForm mode="create" />);
      const input = screen.getByLabelText(/upload skill folder/i);
      const zipFile = new File(['zipdata'], 'skill.zip', { type: 'application/zip' });
      fireEvent.change(input, { target: { files: [zipFile] } });
      await waitFor(() => {
        expect(screen.getByText('Bad zip')).toBeInTheDocument();
      });
    });

    it('should handle upload API error with no details or error', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({}), { status: 400 }));
      render(<SkillForm mode="create" />);
      const input = screen.getByLabelText(/upload skill folder/i);
      const zipFile = new File(['zipdata'], 'skill.zip', { type: 'application/zip' });
      fireEvent.change(input, { target: { files: [zipFile] } });
      await waitFor(() => {
        expect(screen.getByText('Upload validation failed')).toBeInTheDocument();
      });
    });

    it('should handle upload network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));
      render(<SkillForm mode="create" />);
      const input = screen.getByLabelText(/upload skill folder/i);
      const zipFile = new File(['zipdata'], 'skill.zip', { type: 'application/zip' });
      fireEvent.change(input, { target: { files: [zipFile] } });
      await waitFor(() => {
        expect(screen.getByText('Failed to upload file')).toBeInTheDocument();
      });
    });

    it('should ignore empty file input', () => {
      render(<SkillForm mode="create" />);
      const input = screen.getByLabelText(/upload skill folder/i);
      fireEvent.change(input, { target: { files: [] } });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should show validating message during upload', async () => {
      let resolveUpload!: (value: Response) => void;
      fetchSpy.mockReturnValue(
        new Promise((res) => {
          resolveUpload = res;
        }),
      );
      render(<SkillForm mode="create" />);
      const input = screen.getByLabelText(/upload skill folder/i);
      const zipFile = new File(['zipdata'], 'skill.zip', { type: 'application/zip' });
      fireEvent.change(input, { target: { files: [zipFile] } });
      await waitFor(() => {
        expect(screen.getByText('Validating skill folder...')).toBeInTheDocument();
      });
      resolveUpload(
        new Response(
          JSON.stringify({
            data: { name: 'S', description: 'D' },
            files: [{ path: 'SKILL.md', content: '#' }],
          }),
          { status: 200 },
        ),
      );
      await waitFor(() => {
        expect(screen.queryByText('Validating skill folder...')).not.toBeInTheDocument();
      });
    });
  });

  describe('submit handling', () => {
    it('should create skill and navigate on submit in create mode', async () => {
      fetchSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            data: { name: 'Skill', description: 'Desc' },
            files: [{ path: 'SKILL.md', content: '#' }],
          }),
          { status: 200 },
        ),
      );
      mockCreateSkill.mutateAsync.mockResolvedValue({ data: { id: 'new-id' } });
      render(<SkillForm mode="create" />);
      const input = screen.getByLabelText(/upload skill folder/i);
      const zipFile = new File(['zipdata'], 'skill.zip', { type: 'application/zip' });
      fireEvent.change(input, { target: { files: [zipFile] } });
      await waitFor(() => {
        expect(screen.getByText('Skill')).toBeInTheDocument();
      });
      fireEvent.submit(screen.getByRole('button', { name: 'Save as Template' }).closest('form')!);
      await waitFor(() => {
        expect(mockCreateSkill.mutateAsync).toHaveBeenCalled();
      });
      expect(mockPush).toHaveBeenCalledWith('/skills/new-id');
    });

    it('should update skill and navigate on submit in edit mode', async () => {
      mockUpdateSkill.mutateAsync.mockResolvedValue({});
      render(<SkillForm mode="edit" initialData={editData} />);
      fireEvent.submit(screen.getByRole('button', { name: 'Save as Template' }).closest('form')!);
      await waitFor(() => {
        expect(mockUpdateSkill.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 's1',
            name: 'Test',
          }),
        );
      });
      expect(mockPush).toHaveBeenCalledWith('/skills/s1');
    });

    it('should include edit message in update', async () => {
      mockUpdateSkill.mutateAsync.mockResolvedValue({});
      render(<SkillForm mode="edit" initialData={editData} />);
      fireEvent.change(screen.getByPlaceholderText('Describe what you changed...'), {
        target: { value: 'Fixed typo' },
      });
      fireEvent.submit(screen.getByRole('button', { name: 'Save as Template' }).closest('form')!);
      await waitFor(() => {
        expect(mockUpdateSkill.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ editMessage: 'Fixed typo' }),
        );
      });
    });

    it('should show error on create failure', async () => {
      fetchSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            data: { name: 'S', description: 'D' },
            files: [{ path: 'SKILL.md', content: '#' }],
          }),
          { status: 200 },
        ),
      );
      mockCreateSkill.mutateAsync.mockRejectedValue(new Error('Create failed'));
      render(<SkillForm mode="create" />);
      const input = screen.getByLabelText(/upload skill folder/i);
      fireEvent.change(input, {
        target: { files: [new File(['z'], 'skill.zip', { type: 'application/zip' })] },
      });
      await waitFor(() => screen.getByText('S'));
      fireEvent.submit(screen.getByRole('button', { name: 'Save as Template' }).closest('form')!);
      await waitFor(() => {
        expect(screen.getByText('Create failed')).toBeInTheDocument();
      });
    });

    it('should show generic error on non-Error failure', async () => {
      mockUpdateSkill.mutateAsync.mockRejectedValue('unknown');
      render(<SkillForm mode="edit" initialData={editData} />);
      fireEvent.submit(screen.getByRole('button', { name: 'Save as Template' }).closest('form')!);
      await waitFor(() => {
        expect(screen.getByText('Failed to save skill')).toBeInTheDocument();
      });
    });
  });

  describe('release handling', () => {
    it('should open release dialog when Release is clicked', async () => {
      render(<SkillForm mode="edit" initialData={editData} />);
      fireEvent.click(screen.getByRole('button', { name: 'Release' }));
      await waitFor(() => {
        expect(screen.getByText('Release Skill')).toBeInTheDocument();
      });
    });

    it('should release and navigate on confirm', async () => {
      mockReleaseSkill.mutateAsync.mockResolvedValue({});
      render(<SkillForm mode="edit" initialData={editData} />);
      fireEvent.click(screen.getByRole('button', { name: 'Release' }));
      await waitFor(() => {
        expect(screen.getByText('Confirm Release')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Confirm Release'));
      await waitFor(() => {
        expect(mockReleaseSkill.mutateAsync).toHaveBeenCalledWith('s1');
      });
      expect(mockPush).toHaveBeenCalledWith('/skills/s1');
    });

    it('should show error on release failure', async () => {
      mockReleaseSkill.mutateAsync.mockRejectedValue(new Error('Release failed'));
      render(<SkillForm mode="edit" initialData={editData} />);
      fireEvent.click(screen.getByRole('button', { name: 'Release' }));
      await waitFor(() => screen.getByText('Confirm Release'));
      fireEvent.click(screen.getByText('Confirm Release'));
      await waitFor(() => {
        expect(screen.getByText('Release failed')).toBeInTheDocument();
      });
    });

    it('should show generic error on non-Error release failure', async () => {
      mockReleaseSkill.mutateAsync.mockRejectedValue('unknown');
      render(<SkillForm mode="edit" initialData={editData} />);
      fireEvent.click(screen.getByRole('button', { name: 'Release' }));
      await waitFor(() => screen.getByText('Confirm Release'));
      fireEvent.click(screen.getByText('Confirm Release'));
      await waitFor(() => {
        expect(screen.getByText('Failed to release skill')).toBeInTheDocument();
      });
    });

    it('should close release dialog via cancel button', async () => {
      render(<SkillForm mode="edit" initialData={editData} />);
      fireEvent.click(screen.getByRole('button', { name: 'Release' }));
      await waitFor(() => screen.getByText('Release Skill'));
      // The cancel button inside the release dialog
      const buttons = screen.getAllByRole('button', { name: 'Cancel' });
      // The release dialog cancel is within the dialog
      const dialogCancel = buttons.find((b) => b.closest('[role="dialog"]'))!;
      fireEvent.click(dialogCancel);
      await waitFor(() => {
        expect(screen.queryByText('Release Skill')).not.toBeInTheDocument();
      });
    });
  });

  it('should render without files', () => {
    render(
      <SkillForm
        mode="edit"
        initialData={{ ...editData, files: [], spec: { name: 'Test', description: 'desc' } }}
      />,
    );
    expect(screen.queryByTestId('file-tree')).not.toBeInTheDocument();
  });

  it('should show initial tags from initialData', () => {
    render(<SkillForm mode="edit" initialData={editData} />);
    expect(screen.getByTestId('tag-selector')).toBeInTheDocument();
  });

  it('should show Saving... when create is pending', () => {
    Object.assign(mockCreateSkill, { isPending: true });
    render(<SkillForm mode="create" />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    Object.assign(mockCreateSkill, { isPending: false });
  });

  it('should show Releasing... when release is pending', async () => {
    Object.assign(mockReleaseSkill, { isPending: true });
    render(<SkillForm mode="edit" initialData={editData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Release' }));
    await waitFor(() => {
      expect(screen.getByText('Releasing...')).toBeInTheDocument();
    });
    Object.assign(mockReleaseSkill, { isPending: false });
  });

  it('should handle upload response without files', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { name: 'Test', description: 'Desc' },
        }),
        { status: 200 },
      ),
    );
    render(<SkillForm mode="create" />);
    const input = screen.getByLabelText(/upload skill folder/i);
    fireEvent.change(input, {
      target: { files: [new File(['z'], 'skill.zip', { type: 'application/zip' })] },
    });
    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('file-tree')).not.toBeInTheDocument();
  });
});
