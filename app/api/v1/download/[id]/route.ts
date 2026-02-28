// app/api/v1/download/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import yaml from 'js-yaml';
import { prisma } from '@/lib/prisma';
import { checkLimit, getIp } from '@/lib/api-helpers';
import { pgNotify } from '@/lib/sse';

type RouteParams = { params: Promise<{ id: string }> };

function buildSkillMd(spec: Record<string, unknown>): string {
  const { body, ...frontmatterFields } = spec;
  const fm = yaml.dump(frontmatterFields, { lineWidth: -1 }).trim();
  const bodyStr = typeof body === 'string' ? body.trim() : '';
  const bodySuffix = bodyStr ? '\n' + bodyStr + '\n' : '';
  return `---\n${fm}\n---\n${bodySuffix}`;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limit = checkLimit(`GET /api/v1/download/[id] ${getIp(req)}`);
  if (limit) return limit;

  try {
    const { id } = await params;
    const session = await (await import('@/lib/auth')).auth();

    const skill = await prisma.skill.findUnique({
      where: { id },
      include: { owners: { select: { userId: true } } },
    });
    if (!skill) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    if (skill.status === 'TEMPLATE') {
      const isOwner = skill.owners.some((o) => o.userId === session?.user?.id);
      const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await prisma.$transaction([
      prisma.skillDownloadEvent.create({
        data: { skillId: id, userId: session?.user?.id ?? null },
      }),
      prisma.skill.update({
        where: { id },
        data: { downloadCount: { increment: 1 } },
      }),
    ]);

    await pgNotify('global_stats', JSON.stringify({ event: 'skill_downloaded', skillId: id }));

    // Build a zip containing the skill folder with SKILL.md
    const spec = skill.spec as Record<string, unknown>;
    const zip = new JSZip();
    const folder = zip.folder(skill.name)!;
    folder.file('SKILL.md', buildSkillMd(spec));

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${skill.name}.zip"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
