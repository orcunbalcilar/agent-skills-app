// features/skills/components/FileTree.tsx
'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FileCode2,
  FileJson,
  FileType,
  Folder,
  FolderOpen,
  Terminal,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SkillFile {
  path: string;
  content: string;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(files: SkillFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isDir = i < parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');
      let existing = current.find((n) => n.name === name && n.isDir === isDir);

      if (!existing) {
        existing = { name, path, isDir, children: [] };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  return sortTree(root);
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .map((n) => ({ ...n, children: sortTree(n.children) }))
    .sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function getFileIcon(name: string): LucideIcon {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
      return FileText;
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'py':
      return FileCode2;
    case 'json':
      return FileJson;
    case 'yaml':
    case 'yml':
      return Settings;
    case 'sh':
    case 'bash':
      return Terminal;
    default:
      return FileType;
  }
}

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function TreeNodeItem({ node, depth, selectedPath, onSelect }: Readonly<TreeNodeItemProps>) {
  const [expanded, setExpanded] = useState(true);

  if (node.isDir) {
    return (
      <div>
        <button
          type="button"
          className={cn(
            'hover:bg-accent flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-sm',
            `pl-[${depth * 12 + 4}px]`,
          )}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="size-3.5 shrink-0" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="size-3.5 shrink-0 text-amber-500" />
          ) : (
            <Folder className="size-3.5 shrink-0 text-amber-500" />
          )}
          <span>{node.name}</span>
        </button>
        {expanded &&
          node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'hover:bg-accent flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-sm',
        selectedPath === node.path && 'bg-accent font-medium',
        `pl-[${depth * 12 + 4}px]`,
      )}
      onClick={() => onSelect(node.path)}
    >
      {(() => {
        const Icon = getFileIcon(node.name);
        return <Icon className="size-3.5 shrink-0" />;
      })()}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

interface FileTreeProps {
  files: SkillFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function FileTree({ files, selectedPath, onSelect }: Readonly<FileTreeProps>) {
  const tree = useMemo(() => buildTree(files), [files]);

  return (
    <div className="bg-background max-h-125 min-w-48 overflow-auto rounded-md border p-2">
      <p className="text-muted-foreground mb-1 px-1 text-xs font-semibold">Files</p>
      {tree.map((node) => (
        <TreeNodeItem
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
