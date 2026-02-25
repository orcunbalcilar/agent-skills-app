// src/features/skills/components/SkillForm.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TagSelector } from "@/features/tags/components/TagSelector";
import { useCreateSkill, useUpdateSkill, useReleaseSkill } from "../hooks/useSkillMutations";

interface SkillFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    description: string;
    spec: Record<string, unknown>;
    tags: string[];
    status: string;
  };
}

const MAX_ZIP_BYTES = 10 * 1024 * 1024; // 10 MB

export function SkillForm({ mode, initialData }: Readonly<SkillFormProps>) {
  const router = useRouter();
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const releaseSkill = useReleaseSkill();

  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedSpec, setParsedSpec] = useState<Record<string, unknown> | null>(
    initialData?.spec ?? null
  );
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_ZIP_BYTES) {
        setError("Zip file exceeds 10 MB limit");
        return;
      }

      if (!file.name.endsWith(".zip")) {
        setError("Please upload a .zip file containing your skill folder");
        return;
      }

      setUploading(true);
      setError(null);

      try {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch("/api/v1/upload", { method: "POST", body: form });
        const json = await res.json() as {
          data?: Record<string, unknown>;
          error?: string;
          details?: string;
        };

        if (!res.ok) {
          setError(json.details ?? json.error ?? "Upload validation failed");
          setParsedSpec(null);
          setUploadedFile(null);
          return;
        }

        setParsedSpec(json.data ?? null);
        setUploadedFile(file);
      } catch {
        setError("Failed to upload file");
        setParsedSpec(null);
        setUploadedFile(null);
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!parsedSpec) {
      setError("Please upload a valid skill folder (.zip) first");
      return;
    }

    const name = parsedSpec.name as string;
    const description = parsedSpec.description as string;

    try {
      if (mode === "create") {
        const result = await createSkill.mutateAsync({
          name,
          description,
          spec: parsedSpec,
          tags: selectedTags,
        });
        const data = result.data as { id: string };
        router.push(`/skills/${data.id}`);
      } else if (initialData) {
        await updateSkill.mutateAsync({
          id: initialData.id,
          name,
          description,
          spec: parsedSpec,
          tags: selectedTags,
        });
        router.push(`/skills/${initialData.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save skill");
    }
  };

  const handleRelease = async () => {
    if (!initialData) return;
    try {
      await releaseSkill.mutateAsync(initialData.id);
      setReleaseDialogOpen(false);
      router.push(`/skills/${initialData.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release skill");
    }
  };

  const isPending = createSkill.isPending || updateSkill.isPending;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create New Skill" : "Edit Skill"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <p>{error}</p>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="skill-zip">Upload Skill Folder (.zip)</Label>
              <p className="text-xs text-muted-foreground">
                Upload a zip file containing your skill folder with a SKILL.md file.
                The SKILL.md must have valid YAML frontmatter with name and description.
                Optional dirs: scripts/, references/, assets/
              </p>
              <Input
                id="skill-zip"
                type="file"
                accept=".zip"
                onChange={handleUpload}
                disabled={uploading}
              />
              {uploading && <p className="text-xs text-muted-foreground">Validating skill folder...</p>}
              {uploadedFile && parsedSpec && (
                <div className="rounded border p-3 text-sm space-y-1">
                  <p><strong>Name:</strong> {parsedSpec.name as string}</p>
                  <p><strong>Description:</strong> {parsedSpec.description as string}</p>
                  {typeof parsedSpec.license === "string" && (
                    <p><strong>License:</strong> {parsedSpec.license}</p>
                  )}
                  {typeof parsedSpec.compatibility === "string" && (
                    <p><strong>Compatibility:</strong> {parsedSpec.compatibility}</p>
                  )}
                  {typeof parsedSpec.body === "string" && (
                    <p className="text-muted-foreground">
                      Body: {parsedSpec.body.slice(0, 100)}
                      {parsedSpec.body.length > 100 ? "..." : ""}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagSelector selected={selectedTags} onChange={setSelectedTags} max={10} />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending || !parsedSpec || uploading}>
                {isPending ? "Saving..." : "Save as Template"}
              </Button>
              {mode === "edit" && initialData?.status === "TEMPLATE" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReleaseDialogOpen(true)}
                >
                  Release
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Skill</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Releasing is irreversible. This skill will be publicly visible as v1. Proceed?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRelease} disabled={releaseSkill.isPending}>
              {releaseSkill.isPending ? "Releasing..." : "Confirm Release"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
