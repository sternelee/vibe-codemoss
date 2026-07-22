import type { GenericToolDisplayChange, GenericToolMarkerStatus } from "./genericToolPresentation";
import { FileChangeRow, unifiedDiffToPreview } from "./FileChangeRow";

type FileChangeToolContentProps = {
  changes: GenericToolDisplayChange[];
  status: GenericToolMarkerStatus;
  onOpenDiffPath?: (path: string) => void;
};

export function FileChangeToolContent({
  changes,
  status,
  onOpenDiffPath,
}: FileChangeToolContentProps) {
  return (
    <div className="tool-change-stack" role="group" aria-label="File changes">
      {changes.map((change, index) => {
        const diffText = change.diffText;
        return (
          <FileChangeRow
            key={`${change.path}::${index}`}
            filePath={change.path}
            additions={change.diffStats.additions}
            deletions={change.diffStats.deletions}
            status={status}
            canExpand={Boolean(diffText)}
            loadDiff={diffText ? () => unifiedDiffToPreview(diffText) : undefined}
            onOpenDiffPath={
              change.normalizedKind === "added" && !diffText
                ? onOpenDiffPath
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
