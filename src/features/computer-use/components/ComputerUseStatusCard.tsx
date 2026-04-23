import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ComputerUseActivationFailureKind,
  ComputerUseActivationOutcome,
  ComputerUseBlockedReason,
  ComputerUseBridgeStatus,
  ComputerUseGuidanceCode,
} from "../../../types";
import {
  ENABLE_COMPUTER_USE_BRIDGE,
  ENABLE_COMPUTER_USE_BRIDGE_ACTIVATION,
} from "../constants";
import { useComputerUseActivation } from "../hooks/useComputerUseActivation";
import { useComputerUseBridgeStatus } from "../hooks/useComputerUseBridgeStatus";

function statusKey(status: NonNullable<ComputerUseBridgeStatus["status"]>) {
  return `settings.computerUse.status.${status}`;
}

function reasonKey(reason: ComputerUseBlockedReason) {
  return `settings.computerUse.reason.${reason}`;
}

function guidanceKey(code: ComputerUseGuidanceCode) {
  return `settings.computerUse.guidance.${code}`;
}

function activationOutcomeKey(outcome: ComputerUseActivationOutcome) {
  return `settings.computerUse.activation.outcome.${outcome}`;
}

function activationFailureKey(failureKind: ComputerUseActivationFailureKind) {
  return `settings.computerUse.activation.failure.${failureKind}`;
}

function booleanLabel(value: boolean, t: (key: string) => string) {
  return value ? t("settings.computerUse.value.yes") : t("settings.computerUse.value.no");
}

function renderPathRow(label: string, value: string | null | undefined) {
  if (!value) {
    return null;
  }
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{value}</code>
    </div>
  );
}

function shouldShowActivationAction(status: ComputerUseBridgeStatus | null) {
  if (!ENABLE_COMPUTER_USE_BRIDGE_ACTIVATION || !status) {
    return false;
  }

  return (
    status.activationEnabled &&
    status.platform === "macos" &&
    status.status === "blocked" &&
    status.codexAppDetected &&
    status.pluginDetected &&
    status.pluginEnabled &&
    Boolean(status.helperPath) &&
    status.blockedReasons.includes("helper_bridge_unverified")
  );
}

