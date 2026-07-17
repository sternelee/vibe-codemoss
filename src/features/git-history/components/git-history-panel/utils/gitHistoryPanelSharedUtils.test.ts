import { describe, expect, it } from "vitest";
import type { GitCommitFileChange } from "../../../../../types";
import {
  buildFileTreeItems,
  collectDirPaths,
} from "./gitHistoryPanelSharedUtils";

function createFileChange(path: string): GitCommitFileChange {
  return {
    path,
    status: "M",
    additions: 1,
    deletions: 0,
    diff: "",
    lineCount: 0,
    truncated: false,
  };
}

describe("gitHistoryPanelSharedUtils file tree projection", () => {
  it("compacts a single-child directory chain onto its deepest canonical path", () => {
    const files = [createFileChange("a/b/c/d.txt")];
    const items = buildFileTreeItems(files, collectDirPaths(files));

    expect(items.map((item) => item.label)).toEqual(["a.b.c", "d.txt"]);
    expect(items[0]).toMatchObject({
      id: "dir:a/b/c",
      type: "dir",
      path: "a/b/c",
      depth: 0,
      expanded: true,
    });
    expect(items[1]).toMatchObject({
      type: "file",
      path: "a/b/c/d.txt",
      depth: 1,
    });

    const collapsedItems = buildFileTreeItems(files, new Set(["a", "a/b"]));
    expect(collapsedItems).toEqual([
      expect.objectContaining({
        id: "dir:a/b/c",
        label: "a.b.c",
        path: "a/b/c",
        expanded: false,
      }),
    ]);
  });

  it("stops at a branch and compacts each child chain independently", () => {
    const files = [
      createFileChange("src/main/java/com/example/App.java"),
      createFileChange("src/test/java/com/example/AppTest.java"),
    ];
    const items = buildFileTreeItems(files, collectDirPaths(files));

    expect(items.map((item) => item.label)).toEqual([
      "src",
      "main.java.com.example",
      "App.java",
      "test.java.com.example",
      "AppTest.java",
    ]);
    expect(items.filter((item) => item.type === "dir")).toEqual([
      expect.objectContaining({ path: "src", depth: 0 }),
      expect.objectContaining({ path: "src/main/java/com/example", depth: 1 }),
      expect.objectContaining({ path: "src/test/java/com/example", depth: 1 }),
    ]);
  });

  it("does not compact across a directory containing a direct file", () => {
    const files = [
      createFileChange("src/package.json"),
      createFileChange("src/app/main.ts"),
    ];
    const items = buildFileTreeItems(files, collectDirPaths(files));

    expect(items.map((item) => item.label)).toEqual([
      "src",
      "app",
      "main.ts",
      "package.json",
    ]);
    expect(items.find((item) => item.path === "src/package.json")).toMatchObject({
      type: "file",
      depth: 1,
    });
  });

  it("normalizes Windows paths while keeping colliding dotted labels distinct", () => {
    const files = [
      createFileChange("a.b/file-a.ts"),
      createFileChange("a\\b\\file-b.ts"),
    ];
    const items = buildFileTreeItems(files, collectDirPaths(files), "repository");
    const folders = items.filter((item) => item.type === "dir");

    expect(items[0]).toMatchObject({
      id: "dir:/",
      label: "repository",
      depth: 0,
      expanded: true,
    });
    expect(folders.filter((item) => item.label === "a.b")).toEqual([
      expect.objectContaining({ id: "dir:a.b", path: "a.b", depth: 1 }),
      expect.objectContaining({ id: "dir:a/b", path: "a/b", depth: 1 }),
    ]);
    expect(items.filter((item) => item.type === "file").map((item) => item.label)).toEqual([
      "file-a.ts",
      "file-b.ts",
    ]);
  });

  it("keeps the synthetic root distinct from a real root-named directory", () => {
    const files = [createFileChange("__repo_root__/file.ts")];
    const items = buildFileTreeItems(files, collectDirPaths(files), "repository");

    expect(items.filter((item) => item.type === "dir")).toEqual([
      expect.objectContaining({ id: "dir:/", path: "/", depth: 0 }),
      expect.objectContaining({
        id: "dir:__repo_root__",
        path: "__repo_root__",
        depth: 1,
      }),
    ]);
  });
});
