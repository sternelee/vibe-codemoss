export type CliLifecycleButtonVisibility = {
  showInstall: boolean;
  showUpgrade: boolean;
  showUninstall: boolean;
};

export function resolveCliLifecycleButtons(
  status: {
    installed: boolean;
    updateAvailable: boolean;
  } | null,
): CliLifecycleButtonVisibility {
  if (!status || !status.installed) {
    return {
      showInstall: true,
      showUpgrade: false,
      showUninstall: false,
    };
  }
  return {
    showInstall: false,
    showUpgrade: status.updateAvailable,
    // Uninstall entry points are intentionally disabled in the product UI.
    showUninstall: false,
  };
}
