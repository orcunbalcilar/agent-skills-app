// src/features/skills/components/SkillForm.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const MAX_BYTES = 512 * 1024;

function byteSize(str: string): number {
  return new Blob([str]).size;
}

export function SkillForm({ mode, initialData }: Readonly<SkillFormProps>) {
  const router = useRouter();
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const releaseSkill = useReleaseSkill();

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [specJson, setSpecJson] = useState(
    initialData?.spec ? JSON.stringify(initialData.spec, null, 2) : "{}"
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);

  const specBytes = byteSize(specJson);
  const specOverLimit = specBytes > MAX_BYTES;

  const validateJson = useCallback((value: string) => {
    try {
      JSON.parse(value);
      setJsonError(null);
      return true;
    } catch {
      setJsonError("Invalid JSON");
      return false;
    }
  }, []);

  const handleSpecChange = useCallback(
    (value: string) => {
      setSpecJson(value);
      validateJson(value);
    },
    [validateJson]
  );

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_BYTES) {
        setError("File exceeds 512 KB limit");
        return;
      }
      file.text().then((text) => {
        handleSpecChange(text);
        try {
          const parsed = JSON.parse(text) as Record<string, unknown>;
          if (typeof parsed.name === "string") setName(parsed.name);
          if (typeof parsed.description === "string") setDescription(parsed.description);
        } catch {
          // keep raw text in spec editor
        }
      }).catch(() => {
        setError("Failed to read file");
      });
    },
    [handleSpecChange]
  );

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!validateJson(specJson)) return;
    if (specOverLimit) {
      setError("Spec exceeds 512 KB limit");
      return;
    }

    const spec = JSON.parse(specJson) as Record<string, unknown>;

    try {
      if (mode === "create") {
        const result = await createSkill.mutateAsync({
          name,
          description,
          spec: { ...spec, name, description },
          tags: selectedTags,
        });
        const data = result.data as { id: string };
        router.push(`/skills/${data.id}`);
      } else if (initialData) {
        await updateSkill.mutateAsync({
          id: initialData.id,
          name,
          description,
          spec: { ...spec, name, description },
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
              <Label htmlFor="skill-name">Name</Label>
              <Input
                id="skill-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-skill-name"
                pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                required
              />
              <p className="text-xs text-muted-foreground">
                Lowercase alphanumeric with hyphens (e.g. my-skill-name)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-description">Description</Label>
              <Textarea
                id="skill-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this skill does..."
                maxLength={1024}
                required
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/1024 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagSelector selected={selectedTags} onChange={setSelectedTags} max={10} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="skill-spec">Spec (JSON)</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${specOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                    {Math.ceil(specBytes / 1024)} KB / 512 KB
                  </span>
                  <Label htmlFor="spec-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>Upload JSON</span>
                    </Button>
                    <input
                      id="spec-upload"
                      type="file"
                      accept=".json"
                      title="Upload JSON spec file"
                      onChange={handleUpload}
                      className="sr-only"
                    />
                  </Label>
                </div>
              </div>
              <Textarea
                id="skill-spec"
                value={specJson}
                onChange={(e) => handleSpecChange(e.target.value)}
                className="font-mono text-sm min-h-50"
                spellCheck={false}
              />
              {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending || specOverLimit}>
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
