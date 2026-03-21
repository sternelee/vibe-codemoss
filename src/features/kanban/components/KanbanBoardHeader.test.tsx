/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceInfo } from "../../../types";
import type { KanbanPanel } from "../types";
import { KanbanBoardHeader } from "./KanbanBoardHeader";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const workspaceA: WorkspaceInfo = {
  id: "workspace-a",
  name: "Workspace A",
  path: "/tmp/a",
  connected: true,
  settings: { sidebarCollapsed: false },
};

const workspaceB: WorkspaceInfo = {
  id: "workspace-b",
  name: "Workspace B",
  path: "/tmp/b",
  connected: true,
  settings: { sidebarCollapsed: false },
};

const panelA: KanbanPanel = {
  id: "panel-a",
  workspaceId: workspaceA.id,
  name: "Panel A",
  sortOrder: 1,
  createdAt: 1,
  updatedAt: 1,
};

const panelB: KanbanPanel = {
  id: "panel-b",
  workspaceId: workspaceA.id,
  name: "Panel B",
  sortOrder: 2,
  createdAt: 1,
  updatedAt: 1,
};

describe("KanbanBoardHeader back menu", () => {
  it("shows merged back menu and triggers each sub action", () => {
    const onBack = vi.fn();
    const onAppModeChange = vi.fn();

    render(
      <KanbanBoardHeader
        workspace={workspaceA}
        workspaces={[workspaceA, workspaceB]}
        panel={panelA}
        panels={[panelA, panelB]}
        onBack={onBack}
        onAppModeChange={onAppModeChange}
        onSelectWorkspace={vi.fn()}
        onSelectPanel={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        showGitPanel={false}
        onToggleGitPanel={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "kanban.board.backActions",
    });
    fireEvent.click(trigger);
    fireEvent.click(
      screen.getByRole("menuitem", { name: "kanban.board.backToPanels" }),
    );

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onAppModeChange).not.toHaveBeenCalledWith("chat");

    fireEvent.click(trigger);
    fireEvent.click(
      screen.getByRole("menuitem", { name: "kanban.board.backToChat" }),
    );

    expect(onAppModeChange).toHaveBeenCalledWith("chat");
  });
});
