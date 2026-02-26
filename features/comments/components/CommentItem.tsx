// features/comments/components/CommentItem.tsx
"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmojiReactions } from "@/features/skills/components/EmojiReactions";
import { useEditComment, useDeleteComment, useToggleCommentReaction } from "../hooks/useComments";
import type { Comment } from "../hooks/useComments";

interface CommentItemProps {
  comment: Comment;
  skillId: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

export function CommentItem({
  comment,
  skillId,
  currentUserId,
  isAdmin,
}: Readonly<CommentItemProps>) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const editComment = useEditComment(skillId);
  const deleteComment = useDeleteComment(skillId);
  const toggleReaction = useToggleCommentReaction(skillId);

  const isAuthor = currentUserId === comment.authorId;
  const isDeleted = Boolean(comment.deletedAt);

  const reactionCounts: Record<string, number> = {};
  const userReactions: string[] = [];
  for (const r of comment.reactions) {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
    if (r.userId === currentUserId) {
      userReactions.push(r.emoji);
    }
  }

  const handleSaveEdit = () => {
    editComment.mutate(
      { commentId: comment.id, content: editContent },
      { onSuccess: () => setEditing(false) }
    );
  };

  if (isDeleted) {
    return (
      <div className="py-3 text-sm text-muted-foreground italic">
        This comment has been deleted.
      </div>
    );
  }

  return (
    <div className="flex gap-3 py-3">
      <Avatar className="size-8">
        <AvatarImage src={comment.author.avatarUrl ?? undefined} />
        <AvatarFallback>{comment.author.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{comment.author.name}</span>
          <span className="text-muted-foreground">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
        </div>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} disabled={editComment.isPending}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            <div className="flex items-center gap-2">
              {currentUserId && (
                <EmojiReactions
                  counts={reactionCounts}
                  userReactions={userReactions}
                  onToggle={(emoji) =>
                    toggleReaction.mutate({ commentId: comment.id, emoji })
                  }
                />
              )}
              {isAuthor && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteComment.mutate(comment.id)}
                  >
                    Delete
                  </Button>
                </>
              )}
              {isAdmin && !isAuthor && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => deleteComment.mutate(comment.id)}
                >
                  Remove
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
