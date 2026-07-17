/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RepositoryGitStatus } from "../hooks/useMultiRepositoryGitStatus";
import { GitMultiRepositoryChanges } from "./GitMultiRepositoryChanges";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params?.path ? `${key}:${params.path}` : params?.count !== undefined ? `${key}:${params.count}` : key,
  }),
}));

const repositoryStatus = (repositoryRoot: string): RepositoryGitStatus => ({
  repositoryRoot,
  displayName: repositoryRoot,
  branchName: repositoryRoot === "a" ? "main" : "sit-p2",
  stagedFiles: [],
  unstagedFiles: [{ path: "pom.xml", status: "M", additions: 1, deletions: 0 }],
  totalAdditions: 1,
  totalDeletions: 0,
  error: null,
});

describe("GitMultiRepositoryChanges", () => {
  it("restores an aggregate status refresh action in every repository header", () => {
    const onRefresh = vi.fn(async () => undefined);
    render(
      <GitMultiRepositoryChanges
        workspaceId="ws-1"
        statuses={[repositoryStatus("a"), repositoryStatus("b")]}
        isLoading={false}
        commitMessage=""
        commitLoading={false}
        onRefresh={onRefresh}
      />,
    );

    const groups = document.querySelectorAll<HTMLElement>(".git-repository-change-group");
    expect(groups).toHaveLength(2);
    groups.forEach((group) => {
      expect(within(group).getByRole("button", { name: "git.refreshStatus" })).not.toBeNull();
    });

    fireEvent.click(within(groups[1] as HTMLElement).getByRole("button", {
      name: "git.refreshStatus",
    }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("disables repository refresh actions while the aggregate refresh is loading", () => {
    const onRefresh = vi.fn(async () => undefined);
    render(
      <GitMultiRepositoryChanges
        workspaceId="ws-1"
        statuses={[repositoryStatus("a"), repositoryStatus("b")]}
        isLoading
        commitMessage=""
        commitLoading={false}
        onRefresh={onRefresh}
      />,
    );

    const refreshButtons = screen.getAllByRole("button", { name: "git.refreshStatus" });
    expect(refreshButtons).toHaveLength(2);
    refreshButtons.forEach((button) => {
      expect(button.getAttribute("disabled")).not.toBeNull();
      expect(button.classList.contains("is-spinning")).toBe(true);
      fireEvent.click(button);
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("renders repository groups and isolates the same relative path selection", () => {
    const onCommitRepositories = vi.fn();
    const onOpenGenerateMenu = vi.fn();
    render(
      <GitMultiRepositoryChanges
        workspaceId="ws-1"
        statuses={[repositoryStatus("a"), repositoryStatus("b")]}
        isLoading={false}
        commitMessage="fix: scoped"
        commitLoading={false}
        onCommitRepositories={onCommitRepositories}
        onOpenGenerateMenu={onOpenGenerateMenu}
      />,
    );

    const groups = document.querySelectorAll(".git-repository-change-group");
    expect(groups).toHaveLength(2);
    expect(within(groups[0] as HTMLElement).getByText("main")).not.toBeNull();
    expect(within(groups[1] as HTMLElement).getByText("sit-p2")).not.toBeNull();
    const content = document.querySelector(".git-multi-repository-changes__content");
    const composer = document.querySelector(".git-commit-composer");
    expect(Boolean(
      content && composer &&
      (content.compareDocumentPosition(composer) & Node.DOCUMENT_POSITION_FOLLOWING),
    )).toBe(true);

    const secondFileToggle = within(groups[1] as HTMLElement).getByRole("checkbox", {
      name: "git.commitSelectionToggleFile:pom.xml",
    });
    fireEvent.click(secondFileToggle);
    const generateButton = screen.getByRole("button", {
      name: "git.generateCommitMessage",
    });
    expect(generateButton.querySelector(".commit-message-engine-icon")).not.toBeNull();
    fireEvent.click(generateButton);
    expect(onOpenGenerateMenu).toHaveBeenCalledWith(
      expect.anything(),
      [{ repositoryRoot: "b", selectedPaths: ["pom.xml"] }],
    );
    fireEvent.click(screen.getByRole("button", { name: "git.commit" }));

    expect(onCommitRepositories).toHaveBeenCalledWith([
      { repositoryRoot: "b", selectedPaths: ["pom.xml"] },
    ]);
  });

  it("forwards modal preview with repository identity", () => {
    const onOpenFilePreview = vi.fn();
    render(
      <GitMultiRepositoryChanges
        workspaceId="ws-1"
        statuses={[repositoryStatus("services/api")]}
        isLoading={false}
        commitMessage=""
        commitLoading={false}
        onOpenFilePreview={onOpenFilePreview}
      />,
    );

    const previewButton = document.querySelector<HTMLButtonElement>(
      '.diff-row[data-path="pom.xml"] .diff-row-action--preview-modal',
    );
    expect(previewButton).toBeTruthy();
    fireEvent.click(previewButton as HTMLButtonElement);

    expect(onOpenFilePreview).toHaveBeenCalledWith(
      "services/api",
      expect.objectContaining({ path: "pom.xml", status: "M" }),
      "unstaged",
    );
  });

  it("forwards direct file-row opens with repository identity", () => {
    const onOpenFile = vi.fn();
    render(
      <GitMultiRepositoryChanges
        workspaceId="ws-1"
        statuses={[repositoryStatus("repo-a"), repositoryStatus("repo-b")]}
        isLoading={false}
        commitMessage=""
        commitLoading={false}
        onOpenFile={onOpenFile}
      />,
    );

    const rows = document.querySelectorAll<HTMLElement>('.diff-row[data-path="pom.xml"]');
    expect(rows).toHaveLength(2);
    fireEvent.click(rows[0] as HTMLElement);
    fireEvent.click(rows[1] as HTMLElement);
    fireEvent.keyDown(rows[1] as HTMLElement, { key: "Enter" });

    expect(onOpenFile).toHaveBeenNthCalledWith(1, "repo-a", "pom.xml");
    expect(onOpenFile).toHaveBeenNthCalledWith(2, "repo-b", "pom.xml");
    expect(onOpenFile).toHaveBeenNthCalledWith(3, "repo-b", "pom.xml");
  });

  it("shows discard only for unstaged rows and forwards repository identity", () => {
    const onDiscardFile = vi.fn();
    const status = repositoryStatus("services/api");
    status.stagedFiles = [
      { path: "staged.md", status: "M", additions: 1, deletions: 0 },
    ];
    render(
      <GitMultiRepositoryChanges
        workspaceId="ws-1"
        statuses={[status]}
        isLoading={false}
        commitMessage=""
        commitLoading={false}
        onDiscardFile={onDiscardFile}
      />,
    );

    const discardButtons = document.querySelectorAll<HTMLButtonElement>(
      ".diff-row-action--discard",
    );
    expect(discardButtons).toHaveLength(1);
    expect(discardButtons[0]?.closest(".diff-row")?.getAttribute("data-path")).toBe("pom.xml");

    fireEvent.click(discardButtons[0] as HTMLButtonElement);

    expect(onDiscardFile).toHaveBeenCalledWith("services/api", "pom.xml");
  });
});
