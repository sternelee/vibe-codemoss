import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle";
import { useTranslation } from "react-i18next";

type ThreadLoadingStateProps = {
  nested?: boolean;
};

export function ThreadLoadingState({ nested = false }: ThreadLoadingStateProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`thread-loading-state${nested ? " thread-loading-state-nested" : ""}`}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="animate-spin" size={13} aria-hidden="true" />
      <span>{t("sidebar.loadingWorkspaceSessions")}</span>
    </div>
  );
}
