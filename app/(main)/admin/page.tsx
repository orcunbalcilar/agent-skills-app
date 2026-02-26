// app/(main)/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTags, useCreateTag, useDeleteTag } from "@/features/tags/hooks/useTags";
import { Input } from "@/components/ui/input";

interface OrphanedSkill {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const [newTagName, setNewTagName] = useState("");
  const [orphaned, setOrphaned] = useState<OrphanedSkill[]>([]);

  useEffect(() => {
    // Fetch orphaned skills (skills with no owners)
    fetch("/api/v1/skills?orphaned=true")
      .then((r) => r.json())
      .then((data: { data?: OrphanedSkill[] }) => {
        if (data.data) setOrphaned(data.data);
      })
      .catch(() => { /* ignore */ });
  }, []);

  if (userRole !== "ADMIN") {
    redirect("/");
  }

  const handleAddTag = () => {
    const trimmed = newTagName.trim().toLowerCase();
    if (!trimmed) return;
    createTag.mutate(trimmed, {
      onSuccess: () => setNewTagName(""),
    });
  };

  const handleDeleteOrphanedSkill = async (skillId: string) => {
    const res = await fetch(`/api/v1/skills/${skillId}`, { method: "DELETE" });
    if (res.ok) {
      setOrphaned((prev) => prev.filter((s) => s.id !== skillId));
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold gradient-text">Admin Panel</h1>

      {/* Orphaned Skills */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Orphaned Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {orphaned.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orphaned skills.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orphaned.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell>{skill.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{skill.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(skill.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteOrphanedSkill(skill.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* System Tags */}
      <Card>
        <CardHeader>
          <CardTitle>System Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag name..."
              className="max-w-48"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleAddTag}
              disabled={createTag.isPending}
            >
              Add Tag
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags?.map((tag) => (
              <Badge key={tag.id} variant={tag.isSystem ? "default" : "secondary"} className="gap-1">
                {tag.name}
                {!tag.isSystem && (
                  <button
                    type="button"
                    onClick={() => deleteTag.mutate(tag.id)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Delete tag ${tag.name}`}
                  >
                    ×
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
