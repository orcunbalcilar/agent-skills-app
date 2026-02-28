// features/skills/components/SkillStats.tsx
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useSkillStats } from '../hooks/useSkillStats';

interface SkillStatsProps {
  skillId: string;
  followerSnapshots?: Array<{ snapshotDate: string; count: number }>;
}

const EMOJI_LABELS: Record<string, string> = {
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎',
  LAUGH: '😄',
  HOORAY: '🎉',
  CONFUSED: '😕',
  HEART: '❤️',
  ROCKET: '🚀',
  EYES: '👀',
};

export function SkillStats({ skillId, followerSnapshots = [] }: Readonly<SkillStatsProps>) {
  const { data: stats } = useSkillStats(skillId);

  const reactionCounts = stats?.reactionCounts;
  const reactionData = useMemo(() => {
    if (!reactionCounts) return [];
    return Object.entries(reactionCounts).map(([emoji, count]) => ({
      emoji: EMOJI_LABELS[emoji] ?? emoji,
      count,
    }));
  }, [reactionCounts]);

  const followerData = useMemo(
    () =>
      followerSnapshots.map((s) => ({
        date: new Date(s.snapshotDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        count: s.count,
      })),
    [followerSnapshots],
  );

  if (!stats) {
    return <div className="text-muted-foreground py-8 text-center">Loading stats...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Downloads</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.downloadCount.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Forks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.forkCount.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.commentCount.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Followers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.followerCount.toLocaleString()}</p>
        </CardContent>
      </Card>

      {followerData.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Followers Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={followerData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {reactionData.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Reaction Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={reactionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="emoji" fontSize={16} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
