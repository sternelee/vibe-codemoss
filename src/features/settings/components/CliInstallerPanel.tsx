import type { CliInstallAction } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { useCliInstallLifecycle } from "../hooks/useCliInstallLifecycle";
import { formatInstallerDurationMs } from "../hooks/useCliInstallLifecycle";

type CliInstallLifecycleApi = ReturnType<typeof useCliInstallLifecycle>;

type CliInstallerPanelProps = {
  t: (key: string, options?: Record<string, unknown>) => string;
  installerState: CliInstallLifecycleApi["installerState"];
  installerNowMs: number;
  onConfirm: () => void;
  onCancel: () => void;
};

function actionLabel(
  t: CliInstallerPanelProps["t"],
  action: CliInstallAction | null,
): string {
  switch (action) {
    case "installLatest":
      return t("settings.cliInstallLatest");
    case "updateLatest":
      return t("settings.cliUpdateLatest");
    case "uninstall":
      return t("settings.cliUninstall");
    default:
      return action ?? "-";
  }
}

export function CliInstallerPanel({
  t,
  installerState,
  installerNowMs,
  onConfirm,
  onCancel,
}: CliInstallerPanelProps) {
  const open = installerState.status !== "idle";
  const isRunning = installerState.status === "running";
  const isPlanning = installerState.status === "planning";
  const isFinished =
    installerState.status === "done" || installerState.status === "error";
  const canConfirm =
    Boolean(installerState.plan?.canRun) &&
    (installerState.status === "ready" ||
      (installerState.status === "error" && Boolean(installerState.plan)));

  const elapsed = formatInstallerDurationMs(
    installerState.startedAtMs
      ? (isRunning
          ? installerNowMs
          : (installerState.lastEventAtMs ?? installerNowMs)) -
          installerState.startedAtMs
      : null,
  );

  const logText =
    installerState.logLines.length > 0
      ? installerState.logLines
          .map((line) => {
            const stream = line.stream ? `${line.stream}` : line.phase;
            return `[${stream}] ${line.message}`;
          })
          .join("\n")
      : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isRunning) {
          onCancel();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-xl gap-0 p-0 overflow-hidden"
        showCloseButton={!isRunning}
        onPointerDownOutside={(event) => {
          if (isRunning) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (isRunning) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="gap-1.5 border-b px-6 py-4">
          <DialogTitle>{t("settings.cliInstallerTitle")}</DialogTitle>
          <DialogDescription>
            {isPlanning
              ? t("settings.cliInstallerPlanning")
              : t("settings.cliInstallerDialogDescription", {
                  defaultValue:
                    "Review the plan, confirm execution, and watch live progress.",
                })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[min(70vh,560px)] flex-col gap-4 overflow-y-auto px-6 py-4">
          {installerState.plan ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {t("settings.cliInstallerEngine")}: {installerState.plan.engine}
                </Badge>
                <Badge variant="secondary">
                  {actionLabel(t, installerState.plan.action)}
                </Badge>
                <Badge variant="outline">
                  {t("settings.cliInstallerBackend")}: {installerState.plan.backend}
                </Badge>
                <Badge variant="outline">
                  {t("settings.cliInstallerPlatform")}: {installerState.plan.platform}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">
                  {t("settings.cliInstallerCommand")}
                </p>
                <pre className="overflow-x-auto rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs leading-relaxed">
                  {installerState.plan.commandPreview.join(" ")}
                </pre>
              </div>

              {installerState.plan.warnings.length > 0 ? (
                <div className="space-y-1.5">
                  {installerState.plan.warnings.map((warning) => (
                    <p
                      key={warning}
                      className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
                    >
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}

              {installerState.plan.blockers.length > 0 ? (
                <div className="space-y-1.5">
                  {installerState.plan.blockers.map((blocker) => (
                    <p
                      key={blocker}
                      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      {blocker}
                    </p>
                  ))}
                </div>
              ) : null}

              {installerState.plan.manualFallback ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">
                    {t("settings.cliInstallerManualFallback")}
                  </p>
                  <pre className="overflow-x-auto rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs">
                    {installerState.plan.manualFallback}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : isPlanning ? (
            <p className="text-sm text-muted-foreground">
              {t("settings.cliInstallerPlanning")}
            </p>
          ) : null}

          {isRunning || logText ? (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    {t("settings.cliInstallerLiveLog")}
                  </p>
                  <Badge variant="outline">
                    {t("settings.cliInstallerElapsed")} {elapsed}
                  </Badge>
                </div>
                <div className="h-40 overflow-hidden rounded-md border bg-zinc-950 text-zinc-100 dark:bg-zinc-950">
                  <ScrollArea className="h-full">
                    <pre className="whitespace-pre-wrap break-all px-3 py-2 font-mono text-xs leading-relaxed">
                      {logText ?? t("settings.cliInstallerWaitingForOutput")}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </>
          ) : null}

          {installerState.result ? (
            <>
              <Separator />
              <div
                className={cn(
                  "space-y-2 rounded-md border px-3 py-3",
                  installerState.result.ok
                    ? "border-success/30 bg-success/10"
                    : "border-destructive/30 bg-destructive/10",
                )}
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={installerState.result.ok ? "success" : "error"}
                  >
                    {installerState.result.ok
                      ? t("settings.cliInstallerSucceeded")
                      : t("settings.cliInstallerFailed")}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {t("settings.cliInstallerExitCode")}{" "}
                    {installerState.result.exitCode ??
                      t("settings.statusUnknown")}
                  </span>
                </div>
                {installerState.result.details ? (
                  <p className="text-sm">{installerState.result.details}</p>
                ) : null}
                {installerState.result.stdoutSummary ? (
                  <pre className="overflow-x-auto rounded-md bg-background/60 px-2 py-1.5 font-mono text-xs">
                    {installerState.result.stdoutSummary}
                  </pre>
                ) : null}
                {installerState.result.stderrSummary ? (
                  <pre className="overflow-x-auto rounded-md bg-background/60 px-2 py-1.5 font-mono text-xs text-destructive">
                    {installerState.result.stderrSummary}
                  </pre>
                ) : null}
              </div>
            </>
          ) : null}

          {installerState.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {installerState.error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          {isFinished ? (
            <Button type="button" onClick={onCancel}>
              {t("common.close", { defaultValue: t("common.cancel") })}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isRunning}
                onClick={onCancel}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                disabled={!canConfirm || isRunning || isPlanning}
                onClick={onConfirm}
              >
                {isRunning
                  ? t("settings.cliInstallerRunning")
                  : t("settings.cliInstallerConfirm")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
