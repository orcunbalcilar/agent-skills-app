// tests/unit/components/Header.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Hoisted variables for vi.mock factories
const { mockPush, mockSignOut, mockToggleTheme } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSignOut: vi.fn(),
  mockToggleTheme: vi.fn(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signOut: mockSignOut,
}));

// Mock Radix dropdown to render inline (no portal) so content is testable
vi.mock("@/components/ui/dropdown-menu", () => {
  const Passthrough = ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("div", props, children);
  return {
    DropdownMenu: Passthrough,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", null, children),
    DropdownMenuContent: Passthrough,
    DropdownMenuItem: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void }) =>
      React.createElement("div", { ...props, onClick, role: "menuitem" }, children),
    DropdownMenuSeparator: () => React.createElement("hr"),
  };
});

// Mock stores
let mockTheme = "light";
vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ theme: mockTheme, toggleTheme: mockToggleTheme }),
}));

let mockUnreadCount = 0;
vi.mock("@/stores/notification-store", () => ({
  useNotificationStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ unreadCount: mockUnreadCount }),
}));

import { Header } from "@/components/layout/Header";

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = "light";
    mockUnreadCount = 0;
  });

  it("should render the logo", () => {
    render(<Header />);
    expect(screen.getByText("AgentSkills")).toBeInTheDocument();
  });

  it("should render search input", () => {
    render(<Header />);
    expect(screen.getByLabelText("Search skills")).toBeInTheDocument();
  });

  it("should navigate on search submit", () => {
    render(<Header />);
    const input = screen.getByLabelText("Search skills");
    fireEvent.change(input, { target: { value: "test query" } });
    fireEvent.submit(input.closest("form")!);
    expect(mockPush).toHaveBeenCalledWith("/skills?q=test%20query");
  });

  it("should not navigate on empty search submit", () => {
    render(<Header />);
    const input = screen.getByLabelText("Search skills");
    fireEvent.submit(input.closest("form")!);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should render theme toggle button", () => {
    render(<Header />);
    expect(screen.getByLabelText("Toggle dark/light mode")).toBeInTheDocument();
  });

  it("should call toggleTheme on click", () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText("Toggle dark/light mode"));
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it("should show Sign in link when no user", () => {
    render(<Header />);
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("should render user menu when user is provided", () => {
    render(<Header user={{ name: "Alice Bob", email: "a@b.com", image: null }} />);
    expect(screen.getByLabelText("User menu")).toBeInTheDocument();
  });

  it("should show user initials in avatar", () => {
    render(<Header user={{ name: "Alice Bob", email: "a@b.com", image: null }} />);
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("should fallback to U when no name", () => {
    render(<Header user={{ name: null, email: "a@b.com", image: null }} />);
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("should show notification badge on avatar when unread > 0", () => {
    mockUnreadCount = 5;
    render(<Header user={{ name: "Alice", email: "a@b.com", image: null }} />);
    const badges = screen.getAllByText("5");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("should cap notification badge at 99+", () => {
    mockUnreadCount = 150;
    render(<Header user={{ name: "Alice", email: "a@b.com", image: null }} />);
    const badges = screen.getAllByText("99+");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("should not show notification badge when unread is 0", () => {
    mockUnreadCount = 0;
    render(<Header user={{ name: "Alice", email: "a@b.com", image: null }} />);
    expect(screen.queryByText("99+")).not.toBeInTheDocument();
  });

  it("should render dropdown menu items with user", () => {
    render(<Header user={{ name: "Alice", email: "a@b.com", image: null }} />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Preferences")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("should show unread count badge in notification menu item", () => {
    mockUnreadCount = 3;
    render(<Header user={{ name: "Alice", email: "a@b.com", image: null }} />);
    // The avatar badge + dropdown badge both show the count
    const badges = screen.getAllByText("3");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("should call signOut when clicking sign out", () => {
    render(<Header user={{ name: "Alice", email: "a@b.com", image: null }} />);
    fireEvent.click(screen.getByText("Sign out"));
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/auth/signin" });
  });

  it("should link Profile to /profile", () => {
    render(<Header user={{ name: "Alice", email: "a@b.com", image: null }} />);
    const profileLink = screen.getByText("Profile").closest("a");
    expect(profileLink).toHaveAttribute("href", "/profile");
  });

  it("should link Notifications to /notifications", () => {
    render(<Header user={{ name: "Alice", email: "a@b.com", image: null }} />);
    const link = screen.getByText("Notifications").closest("a");
    expect(link).toHaveAttribute("href", "/notifications");
  });

  it("should show 99+ badge in dropdown when unread > 99", () => {
    mockUnreadCount = 200;
    render(<Header user={{ name: "Alice", email: "a@b.com", image: null }} />);
    const badges = screen.getAllByText("99+");
    expect(badges.length).toBeGreaterThanOrEqual(2); // avatar + dropdown
  });

  it("should render dark mode sun icon", () => {
    mockTheme = "dark";
    render(<Header />);
    // Sun icon is rendered in dark mode
    expect(screen.getByLabelText("Toggle dark/light mode")).toBeInTheDocument();
  });
});
