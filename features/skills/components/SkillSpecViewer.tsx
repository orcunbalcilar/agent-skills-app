// features/skills/components/SkillSpecViewer.tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileTree, type SkillFile } from './FileTree';
import { SkillCodeEditor } from './SkillCodeEditor';
import type { SkillSpec } from '@/lib/skill-schema';

interface SkillSpecViewerProps {
  spec: SkillSpec | Record<string, unknown>;
  files?: SkillFile[];
}

export function SkillSpecViewer({ spec, files }: Readonly<SkillSpecViewerProps>) {
  const s = spec as Partial<SkillSpec>;
  const [selectedPath, setSelectedPath] = useState<string | null>(files?.[0]?.path ?? null);

  const selectedFile = files?.find((f) => f.path === selectedPath);

  return (
    <div className="space-y-4">
      {s.description && (
        <div>
          <h3 className="text-muted-foreground mb-1 text-sm font-semibold">Description</h3>
          <p className="text-sm">{s.description}</p>
        </div>
      )}

      {s.license && (
        <div>
          <h3 className="text-muted-foreground mb-1 text-sm font-semibold">License</h3>
          <Badge variant="outline">{s.license}</Badge>
        </div>
      )}

      {s.compatibility && s.compatibility.length > 0 && (
        <div>
          <h3 className="text-muted-foreground mb-1 text-sm font-semibold">Compatibility</h3>
          <div className="flex flex-wrap gap-1">
            {(Array.isArray(s.compatibility)
              ? s.compatibility
              : s.compatibility.split(',')
            ).map((c) => (
              <Badge key={c.trim()} variant="secondary">
                {c.trim()}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {s['allowed-tools'] && s['allowed-tools'].length > 0 && (
        <div>
          <h3 className="text-muted-foreground mb-1 text-sm font-semibold">Allowed Tools</h3>
          <div className="flex flex-wrap gap-1">
            {(Array.isArray(s['allowed-tools'])
              ? s['allowed-tools']
              : s['allowed-tools'].split(',')
            ).map((t) => (
              <Badge key={t.trim()} variant="outline" className="font-mono text-xs">
                {t.trim()}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {s.metadata && Object.keys(s.metadata).length > 0 && (
        <div>
          <h3 className="text-muted-foreground mb-1 text-sm font-semibold">Metadata</h3>
          <dl className="grid grid-cols-2 gap-1 text-sm">
            {Object.entries(s.metadata).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium">{k}</dt>
                <dd className="text-muted-foreground">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <Separator />

      {/* File Tree + Code Viewer */}
      {files && files.length > 0 && (
        <div>
          <h3 className="text-muted-foreground mb-2 text-sm font-semibold">Skill Files</h3>
          <div className="flex gap-4">
            <div className="shrink-0">
              <FileTree files={files} selectedPath={selectedPath} onSelect={setSelectedPath} />
            </div>
            <div className="min-w-0 flex-1">
              {selectedFile ? (
                <SkillCodeEditor path={selectedFile.path} value={selectedFile.content} readOnly />
              ) : (
                <p className="text-muted-foreground text-sm">Select a file to view</p>
              )}
            </div>
          </div>
        </div>
      )}

      {(!files || files.length === 0) && s.body && (
        <div>
          <h3 className="text-muted-foreground mb-1 text-sm font-semibold">Body</h3>
          <pre className="bg-muted max-h-64 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
            {s.body}
          </pre>
        </div>
      )}
    </div>
  );
}
