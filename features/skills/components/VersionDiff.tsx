// features/skills/components/VersionDiff.tsx
'use client';

import { useState } from 'react';
import { useSkillVersion } from '../hooks/useSkillVersions';
import { SkillDiffEditor } from './SkillCodeEditor';
import { FileTree, type SkillFile } from './FileTree';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface VersionDiffProps {
  skillId: string;
  fromVersion: number;
  toVersion: number;
  onClose: () => void;
}

export function VersionDiff({
  skillId,
  fromVersion,
  toVersion,
  onClose,
}: Readonly<VersionDiffProps>) {
  const { data: from, isLoading: loadingFrom } = useSkillVersion(skillId, fromVersion);
  const { data: to, isLoading: loadingTo } = useSkillVersion(skillId, toVersion);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  if (loadingFrom || loadingTo) {
    return <p className="text-muted-foreground text-sm">Loading versions…</p>;
  }

  if (!from || !to) {
    return <p className="text-muted-foreground text-sm">Failed to load versions.</p>;
  }

  const fromFiles: SkillFile[] = (from.files as SkillFile[] | null) ?? [];
  const toFiles: SkillFile[] = (to.files as SkillFile[] | null) ?? [];

  // Merge all file paths from both versions
  const allPaths = new Set([...fromFiles.map((f) => f.path), ...toFiles.map((f) => f.path)]);
  const mergedFiles: SkillFile[] = Array.from(allPaths)
    .sort((a, b) => a.localeCompare(b))
    .map((path) => ({ path, content: '' }));

  const activePath = selectedPath ?? mergedFiles[0]?.path ?? null;

  const originalContent = fromFiles.find((f) => f.path === activePath)?.content ?? '';
  const modifiedContent = toFiles.find((f) => f.path === activePath)?.content ?? '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">v{fromVersion}</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="outline">v{toVersion}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close diff
        </Button>
      </div>

      {mergedFiles.length > 0 && activePath ? (
        <div className="flex gap-4">
          <div className="w-60 shrink-0">
            <FileTree files={mergedFiles} selectedPath={activePath} onSelect={setSelectedPath} />
          </div>
          <div className="min-w-0 flex-1">
            <SkillDiffEditor
              path={activePath}
              original={originalContent}
              modified={modifiedContent}
            />
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No files to compare.</p>
      )}
    </div>
  );
}
