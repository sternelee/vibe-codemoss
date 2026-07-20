import { useCallback, useEffect, useState } from "react";
import type { CliInstallEngine, CliVersionStatus } from "@/types";
import { getCliVersionStatus } from "@/services/tauri";

type UseCliVersionStatusOptions = {
  engine: CliInstallEngine;
  enabled?: boolean;
};

export function useCliVersionStatus({
  engine,
  enabled = true,
}: UseCliVersionStatusOptions) {
  const [status, setStatus] = useState<CliVersionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await getCliVersionStatus(engine);
      setStatus(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [enabled, engine]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  return {
    status,
    loading,
    error,
    refresh,
  };
}
