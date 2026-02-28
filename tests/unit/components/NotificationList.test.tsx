// tests/unit/components/NotificationList.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) =>
    React.createElement("a", { href, className }, children),
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "2 hours ago",
}));

// Mock hooks
const mockMarkRead = { mutate: vi.fn(), isPending: false };
const mockMarkAllRead = { mutate: vi.fn(), isPending: false };
let mockData: { data: Array<Record<string, unknown>>; meta: Record<string, number> } | undefined;

vi.mock("@/features/notifications/hooks/useNotifications", () => ({
  useNotifications: () => ({ data: mockData }),
  useMarkNotificationRead: () => mockMarkRead,
  useMarkAllNotificationsRead: () => mockMarkAllRead,
}));

// Mock Pagination
vi.mock("@/components/shared/Pagination", () => ({
  Pagination: ({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) =>
    React.createElement(
      "div",
      { "data-testid": "pagination" },
      React.createElement("button", { onClick: () => onPageChange(page + 1) }, `Page ${page} of ${totalPages}`),
    ),
}));

import { NotificationList } from "@/features/notifications/components/NotificationList";

describe("NotificationList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = undefined;
  });

  it("should render heading", () => {
    render(<NotificationList />);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("should show empty state when no notifications", () => {
    mockData = { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } };
    render(<NotificationList />);
    expect(screen.getByText("No notifications.")).toBeInTheDocument();
  });

  it("should render notification with type badge and description", () => {
    mockData = {
      data: [
        {
          id: "n1",
          userId: "u1",
          type: "NEW_COMMENT",
          payload: { actorName: "Alice", skillName: "My Skill", skillId: "s1" },
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);

    expect(screen.getByText("New Comment")).toBeInTheDocument();
    expect(screen.getByText("Alice commented on My Skill")).toBeInTheDocument();
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
  });

  it("should render skill link", () => {
    mockData = {
      data: [
        {
          id: "n1",
          userId: "u1",
          type: "SKILL_RELEASED",
          payload: { actorName: "Bob", skillName: "Cool Skill", skillId: "s2" },
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);

    const link = screen.getByText("Cool Skill").closest("a");
    expect(link).toHaveAttribute("href", "/skills/s2");
  });

  it("should show 'View Skill' when skillName is missing", () => {
    mockData = {
      data: [
        {
          id: "n1",
          userId: "u1",
          type: "NEW_FOLLOWER",
          payload: { actorName: "Bob", skillId: "s3" },
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);
    expect(screen.getByText("View Skill")).toBeInTheDocument();
  });

  it("should show 'Mark all as read' button when unread exists", () => {
    mockData = {
      data: [
        { id: "n1", userId: "u1", type: "NEW_COMMENT", payload: {}, read: false, createdAt: new Date().toISOString() },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);
    expect(screen.getByText("Mark all as read")).toBeInTheDocument();
  });

  it("should not show 'Mark all as read' when all read", () => {
    mockData = {
      data: [
        { id: "n1", userId: "u1", type: "NEW_COMMENT", payload: {}, read: true, createdAt: new Date().toISOString() },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);
    expect(screen.queryByText("Mark all as read")).not.toBeInTheDocument();
  });

  it("should call markAllRead when clicking mark all", () => {
    mockData = {
      data: [
        { id: "n1", userId: "u1", type: "NEW_COMMENT", payload: {}, read: false, createdAt: new Date().toISOString() },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);
    fireEvent.click(screen.getByText("Mark all as read"));
    expect(mockMarkAllRead.mutate).toHaveBeenCalled();
  });

  it("should call markRead when clicking mark read on individual notification", () => {
    mockData = {
      data: [
        { id: "n1", userId: "u1", type: "NEW_COMMENT", payload: {}, read: false, createdAt: new Date().toISOString() },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);
    fireEvent.click(screen.getByText("Read"));
    expect(mockMarkRead.mutate).toHaveBeenCalledWith("n1");
  });

  it("should not show mark read button for read notifications", () => {
    mockData = {
      data: [
        { id: "n1", userId: "u1", type: "NEW_COMMENT", payload: {}, read: true, createdAt: new Date().toISOString() },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);
    expect(screen.queryByText("Read")).not.toBeInTheDocument();
  });

  it("should render pagination when multiple pages", () => {
    mockData = {
      data: [
        { id: "n1", userId: "u1", type: "NEW_COMMENT", payload: {}, read: false, createdAt: new Date().toISOString() },
      ],
      meta: { page: 1, pageSize: 20, total: 40, totalPages: 2 },
    };
    render(<NotificationList />);
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  it("should not render pagination when single page", () => {
    mockData = {
      data: [
        { id: "n1", userId: "u1", type: "NEW_COMMENT", payload: {}, read: false, createdAt: new Date().toISOString() },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);
    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });

  it("should render actor initial in avatar", () => {
    mockData = {
      data: [
        {
          id: "n1",
          userId: "u1",
          type: "NEW_COMMENT",
          payload: { actorName: "Alice" },
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("should render unread indicator dot for unread notifications", () => {
    mockData = {
      data: [
        { id: "n1", userId: "u1", type: "NEW_COMMENT", payload: {}, read: false, createdAt: new Date().toISOString() },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);
    expect(screen.getByLabelText("Unread")).toBeInTheDocument();
  });

  it("should render all notification types", () => {
    const types = [
      "NEW_COMMENT",
      "CHANGE_REQUEST_SUBMITTED",
      "CHANGE_REQUEST_APPROVED",
      "CHANGE_REQUEST_REJECTED",
      "NEW_FOLLOWER",
      "SKILL_RELEASED",
      "SKILL_FORKED",
      "OWNER_ADDED",
      "OWNER_REMOVED",
    ];
    mockData = {
      data: types.map((type, i) => ({
        id: `n${i}`,
        userId: "u1",
        type,
        payload: { actorName: "Actor", skillName: "Skill" },
        read: false,
        createdAt: new Date().toISOString(),
      })),
      meta: { page: 1, pageSize: 20, total: types.length, totalPages: 1 },
    };
    render(<NotificationList />);

    expect(screen.getByText("New Comment")).toBeInTheDocument();
    expect(screen.getByText("Change Request")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("New Follower")).toBeInTheDocument();
    expect(screen.getByText("Released")).toBeInTheDocument();
    expect(screen.getByText("Forked")).toBeInTheDocument();
    expect(screen.getByText("Owner Added")).toBeInTheDocument();
    expect(screen.getByText("Owner Removed")).toBeInTheDocument();
  });

  it("should handle unknown notification type gracefully", () => {
    mockData = {
      data: [
        {
          id: "n1",
          userId: "u1",
          type: "UNKNOWN_TYPE",
          payload: { actorName: "Bot" },
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);
    expect(screen.getByText("UNKNOWN_TYPE")).toBeInTheDocument();
  });

  it("should handle pagination page change", () => {
    mockData = {
      data: [
        { id: "n1", userId: "u1", type: "NEW_COMMENT", payload: {}, read: false, createdAt: new Date().toISOString() },
      ],
      meta: { page: 1, pageSize: 20, total: 40, totalPages: 2 },
    };
    render(<NotificationList />);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Page 1 of 2"));
    // After click, page state updates to 2 and mock Pagination renders new text
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("should handle missing actorName gracefully with fallback ?", () => {
    mockData = {
      data: [
        {
          id: "n1",
          userId: "u1",
          type: "NEW_COMMENT",
          payload: {},
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("should not show skill link when skillId is not in payload", () => {
    mockData = {
      data: [
        {
          id: "n1",
          userId: "u1",
          type: "NEW_FOLLOWER",
          payload: { actorName: "Bob" },
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    render(<NotificationList />);
    // No skill link should be rendered
    expect(screen.queryByText("View Skill")).not.toBeInTheDocument();
  });
});
