import type { ComponentProps, ReactNode } from "react";

import { MessageForkConfirmDialog } from "../../messages/components/MessageForkConfirmDialog";
import { Messages } from "../../messages/components/Messages";

export type ConversationCanvasNodeInput = {
  messagesProps: ComponentProps<typeof Messages>;
  forkConfirmDialogProps: ComponentProps<typeof MessageForkConfirmDialog>;
};

export function buildConversationCanvasNode({
  messagesProps,
  forkConfirmDialogProps,
}: ConversationCanvasNodeInput): ReactNode {
  return (
    <>
      <Messages {...messagesProps} />
      <MessageForkConfirmDialog {...forkConfirmDialogProps} />
    </>
  );
}
