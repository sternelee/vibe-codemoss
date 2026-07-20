import { describe, expect, it } from "vitest";
import { resolveCliLifecycleButtons } from "./cliLifecycleButtons";

describe("resolveCliLifecycleButtons", () => {
  it("shows install only when not installed", () => {
    expect(
      resolveCliLifecycleButtons({
        installed: false,
        updateAvailable: false,
      }),
    ).toEqual({
      showInstall: true,
      showUpgrade: false,
      showUninstall: false,
    });
  });

  it("hides uninstall when installed and up to date", () => {
    expect(
      resolveCliLifecycleButtons({
        installed: true,
        updateAvailable: false,
      }),
    ).toEqual({
      showInstall: false,
      showUpgrade: false,
      showUninstall: false,
    });
  });

  it("shows upgrade but not uninstall when outdated", () => {
    expect(
      resolveCliLifecycleButtons({
        installed: true,
        updateAvailable: true,
      }),
    ).toEqual({
      showInstall: false,
      showUpgrade: true,
      showUninstall: false,
    });
  });

  it("treats null status as not installed", () => {
    expect(resolveCliLifecycleButtons(null)).toEqual({
      showInstall: true,
      showUpgrade: false,
      showUninstall: false,
    });
  });
});
