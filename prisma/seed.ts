// prisma/seed.ts
import { PrismaClient, Role, SkillStatus, ChangeRequestStatus, NotificationType, ReactionEmoji } from "@prisma/client";
import { subDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Tags ────────────────────────────────────────────────────────────────────
  const systemTagNames = [
    "ai", "devops", "frontend", "backend", "security",
    "testing", "database", "cloud", "mobile", "data-science",
    "java", ".net", "nodejs", "web-development",
    "documentation", "python", "go", "rust",
  ];
  const tagRecords = await Promise.all(
    systemTagNames.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, isSystem: true },
      })
    )
  );
  const tagByName = Object.fromEntries(tagRecords.map((t) => [t.name, t]));

  // ── Users ───────────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: process.env.E2E_ADMIN_EMAIL ?? "admin@test.local" },
    update: {},
    create: {
      githubId: "github-admin-seed",
      email: process.env.E2E_ADMIN_EMAIL ?? "admin@test.local",
      name: "Admin User",
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
      role: Role.ADMIN,
      notificationPreferences: {},
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: process.env.E2E_USER_EMAIL ?? "user@test.local" },
    update: {},
    create: {
      githubId: "github-user-seed",
      email: process.env.E2E_USER_EMAIL ?? "user@test.local",
      name: "Regular User",
      avatarUrl: "https://avatars.githubusercontent.com/u/2?v=4",
      role: Role.USER,
      notificationPreferences: {},
    },
  });

  // ── Released Skills ─────────────────────────────────────────────────────────
  const skillDefs = [
    {
      name: "python-code-reviewer",
      description: "Reviews Python code for quality issues and style.",
      owner: adminUser,
      tags: ["python", "testing"],
    },
    {
      name: "nodejs-api-builder",
      description: "Scaffolds REST APIs with Node.js and Express.",
      owner: adminUser,
      tags: ["nodejs", "web-development"],
    },
    {
      name: "go-microservice-kit",
      description: "Generates Go microservice boilerplate with gRPC support.",
      owner: regularUser,
      tags: ["go", "devops"],
    },
    {
      name: "security-audit-tool",
      description: "Runs OWASP-aligned security checks on codebases.",
      owner: adminUser,
      tags: ["security", "testing"],
    },
    {
      name: "data-pipeline-builder",
      description: "Designs ETL pipelines for data engineering tasks.",
      owner: regularUser,
      tags: ["data", "python"],
    },
  ];

  const releasedSkills = await Promise.all(
    skillDefs.map(async (def) => {
      const skill = await prisma.skill.create({
        data: {
          name: def.name,
          description: def.description,
          spec: {
            name: def.name,
            description: def.description,
            license: "MIT",
            compatibility: ["gpt-4", "claude-3"],
            metadata: { author: def.owner.name },
            "allowed-tools": ["read_file", "write_file"],
            body: `You are a ${def.name} skill. Help users with ${def.description}`,
          },
          status: SkillStatus.RELEASED,
          version: 1,
          releasedAt: new Date(),
          downloadCount: Math.floor(Math.random() * 100),
          forkCount: 0,
        },
      });

      await prisma.skillOwner.create({
        data: { skillId: skill.id, userId: def.owner.id },
      });

      await Promise.all(
        def.tags.map((tagName) =>
          prisma.skillTag.create({
            data: { skillId: skill.id, tagId: tagByName[tagName].id },
          })
        )
      );

      return skill;
    })
  );

  // ── Templates ───────────────────────────────────────────────────────────────
  const templateDefs = [
    {
      name: "rust-cli-helper",
      description: "Draft template for Rust CLI tooling.",
      owner: regularUser,
      tags: ["rust"],
    },
    {
      name: "java-spring-scaffolder",
      description: "Draft template for Spring Boot project scaffolding.",
      owner: regularUser,
      tags: ["java"],
    },
  ];

  await Promise.all(
    templateDefs.map(async (def) => {
      const skill = await prisma.skill.create({
        data: {
          name: def.name,
          description: def.description,
          spec: { name: def.name, description: def.description, body: "Draft" },
          status: SkillStatus.TEMPLATE,
          version: 1,
        },
      });
      await prisma.skillOwner.create({ data: { skillId: skill.id, userId: def.owner.id } });
      await Promise.all(
        def.tags.map((tagName) =>
          prisma.skillTag.create({
            data: { skillId: skill.id, tagId: tagByName[tagName].id },
          })
        )
      );
      return skill;
    })
  );

  // ── Followers ───────────────────────────────────────────────────────────────
  const [skill1, skill2, skill3] = releasedSkills;
  await prisma.follower.createMany({
    data: [
      { skillId: skill1.id, userId: regularUser.id },
      { skillId: skill2.id, userId: regularUser.id },
      { skillId: skill2.id, userId: adminUser.id },
      { skillId: skill3.id, userId: adminUser.id },
    ],
    skipDuplicates: true,
  });

  // ── Download Events ─────────────────────────────────────────────────────────
  await prisma.skillDownloadEvent.createMany({
    data: releasedSkills.flatMap((skill) => [
      { skillId: skill.id, userId: adminUser.id },
      { skillId: skill.id, userId: regularUser.id },
      { skillId: skill.id, userId: null },
    ]),
  });

  // ── Comments ─────────────────────────────────────────────────────────────────
  const commentTexts = [
    "This is really useful, thanks!",
    "How does this handle edge cases?",
    "Works great with the latest model.",
    "Could use more documentation.",
    "Excellent implementation pattern.",
    "I forked this for my team.",
    "Any plans to add TypeScript support?",
    "Tested in production — very stable.",
    "The spec format is well-thought-out.",
    "Great starting point for automation.",
  ];

  const comments = await Promise.all(
    commentTexts.map((content, i) =>
      prisma.comment.create({
        data: {
          skillId: releasedSkills[i % releasedSkills.length].id,
          authorId: i % 2 === 0 ? adminUser.id : regularUser.id,
          content,
        },
      })
    )
  );

  // ── Reactions ────────────────────────────────────────────────────────────────
  const reactionEmojis = [ReactionEmoji.THUMBS_UP, ReactionEmoji.HEART, ReactionEmoji.ROCKET, ReactionEmoji.EYES];

  await Promise.all([
    prisma.skillReaction.createMany({
      data: [
        { skillId: skill1.id, userId: adminUser.id, emoji: ReactionEmoji.THUMBS_UP },
        { skillId: skill1.id, userId: regularUser.id, emoji: ReactionEmoji.HEART },
        { skillId: skill2.id, userId: adminUser.id, emoji: ReactionEmoji.ROCKET },
        { skillId: skill3.id, userId: regularUser.id, emoji: ReactionEmoji.EYES },
      ],
      skipDuplicates: true,
    }),
    prisma.commentReaction.createMany({
      data: [
        { commentId: comments[0].id, userId: regularUser.id, emoji: ReactionEmoji.THUMBS_UP },
        { commentId: comments[1].id, userId: adminUser.id, emoji: ReactionEmoji.LAUGH },
        { commentId: comments[2].id, userId: regularUser.id, emoji: reactionEmojis[2] },
        { commentId: comments[3].id, userId: adminUser.id, emoji: ReactionEmoji.HEART },
      ],
      skipDuplicates: true,
    }),
  ]);

  // ── Change Requests ──────────────────────────────────────────────────────────
  const openCR = await prisma.changeRequest.create({
    data: {
      skillId: skill1.id,
      requesterId: regularUser.id,
      title: "Add error handling section",
      description: "The skill should document how errors are handled in edge cases.",
      status: ChangeRequestStatus.OPEN,
    },
  });

  const approvedCR = await prisma.changeRequest.create({
    data: {
      skillId: skill2.id,
      requesterId: regularUser.id,
      title: "Improve response format",
      description: "Responses should be structured as JSON objects.",
      status: ChangeRequestStatus.APPROVED,
      resolvedById: adminUser.id,
      resolvedAt: new Date(),
    },
  });

  await prisma.changeRequest.create({
    data: {
      skillId: skill3.id,
      requesterId: adminUser.id,
      title: "Refactor tool list",
      description: "The allowed-tools list is too verbose. Suggest trimming to essentials.",
      status: ChangeRequestStatus.REJECTED,
      resolvedById: regularUser.id,
      resolvedAt: new Date(),
    },
  });

  // ── Notifications ────────────────────────────────────────────────────────────
  const notifTypes: NotificationType[] = [
    NotificationType.NEW_COMMENT,
    NotificationType.CHANGE_REQUEST_SUBMITTED,
    NotificationType.CHANGE_REQUEST_APPROVED,
    NotificationType.NEW_FOLLOWER,
    NotificationType.SKILL_RELEASED,
  ];

  for (const user of [adminUser, regularUser]) {
    await prisma.notification.createMany({
      data: notifTypes.map((type) => ({
        userId: user.id,
        type,
        payload: { skillId: skill1.id, actorName: "Seed Bot" },
        read: false,
      })),
    });
  }

  // ── FollowerSnapshots (last 30 days) ─────────────────────────────────────────
  const snapshotData = [];
  for (let i = 29; i >= 0; i--) {
    const snapshotDate = subDays(new Date(), i);
    snapshotDate.setHours(0, 0, 0, 0);
    snapshotData.push(
      { skillId: skill1.id, count: 1 + (29 - i), snapshotDate },
      { skillId: skill2.id, count: 2 + (29 - i), snapshotDate }
    );
  }

  await prisma.followerSnapshot.createMany({ data: snapshotData, skipDuplicates: true });

  console.log(`Seeded change requests: ${openCR.id}, ${approvedCR.id}`);
  console.log("Seeding complete.");
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
