export type EmailSenderProvider = "126" | "163" | "qq" | "custom";

export type EmailSenderSecurity = "ssl_tls" | "start_tls" | "none";

export type EmailSenderSettings = {
  enabled: boolean;
  provider: EmailSenderProvider;
  senderEmail: string;
  senderName: string;
  smtpHost: string;
  smtpPort: number;
  security: EmailSenderSecurity;
  username: string;
  recipientEmail: string;
};

export type EmailInboundSecurity = "ssl_tls" | "start_tls" | "none";

export type EmailInboundSettings = {
  enabled: boolean;
  provider: EmailSenderProvider;
  imapHost: string;
  imapPort: number;
  security: EmailInboundSecurity;
  username: string;
  mailboxFolder: string;
  allowedSenders: string[];
  pollIntervalSeconds: number;
  readOnlyMode: boolean;
  actionWindowHours: number;
  debugStorageEnabled: boolean;
};

export type EmailSenderSettingsView = {
  settings: EmailSenderSettings;
  secretConfigured: boolean;
  secret: string | null;
};

export type UpdateEmailSenderSettingsRequest = {
  settings: EmailSenderSettings;
  secret?: string | null;
  clearSecret?: boolean;
};

export type SendTestEmailRequest = {
  recipient?: string | null;
};

export type SendConversationCompletionEmailRequest = {
  workspaceId: string;
  workspaceName?: string | null;
  threadId: string;
  threadName?: string | null;
  turnId: string;
  subject: string;
  textBody: string;
  sessionId?: string | null;
  mailDrivenSessionEnabled?: boolean;
  summary?: string | null;
  nextRecommendations?: string[];
  recipient?: string | null;
};

export type EmailInboundSettingsView = {
  settings: EmailInboundSettings;
  readOnlyEffective: boolean;
};

export type UpdateEmailInboundSettingsRequest = {
  settings: EmailInboundSettings;
};

export type EmailInboundListenerStatus = {
  enabled: boolean;
  readOnly: boolean;
  connectionState: string;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  acceptedCount: number;
  queuedCount: number;
  needsConfirmationCount: number;
  rejectedCount: number;
  ignoredCount: number;
  pollingIntervalSeconds: number;
};

export type EmailMailCommandAction = "next" | "change" | "pause" | "stop" | "status";

export type InboundCommandStatus =
  | "accepted"
  | "queued"
  | "running"
  | "done"
  | "needs_confirmation"
  | "duplicate"
  | "expired"
  | "rejected"
  | "ignored";

export type EmailMailSessionState = "enabled" | "paused" | "closed";

export type EmailMailSessionRow = {
  sessionId: string;
  workspaceId: string;
  threadId: string;
  turnId: string;
  workspaceName: string | null;
  threadName: string | null;
  state: EmailMailSessionState;
  lastEventAt: string | null;
  latestAction: EmailMailCommandAction | null;
  latestStatus: InboundCommandStatus | null;
  latestRejectReason: string | null;
  outboundCount: number;
  inboundCount: number;
  queuedCount: number;
  needsConfirmationCount: number;
  latestSummary: string | null;
};

export type EmailMailTimelineEvent = {
  id: string;
  sessionId: string;
  direction: "outbound" | "inbound" | string;
  action: EmailMailCommandAction | null;
  status: string;
  subject: string | null;
  detail: string | null;
  rejectReason: string | null;
  occurredAt: string;
};

export type EmailMailSessionList = {
  listener: EmailInboundListenerStatus;
  sessions: EmailMailSessionRow[];
  timeline: EmailMailTimelineEvent[];
};

export type EmailInboundMessage = {
  uid?: string | null;
  messageId?: string | null;
  from: string;
  subject: string;
  textBody: string;
  inReplyTo?: string | null;
  references?: string[];
  headers?: Record<string, string>;
  autoSubmitted?: string | null;
  receivedAt?: string | null;
};

export type CheckEmailInboxRequest = {
  messages?: EmailInboundMessage[];
};

export type CheckEmailInboxResult = {
  checkedAt: string;
  readOnly: boolean;
  scannedCount: number;
  acceptedCount: number;
  queuedCount: number;
  needsConfirmationCount: number;
  rejectedCount: number;
  ignoredCount: number;
  duplicateCount: number;
};

export type InboundMailCommand = {
  id: string;
  mailMessageId: string;
  inReplyTo: string | null;
  linkedOutgoingMailId: string;
  sessionId: string;
  workspaceId: string;
  threadId: string;
  turnId: string;
  replyTokenHash: string;
  fromHash: string;
  fromDisplay: string | null;
  receivedAt: string;
  action: EmailMailCommandAction;
  detail: string | null;
  bodyHash: string;
  status: InboundCommandStatus;
  rejectReason: string | null;
  subjectTag: string | null;
};

export type ClaimMailCommandResult = {
  command: InboundMailCommand | null;
};

export type MutateMailSessionRequest = {
  sessionId: string;
  action:
    | "enable"
    | "pause"
    | "resume"
    | "close"
    | "confirm"
    | "ignore"
    | "cleanup"
    | "delete_mail_records";
  commandId?: string | null;
};

export type CompleteMailCommandRequest = {
  commandId: string;
  status: InboundCommandStatus;
  rejectReason?: string | null;
};

export type EmailSendErrorCode =
  | "disabled"
  | "not_configured"
  | "missing_secret"
  | "invalid_sender"
  | "invalid_recipient"
  | "connect_failed"
  | "tls_failed"
  | "authentication_failed"
  | "send_rejected"
  | "timeout"
  | "secret_store_unavailable"
  | "unknown";

export type EmailSendError = {
  code: EmailSendErrorCode;
  retryable: boolean;
  userMessage: string;
  detail?: Record<string, string>;
};

export type EmailSendResult = {
  provider: EmailSenderProvider;
  acceptedRecipients: string[];
  durationMs: number;
};

