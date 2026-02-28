// features/notifications/components/NotificationPreferences.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMe } from '@/features/users/hooks/useUser';
import { useUpdateNotificationPreferences } from '../hooks/useNotifications';

const NOTIFICATION_TYPES = [
  { key: 'NEW_COMMENT', label: 'New comments on followed skills' },
  { key: 'CHANGE_REQUEST_SUBMITTED', label: 'Change requests on your skills' },
  { key: 'CHANGE_REQUEST_APPROVED', label: 'Your change request approved' },
  { key: 'CHANGE_REQUEST_REJECTED', label: 'Your change request rejected' },
  { key: 'NEW_FOLLOWER', label: 'New followers on your skills' },
  { key: 'SKILL_RELEASED', label: 'Followed skill released' },
  { key: 'SKILL_FORKED', label: 'Your skill forked' },
  { key: 'OWNER_ADDED', label: 'Added as owner to a skill' },
  { key: 'OWNER_REMOVED', label: 'Removed as owner from a skill' },
] as const;

export function NotificationPreferences() {
  const { data: user } = useMe();
  const update = useUpdateNotificationPreferences();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);

  if (user?.notificationPreferences && !initialized) {
    setPrefs(user.notificationPreferences);
    setInitialized(true);
  }

  const togglePref = (key: string) => {
    setPrefs((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const handleSave = () => {
    update.mutate(prefs);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {NOTIFICATION_TYPES.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <Label htmlFor={`pref-${key}`} className="text-sm">
              {label}
            </Label>
            <Switch
              id={`pref-${key}`}
              checked={prefs[key] ?? true}
              onCheckedChange={() => togglePref(key)}
            />
          </div>
        ))}
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
