// src/features/skills/components/SkillSpecViewer.tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileTree, type SkillFile } from "./FileTree";
import { SkillCodeEditor } from "./SkillCodeEditor";
import type { SkillSpec } from "@/lib/skill-schema";

interface SkillSpecViewerProps {
  spec: SkillSpec | Record<string, unknown>;
  files?: SkillFile[];
}

export function SkillSpecViewer({ spec, files }: Readonly<SkillSpecViewerProps>) {
  const s = spec as Partial<SkillSpec>;
  const [selectedPath, setSelectedPath] = useState<string | null>(
    files?.[0]?.path ?? null,
  );

  const selectedFile = files?.find((f) => f.path === selectedPath);

  return (
    <div className="space-y-4">
      {s.description && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Description</h3>
          <p className="text-sm">{s.description}</p>
        </div>
      )}

      {s.license && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">License</h3>
          <Badge variant="outline">{s.license}</Badge>
        </div>
      )}

      {s.compatibility && s.compatibility.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Compatibility</h3>
          <div className="flex flex-wrap gap-1">
            {s.compatibility.split(",").map((c) => (
              <Badge key={c.trim()} variant="secondary">{c.trim()}</Badge>
            ))}
          </div>
        </div>
      )}

      {s["allowed-tools"] && s["allowed-tools"].length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Allowed Tools</h3>
          <div className="flex flex-wrap gap-1">
            {s["allowed-tools"].split(",").map((t) => (
              <Badge key={t.trim()} variant="outline" className="font-mono text-xs">{t.trim()}</Badge>
            ))}
          </div>
        </div>
      )}

      {s.metadata && Object.keys(s.metadata).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Metadata</h3>
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
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Skill Files</h3>
          <div className="flex gap-4">
            <div className="shrink-0">
              <FileTree
                files={files}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
              />
            </div>
            <div className="flex-1 min-w-0">
              {selectedFile ? (
                <SkillCodeEditor
                  path={selectedFile.path}
                  value={selectedFile.content}
                  readOnly
                />
              ) : (
                <p className="text-sm text-muted-foreground">Select a file to view</p>
              )}
            </div>
          </div>
        </div>
      )}

      {(!files || files.length === 0) && s.body && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Body</h3>
          <pre className="bg-muted rounded-md p-3 text-xs whitespace-pre-wrap overflow-auto max-h-64">
            {s.body}
          </pre>
        </div>
      )}
    </div>
  );
}
