// features/comments/components/CommentThread.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Pagination } from "@/components/shared/Pagination";
import { CommentItem } from "./CommentItem";
import { useComments, useCreateComment } from "../hooks/useComments";

interface CommentThreadProps {
  skillId: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

export function CommentThread({
  skillId,
  currentUserId,
  isAdmin,
}: Readonly<CommentThreadProps>) {
  const [page, setPage] = useState(1);
  const [newComment, setNewComment] = useState("");
  const { data } = useComments(skillId, page);
  const createComment = useCreateComment(skillId);

  const handleSubmit = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    createComment.mutate(trimmed, {
      onSuccess: () => setNewComment(""),
    });
  };

  return (
    <div className="space-y-4">
      {currentUserId && (
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={createComment.isPending || !newComment.trim()}
          >
            {createComment.isPending ? "Posting..." : "Comment"}
          </Button>
        </div>
      )}

      <Separator />

      {data?.data.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          skillId={skillId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      ))}

      {data?.data.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">No comments yet.</p>
      )}

      {data?.meta && data.meta.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
