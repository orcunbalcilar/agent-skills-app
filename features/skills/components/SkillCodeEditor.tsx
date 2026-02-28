// features/skills/components/SkillCodeEditor.tsx
'use client';

import { useCallback } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { useUIStore } from '@/stores/ui-store';

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'py':
      return 'python';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    default:
      return 'plaintext';
  }
}

interface SkillCodeEditorProps {
  path: string;
  value: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

export function SkillCodeEditor({
  path,
  value,
  readOnly = false,
  onChange,
}: Readonly<SkillCodeEditorProps>) {
  const theme = useUIStore((s) => s.theme);
  const language = getLanguage(path);

  const handleChange = useCallback(
    (v: string | undefined) => {
      if (onChange && v !== undefined) onChange(v);
    },
    [onChange],
  );

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="bg-muted text-muted-foreground border-b px-3 py-1 text-xs">{path}</div>
      <Editor
        height="420px"
        language={language}
        value={value}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        onChange={handleChange}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
        }}
      />
    </div>
  );
}

interface SkillDiffEditorProps {
  path: string;
  original: string;
  modified: string;
}

export function SkillDiffEditor({ path, original, modified }: Readonly<SkillDiffEditorProps>) {
  const theme = useUIStore((s) => s.theme);
  const language = getLanguage(path);

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="bg-muted text-muted-foreground border-b px-3 py-1 text-xs">{path}</div>
      <DiffEditor
        height="420px"
        language={language}
        original={original}
        modified={modified}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          renderSideBySide: true,
        }}
      />
    </div>
  );
}
