// app/api/v1/skills/[id]/versions/[version]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkLimit, getIp } from '@/lib/api-helpers';

type RouteParams = { params: Promise<{ id: string; version: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`GET /api/v1/skills/[id]/versions/[version] ${getIp(req)}`);
  if (limit) return limit;

  try {
    const { id, version: versionStr } = await params;
    const version = Number(versionStr);
    if (Number.isNaN(version)) {
      return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
    }

    const record = await prisma.skillVersion.findFirst({
      where: { skillId: id, version },
      include: {
        editedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