export function ComputerUseStatusCard() {
  const { t } = useTranslation();
  const { status, isLoading, error, refresh } = useComputerUseBridgeStatus({
    enabled: ENABLE_COMPUTER_USE_BRIDGE,
  });
  const activationEnabled =
    ENABLE_COMPUTER_USE_BRIDGE_ACTIVATION && Boolean(status?.activationEnabled);
  const {
    result: activationResult,
    isRunning: isActivating,
    error: activationError,
    activate,
    reset: resetActivation,
  } = useComputerUseActivation({
    enabled: ENABLE_COMPUTER_USE_BRIDGE && activationEnabled,
  });

  const effectiveStatus = activationResult?.bridgeStatus ?? status;
  const showActivationAction = shouldShowActivationAction(effectiveStatus);

  const detailRows = useMemo(() => {
    if (!effectiveStatus) {
      return [];
    }
    return [
      {
        label: t("settings.computerUse.platform"),
        value: effectiveStatus.platform,
      },
      {
        label: t("settings.computerUse.codexAppDetected"),
        value: booleanLabel(effectiveStatus.codexAppDetected, t),
      },
      {
        label: t("settings.computerUse.pluginDetected"),
        value: booleanLabel(effectiveStatus.pluginDetected, t),
      },
      {
        label: t("settings.computerUse.pluginEnabled"),
        value: booleanLabel(effectiveStatus.pluginEnabled, t),
      },
    ];
  }, [effectiveStatus, t]);

  if (!ENABLE_COMPUTER_USE_BRIDGE) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{t("settings.computerUse.title")}</CardTitle>
            <CardDescription>
              {t("settings.computerUse.description")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {showActivationAction ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  void activate();
                }}
                disabled={isLoading || isActivating}
              >
                {isActivating
                  ? t("settings.computerUse.activation.running")
                  : t("settings.computerUse.activation.verify")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetActivation();
                void refresh();
              }}
              disabled={isLoading || isActivating}
            >
              {isLoading ? t("settings.computerUse.loading") : t("settings.computerUse.refresh")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {t("settings.computerUse.loadFailed")}: {error}
          </div>
        ) : null}

        {activationError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {t("settings.computerUse.activation.failedToRun")}: {activationError}
          </div>
        ) : null}

        {effectiveStatus ? (
          <>
            <div className="rounded-md border px-3 py-2">
              <div className="text-xs font-medium text-muted-foreground">
                {t("settings.computerUse.statusLabel")}
              </div>
              <div className="mt-1 text-sm font-medium">
                {t(statusKey(effectiveStatus.status))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {detailRows.map((row) => (
                <div key={row.label} className="rounded-md border px-3 py-2">
                  <div className="text-xs font-medium text-muted-foreground">{row.label}</div>
                  <div className="mt-1 text-sm">{row.value}</div>
                </div>
              ))}
            </div>

            {activationResult ? (
              <div className="space-y-3 rounded-md border px-3 py-3">
                <div className="text-sm font-medium">
                  {t("settings.computerUse.activation.resultTitle")}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t("settings.computerUse.activation.outcomeLabel")}
                    </div>
                    <div className="text-sm">
                      {t(activationOutcomeKey(activationResult.outcome))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t("settings.computerUse.activation.duration")}
                    </div>
                    <div className="text-sm">{activationResult.durationMs}ms</div>
                  </div>
                  {activationResult.failureKind ? (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">
                        {t("settings.computerUse.activation.failureKind")}
                      </div>
                      <div className="text-sm">
                        {t(activationFailureKey(activationResult.failureKind))}
                      </div>
                    </div>
                  ) : null}
                  {activationResult.exitCode !== null ? (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">
                        {t("settings.computerUse.activation.exitCode")}
                      </div>
                      <div className="text-sm">{activationResult.exitCode}</div>
                    </div>
                  ) : null}
                </div>

                {activationResult.diagnosticMessage ? (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t("settings.computerUse.activation.diagnosticMessage")}
                    </div>
                    <code className="block break-all rounded bg-muted px-2 py-1 text-xs">
                      {activationResult.diagnosticMessage}
                    </code>
                  </div>
                ) : null}

                {activationResult.stderrSnippet ? (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t("settings.computerUse.activation.stderrSnippet")}
                    </div>
                    <code className="block break-all rounded bg-muted px-2 py-1 text-xs">
                      {activationResult.stderrSnippet}
                    </code>
                  </div>
                ) : null}
              </div>
            ) : null}

            {effectiveStatus.blockedReasons.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {t("settings.computerUse.blockedReasonsTitle")}
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {effectiveStatus.blockedReasons.map((reason) => (
                    <li key={reason}>{t(reasonKey(reason))}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {effectiveStatus.guidanceCodes.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {t("settings.computerUse.guidanceTitle")}
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {effectiveStatus.guidanceCodes.map((code) => (
                    <li key={code}>{t(guidanceKey(code))}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-3">
              {renderPathRow(
                t("settings.computerUse.codexConfigPath"),
                effectiveStatus.codexConfigPath,
              )}
              {renderPathRow(
                t("settings.computerUse.marketplacePath"),
                effectiveStatus.marketplacePath,
              )}
              {renderPathRow(
                t("settings.computerUse.pluginManifestPath"),
                effectiveStatus.pluginManifestPath,
              )}
              {renderPathRow(
                t("settings.computerUse.helperDescriptorPath"),
                effectiveStatus.helperDescriptorPath,
              )}
              {renderPathRow(
                t("settings.computerUse.helperPath"),
                effectiveStatus.helperPath,
              )}
            </div>

            {effectiveStatus.diagnosticMessage ? (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  {t("settings.computerUse.diagnosticMessage")}
                </div>
                <code className="block break-all rounded bg-muted px-2 py-1 text-xs">
                  {effectiveStatus.diagnosticMessage}
                </code>
              </div>
            ) : null}

            <div className="text-xs text-muted-foreground">
              {t(
                effectiveStatus.activationEnabled
                  ? "settings.computerUse.phaseTwoNotice"
                  : "settings.computerUse.phaseOneNotice",
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            {isLoading
              ? t("settings.computerUse.loading")
              : t("settings.computerUse.empty")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
