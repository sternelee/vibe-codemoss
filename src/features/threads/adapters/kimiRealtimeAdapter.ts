import type { RealtimeAdapter } from "../contracts/conversationCurtainContracts";
import { mapCommonRealtimeEvent } from "./sharedRealtimeAdapter";

export const kimiRealtimeAdapter: RealtimeAdapter = {
  engine: "kimi",
  mapEvent(input: unknown) {
    return mapCommonRealtimeEvent("kimi", input, {
      allowTextDeltaAlias: true,
    });
  },
};
