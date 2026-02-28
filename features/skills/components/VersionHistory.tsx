// features/skills/components/VersionHistory.tsx
'use client';

import { useState } from 'react';
import { useSkillVersions, type VersionSummary } from '../hooks/useSkillVersions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function getCompareLabel(compareFrom: number | null, version: number): string {
  if (compareFrom === null) return 'Compare';
  if (compareFrom === version) return 'Selected';
  return 'Compare with';
}

interface VersionHistoryProps {
  skillId: string;
  currentVersion: number;
  onSelectVersion: (version: number) => void;
  onCompare: (from: number, to: number) => void;
}

export function VersionHistory({
  skillId,
  currentVersion,
  onSelectVersion,
  onCompare,
}: Readonly<VersionHistoryProps>) {
  const [page, setPage] = useState(1);
  const [compareFrom, setCompareFrom] = useState<number | null>(null);
  const { data, isLoading } = useSkillVersions(skillId, page);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading version history…</p>;
  }

  if (!data || data.data.length === 0) {
    return <p className="text-muted-foreground text-sm">No version history yet.</p>;
  }

  const handleCompareClick = (v: VersionSummary) => {
    if (compareFrom === null) {
      setCompareFrom(v.version);
    } else {
      onCompare(Math.min(compareFrom, v.version), Math.max(compareFrom, v.version));
      setCompareFrom(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Version History</h3>
        {compareFrom !== null && (
          <Button variant="ghost" size="sm" onClick={() => setCompareFrom(null)}>
            Cancel compare
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {data.data.map((v) => (
          <div
            key={v.id}
            className="hover:bg-muted/50 flex items-center gap-3 rounded-md border p-3 transition-colors"
          >
            <Badge
              variant={v.version === currentVersion ? 'default' : 'outline'}
              className="shrink-0"
            >
              v{v.version}
            </Badge>

            {v.editedBy && (
              <Avatar className="size-5">
                <AvatarImage src={v.editedBy.avatarUrl ?? undefined} />
                <AvatarFallback>{v.editedBy.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{v.message || 'No message'}</p>
              <p className="text-muted-foreground text-xs">
                {new Date(v.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => onSelectVersion(v.version)}>
                View
              </Button>
              <Button
                variant={compareFrom === v.version ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleCompareClick(v)}
              >
                {getCompareLabel(compareFrom, v.version)}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-xs">
            Page {page} of {data.meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
