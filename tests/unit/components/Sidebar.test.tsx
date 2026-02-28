// tests/unit/components/Sidebar.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) =>
    React.createElement("a", { href, className }, children),
}));

// Mock next/navigation
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Store state
let mockSidebarOpen = true;
const mockSetSidebarOpen = vi.fn((v: boolean) => { mockSidebarOpen = v; });
vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ sidebarOpen: mockSidebarOpen, setSidebarOpen: mockSetSidebarOpen }),
}));

import { Sidebar } from "@/components/layout/Sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidebarOpen = true;
    mockPathname = "/";
  });

  it("should render navigation items when open", () => {
    render(<Sidebar />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Discover Skills")).toBeInTheDocument();
    expect(screen.getByText("Create Skill")).toBeInTheDocument();
  });

  it("should render admin items when isAdmin is true", () => {
    render(<Sidebar isAdmin />);
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("should not render admin items when isAdmin is false", () => {
    render(<Sidebar />);
    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
  });

  it("should render close sidebar button when open", () => {
    render(<Sidebar />);
    expect(screen.getByLabelText("Close sidebar")).toBeInTheDocument();
  });

  it("should call setSidebarOpen(false) when close button is clicked", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByLabelText("Close sidebar"));
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
  });

  it("should render collapsed sidebar with open button when closed", () => {
    mockSidebarOpen = false;
    render(<Sidebar />);
    expect(screen.getByLabelText("Open sidebar")).toBeInTheDocument();
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
  });

  it("should call setSidebarOpen(true) when open button is clicked", () => {
    mockSidebarOpen = false;
    render(<Sidebar />);
    fireEvent.click(screen.getByLabelText("Open sidebar"));
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(true);
  });

  it("should link Home to /", () => {
    render(<Sidebar />);
    const link = screen.getByText("Home").closest("a");
    expect(link).toHaveAttribute("href", "/");
  });

  it("should link Discover Skills to /skills", () => {
    render(<Sidebar />);
    const link = screen.getByText("Discover Skills").closest("a");
    expect(link).toHaveAttribute("href", "/skills");
  });

  it("should link Create Skill to /skills/new", () => {
    render(<Sidebar />);
    const link = screen.getByText("Create Skill").closest("a");
    expect(link).toHaveAttribute("href", "/skills/new");
  });

  it("should highlight active admin item when pathname matches", () => {
    mockPathname = "/admin";
    render(<Sidebar isAdmin />);
    const adminLink = screen.getByText("Admin Panel").closest("a");
    expect(adminLink?.className).toContain("bg-primary");
  });

  it("should not highlight admin item when on different page", () => {
    mockPathname = "/skills";
    render(<Sidebar isAdmin />);
    const adminLink = screen.getByText("Admin Panel").closest("a");
    expect(adminLink?.className).toContain("text-muted-foreground");
  });
});
