// tests/unit/components/SkillCard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));

import { SkillCard } from "@/features/skills/components/SkillCard";
import type { SkillSummary } from "@/features/skills/types";

function buildSkill(overrides: Partial<SkillSummary> = {}): SkillSummary {
  return {
    id: "s1",
    name: "Test Skill",
    description: "A test skill description",
    status: "RELEASED",
    version: 2,
    forkedFromId: null,
    forkCount: 3,
    downloadCount: 42,
    releasedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owners: [
      {
        skillId: "s1",
        userId: "u1",
        assignedAt: new Date().toISOString(),
        user: { id: "u1", name: "Alice", avatarUrl: null },
      },
    ],
    tags: [
      { skillId: "s1", tagId: "t1", tag: { id: "t1", name: "python", isSystem: true } },
    ],
    reactionCounts: { THUMBS_UP: 5, HEART: 2, ROCKET: 1 },
    _count: { followers: 10 },
    ...overrides,
  } as SkillSummary;
}

describe("SkillCard", () => {
  it("should render skill name and description", () => {
    render(<SkillCard skill={buildSkill()} />);

    expect(screen.getByText("Test Skill")).toBeInTheDocument();
    expect(screen.getByText("A test skill description")).toBeInTheDocument();
  });

  it("should render version badge for released skills", () => {
    render(<SkillCard skill={buildSkill()} />);
    expect(screen.getByText("v2")).toBeInTheDocument();
  });

  it("should render template badge", () => {
    render(<SkillCard skill={buildSkill({ status: "TEMPLATE", version: 1 })} />);
    expect(screen.getByText("template")).toBeInTheDocument();
  });

  it("should render forked badge when forkedFromId is set", () => {
    render(<SkillCard skill={buildSkill({ forkedFromId: "other" })} />);
    expect(screen.getByText("forked")).toBeInTheDocument();
  });

  it("should not render forked badge when not forked", () => {
    render(<SkillCard skill={buildSkill()} />);
    expect(screen.queryByText("forked")).not.toBeInTheDocument();
  });

  it("should render owner avatars", () => {
    render(<SkillCard skill={buildSkill()} />);
    expect(screen.getByText("A")).toBeInTheDocument(); // Avatar fallback for Alice
  });

  it("should show +N for more than 3 owners", () => {
    const owners = Array.from({ length: 5 }, (_, i) => ({
      skillId: "s1",
      userId: `u${i}`,
      assignedAt: new Date().toISOString(),
      user: { id: `u${i}`, name: `User${i}`, avatarUrl: null },
    }));
    render(<SkillCard skill={buildSkill({ owners } as Partial<SkillSummary>)} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("should render tags", () => {
    render(<SkillCard skill={buildSkill()} />);
    expect(screen.getByText("python")).toBeInTheDocument();
  });

  it("should show +N for more than 5 tags", () => {
    const tags = Array.from({ length: 7 }, (_, i) => ({
      skillId: "s1",
      tagId: `t${i}`,
      tag: { id: `t${i}`, name: `tag-${i}`, isSystem: false },
    }));
    render(<SkillCard skill={buildSkill({ tags } as Partial<SkillSummary>)} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("should render download, follower, and fork counts", () => {
    render(<SkillCard skill={buildSkill()} />);
    expect(screen.getByText("42")).toBeInTheDocument(); // downloads
    expect(screen.getByText("10")).toBeInTheDocument(); // followers
    expect(screen.getByText("3")).toBeInTheDocument(); // forks
  });

  it("should render top 3 reaction icons with counts", () => {
    render(<SkillCard skill={buildSkill()} />);
    expect(screen.getByText("5")).toBeInTheDocument(); // THUMBS_UP
    expect(screen.getByText("2")).toBeInTheDocument(); // HEART
    expect(screen.getByText("1")).toBeInTheDocument(); // ROCKET
  });

  it("should handle missing reactions gracefully", () => {
    render(<SkillCard skill={buildSkill({ reactionCounts: {} })} />);
    expect(screen.getByText("42")).toBeInTheDocument(); // downloads still shown
  });

  it("should handle missing tags gracefully", () => {
    render(<SkillCard skill={buildSkill({ tags: undefined } as Partial<SkillSummary>)} />);
    expect(screen.getByText("Test Skill")).toBeInTheDocument();
  });

  it("should handle missing owners gracefully", () => {
    render(<SkillCard skill={buildSkill({ owners: undefined } as Partial<SkillSummary>)} />);
    expect(screen.getByText("Test Skill")).toBeInTheDocument();
  });

  it("should handle missing _count gracefully", () => {
    render(<SkillCard skill={buildSkill({ _count: undefined } as Partial<SkillSummary>)} />);
    expect(screen.getByText("0")).toBeInTheDocument(); // defaults to 0 followers
  });

  it("should link to skill detail page", () => {
    render(<SkillCard skill={buildSkill()} />);
    const link = screen.getByText("Test Skill").closest("a");
    expect(link).toHaveAttribute("href", "/skills/s1");
  });

  it("should render reaction emoji text when not in REACTION_ICONS", () => {
    render(<SkillCard skill={buildSkill({ reactionCounts: { UNKNOWN_EMOJI: 7 } })} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("UNKNOWN_EMOJI")).toBeInTheDocument();
  });
});
