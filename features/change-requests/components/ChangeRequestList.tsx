// features/change-requests/components/ChangeRequestList.tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pagination } from "@/components/shared/Pagination";
import {
  useChangeRequests,
  useApproveChangeRequest,
  useRejectChangeRequest,
  useWithdrawChangeRequest,
} from "../hooks/useChangeRequests";

interface ChangeRequestListProps {
  skillId: string;
  currentUserId?: string;
  isOwnerOrAdmin?: boolean;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "default",
  APPROVED: "secondary",
  REJECTED: "destructive",
  WITHDRAWN: "outline",
};

export function ChangeRequestList({
  skillId,
  currentUserId,
  isOwnerOrAdmin,
}: Readonly<ChangeRequestListProps>) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data } = useChangeRequests(skillId, page);
  const approve = useApproveChangeRequest(skillId);
  const reject = useRejectChangeRequest(skillId);
  const withdraw = useWithdrawChangeRequest(skillId);

  return (
    <div className="space-y-3">
      {data?.data.map((cr) => (
        <Card key={cr.id}>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setExpandedId(expandedId === cr.id ? null : cr.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="size-6">
                  <AvatarImage src={cr.requester.avatarUrl ?? undefined} />
                  <AvatarFallback>{cr.requester.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-sm">{cr.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[cr.status] ?? "outline"}>
                  {cr.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(cr.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardHeader>
          {expandedId === cr.id && (
            <CardContent className="space-y-3">
              <p className="text-sm whitespace-pre-wrap">{cr.description}</p>
              <div className="flex gap-2">
                {cr.status === "OPEN" && isOwnerOrAdmin && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => approve.mutate(cr.id)}
                      disabled={approve.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => reject.mutate(cr.id)}
                      disabled={reject.isPending}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {cr.status === "OPEN" && currentUserId === cr.requesterId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => withdraw.mutate(cr.id)}
                    disabled={withdraw.isPending}
                  >
                    Withdraw
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {data?.data.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">No change requests.</p>
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
