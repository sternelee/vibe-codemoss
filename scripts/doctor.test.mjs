import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { hasExecutableOnPath } from "./doctor.mjs";

test("doctor accepts executable cmake found on PATH", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "ccgui-doctor-"));
  try {
    const cmakePath = path.join(tempDir, "cmake");
    await writeFile(cmakePath, "#!/bin/sh\nexit 0\n", "utf8");
    await chmod(cmakePath, 0o755);

    assert.equal(hasExecutableOnPath("cmake", tempDir), true);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("doctor rejects non-executable cmake files on PATH", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "ccgui-doctor-"));
  try {
    const cmakePath = path.join(tempDir, "cmake");
    await writeFile(cmakePath, "#!/bin/sh\nexit 0\n", "utf8");
    await chmod(cmakePath, 0o644);

    assert.equal(hasExecutableOnPath("cmake", tempDir), false);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
