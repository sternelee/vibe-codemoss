export type ApprovalRequest = {
  workspace_id: string;
  request_id: number | string;
  method: string;
  params: Record<string, unknown>;
};

export type RequestUserInputOption = {
  label: string;
  description: string;
};

export type RequestUserInputQuestion = {
  id: string;
  header: string;
  question: string;
  isOther?: boolean;
  isSecret?: boolean;
  multiSelect?: boolean;
  options?: RequestUserInputOption[];
};

export type RequestUserInputParams = {
  thread_id: string;
  turn_id: string;
  item_id: string;
  questions: RequestUserInputQuestion[];
  completed?: boolean;
};

export type RequestUserInputRequest = {
  workspace_id: string;
  request_id: number | string;
  params: RequestUserInputParams;
};

export type CollaborationModeBlockedParams = {
  thread_id: string;
  blocked_method: string;
  effective_mode: string;
  reason_code?: string;
  reason: string;
  suggestion?: string;
  request_id?: number | string | null;
};

export type CollaborationModeBlockedRequest = {
  workspace_id: string;
  params: CollaborationModeBlockedParams;
};

export type CollaborationModeResolvedParams = {
  thread_id: string;
  selected_ui_mode: "plan" | "default";
  effective_runtime_mode: "plan" | "code";
  effective_ui_mode: "plan" | "default";
  fallback_reason?: string | null;
};

export type CollaborationModeResolvedRequest = {
  workspace_id: string;
  params: CollaborationModeResolvedParams;
};

export type RequestUserInputAnswer = {
  answers: string[];
};

export type RequestUserInputResponse = {
  answers: Record<string, RequestUserInputAnswer>;
  skippedQuestionIds?: string[];
};

export type RequestUserInputSettlementOptions = {
  staleSettlementHint?: "timeout";
};

export type RequestUserInputSettlementResult = {
  settlement: "accepted" | "stale";
};

