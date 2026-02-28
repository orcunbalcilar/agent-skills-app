// features/change-requests/components/ChangeRequestForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSubmitChangeRequest } from '../hooks/useChangeRequests';

interface ChangeRequestFormProps {
  skillId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeRequestForm({
  skillId,
  open,
  onOpenChange,
}: Readonly<ChangeRequestFormProps>) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const submit = useSubmitChangeRequest(skillId);

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return;
    submit.mutate(
      { title: title.trim(), description: description.trim() },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Change Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cr-title">Title</Label>
            <Input
              id="cr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of proposed change"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr-description">Description</Label>
            <Textarea
              id="cr-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the change (supports markdown)"
              className="min-h-32"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submit.isPending || !title.trim() || !description.trim()}
          >
            {submit.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
