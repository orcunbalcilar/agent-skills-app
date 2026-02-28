// features/skills/components/SkillDetail.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { SkillSpecViewer } from './SkillSpecViewer';
import { SkillStats } from './SkillStats';
import { EmojiReactions } from './EmojiReactions';
import { VersionHistory } from './VersionHistory';
import { VersionDiff } from './VersionDiff';
import { CommentThread } from '@/features/comments/components/CommentThread';
import { ChangeRequestList } from '@/features/change-requests/components/ChangeRequestList';
import { ChangeRequestForm } from '@/features/change-requests/components/ChangeRequestForm';
import { toast } from 'sonner';
import {
  useDeleteSkill,
  useReleaseSkill,
  useForkSkill,
  useToggleFollow,
  useToggleSkillReaction,
} from '../hooks/useSkillMutations';
import type { SkillDetail as SkillDetailType } from '../types';

interface SkillDetailProps {
  skill: SkillDetailType;
}

export function SkillDetail({ skill }: Readonly<SkillDetailProps>) {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = userRole === 'ADMIN';
  const isOwner = skill.owners.some((o) => o.userId === userId);
  const isOwnerOrAdmin = isAdmin || isOwner;
  const isFollowing = skill.followers?.some((f) => f.userId === userId) ?? false;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [crFormOpen, setCrFormOpen] = useState(false);
  const [diffRange, setDiffRange] = useState<{ from: number; to: number } | null>(null);

  const deleteSkill = useDeleteSkill();
  const releaseSkill = useReleaseSkill();
  const forkSkill = useForkSkill();
  const toggleFollow = useToggleFollow(skill.id, isFollowing);
  const toggleReaction = useToggleSkillReaction(skill.id);

  const reactionCounts: Record<string, number> = skill.reactionCounts ?? {};
  const userReactions: string[] = [];
  if (skill.reactions && userId) {
    for (const r of skill.reactions) {
      if (r.userId === userId) userReactions.push(r.emoji);
    }
  }

  const handleDelete = async () => {
    await deleteSkill.mutateAsync(skill.id);
    router.push('/skills');
  };

  const handleRelease = async () => {
    await releaseSkill.mutateAsync(skill.id);
    setReleaseDialogOpen(false);
    router.refresh();
  };

  const handleFork = async () => {
    const result = await forkSkill.mutateAsync(skill.id);
    const data = result.data as { id: string };
    router.push(`/skills/${data.id}`);
  };

  const handleDownload = () => {
    window.open(`/api/v1/download/${skill.id}`, '_blank');
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{skill.name}</h1>
            <Badge
              variant={skill.status === 'RELEASED' ? 'default' : 'secondary'}
              className="font-medium"
            >
              {skill.status}
              {skill.status === 'RELEASED' && ` v${skill.version}`}
            </Badge>
          </div>
          <p className="text-muted-foreground leading-relaxed">{skill.description}</p>
          {skill.forkedFromId && (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <span>🍴</span> Forked from another skill
            </p>
          )}
        </div>
      </div>

      {/* Owners */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">Owners:</span>
        {skill.owners.map((o) => (
          <div
            key={o.userId}
            className="bg-muted/50 flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5"
          >
            <Avatar className="ring-border/50 size-5 ring-1">
              <AvatarImage src={o.user.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                {o.user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{o.user.name}</span>
          </div>
        ))}
      </div>

      {/* Tags */}
      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skill.tags.map((t) => (
            <Badge key={t.tagId} variant="outline" className="border-border/50">
              {t.tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="bg-muted/30 border-border/30 flex flex-wrap gap-2 rounded-lg border p-3">
        {userId && (
          <Button
            variant={isFollowing ? 'secondary' : 'default'}
            size="sm"
            onClick={async () => {
              try {
                await toggleFollow.mutateAsync();
                toast.success(isFollowing ? 'Unfollowed' : 'Following!');
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to update follow');
              }
            }}
            disabled={toggleFollow.isPending}
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </Button>
        )}
        {userId && skill.status === 'RELEASED' && (
          <Button variant="outline" size="sm" onClick={handleFork} disabled={forkSkill.isPending}>
            Fork
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleDownload}>
          Download
        </Button>
        {userId && (
          <Button variant="outline" size="sm" onClick={() => setCrFormOpen(true)}>
            Submit Change Request
          </Button>
        )}
        {isOwnerOrAdmin && skill.status === 'TEMPLATE' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/skills/${skill.id}/edit`)}
            >
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setReleaseDialogOpen(true)}>
              Release
            </Button>
          </>
        )}
        {isOwnerOrAdmin && (
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            Delete
          </Button>
        )}
      </div>

      <Separator />

      {/* Reactions */}
      {userId && (
        <EmojiReactions
          counts={reactionCounts}
          userReactions={userReactions}
          onToggle={(emoji) => toggleReaction.mutate(emoji)}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="change-requests">
            Change Requests
            {skill._count?.changeRequests ? ` (${skill._count.changeRequests})` : ''}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <SkillSpecViewer spec={skill.spec} files={skill.files} />
          <Separator />
          <h2 className="text-lg font-semibold">
            Comments {skill._count?.comments ? `(${skill._count.comments})` : ''}
          </h2>
          <CommentThread skillId={skill.id} currentUserId={userId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="change-requests" className="space-y-4 pt-4">
          <ChangeRequestList
            skillId={skill.id}
            currentUserId={userId}
            isOwnerOrAdmin={isOwnerOrAdmin}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-4">
          {diffRange ? (
            <VersionDiff
              skillId={skill.id}
              fromVersion={diffRange.from}
              toVersion={diffRange.to}
              onClose={() => setDiffRange(null)}
            />
          ) : (
            <VersionHistory
              skillId={skill.id}
              currentVersion={skill.version}
              onSelectVersion={(v) => setDiffRange({ from: v, to: v })}
              onCompare={(from, to) => setDiffRange({ from, to })}
            />
          )}
        </TabsContent>

        <TabsContent value="stats" className="pt-4">
          <SkillStats skillId={skill.id} followerSnapshots={skill.followerSnapshots} />
        </TabsContent>
      </Tabs>

      {/* Change Request Form Dialog */}
      <ChangeRequestForm skillId={skill.id} open={crFormOpen} onOpenChange={setCrFormOpen} />

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Skill</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Are you sure you want to delete &ldquo;{skill.name}&rdquo;? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteSkill.isPending}>
              {deleteSkill.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Confirmation */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Skill</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Releasing is irreversible. This skill will be publicly visible as v1. Proceed?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRelease} disabled={releaseSkill.isPending}>
              {releaseSkill.isPending ? 'Releasing...' : 'Confirm Release'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
