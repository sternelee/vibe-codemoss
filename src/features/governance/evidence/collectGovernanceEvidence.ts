import { readOpenSpecEvidence } from "./openspecEvidenceReader";
import { readGateArtifactEvidence } from "./gateArtifactEvidenceReader";
import { readScriptEvidence } from "./scriptEvidenceReader";
import { readTrellisEvidence } from "./trellisEvidenceReader";
import type { GovernanceEvidence, WorkspaceGovernanceSnapshot } from "./types";
import { readWorkflowEvidence } from "./workflowEvidenceReader";

export async function collectGovernanceEvidence(
  snapshot: WorkspaceGovernanceSnapshot,
): Promise<GovernanceEvidence[]> {
  const [openspecEvidence, gateArtifactEvidence, scriptEvidence, trellisEvidence] = await Promise.all([
    readOpenSpecEvidence(snapshot),
    readGateArtifactEvidence(snapshot),
    readScriptEvidence(snapshot),
    readTrellisEvidence(snapshot),
  ]);

  return [
    ...openspecEvidence,
    ...gateArtifactEvidence,
    ...scriptEvidence,
    ...readWorkflowEvidence(snapshot),
    ...trellisEvidence,
  ];
}
