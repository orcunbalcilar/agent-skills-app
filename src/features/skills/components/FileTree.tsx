// src/features/skills/components/FileTree.tsx
"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

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
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isDir = i < parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");
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

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "md":
      return "📄";
    case "ts":
    case "tsx":
      return "🟦";
    case "js":
    case "jsx":
      return "🟨";
    case "json":
      return "📋";
    case "yaml":
    case "yml":
      return "⚙️";
    case "py":
      return "🐍";
    case "sh":
    case "bash":
      return "🖥️";
    default:
      return "📃";
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
            "flex w-full items-center gap-1 rounded px-1 py-0.5 text-sm hover:bg-accent text-left",
            `pl-[${depth * 12 + 4}px]`,
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-xs">{expanded ? "▼" : "▶"}</span>
          <span>📁</span>
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
        "flex w-full items-center gap-1 rounded px-1 py-0.5 text-sm hover:bg-accent text-left",
        selectedPath === node.path && "bg-accent font-medium",
        `pl-[${depth * 12 + 4}px]`,
      )}
      onClick={() => onSelect(node.path)}
    >
      <span>{getFileIcon(node.name)}</span>
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
    <div className="border rounded-md p-2 min-w-48 max-h-125 overflow-auto bg-background">
      <p className="text-xs font-semibold text-muted-foreground mb-1 px-1">Files</p>
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
