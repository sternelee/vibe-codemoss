import { useEffect } from "react";
import { normalizeHexColor, getContrastingTextColor } from "../../../utils/colorUtils";

function applyUserMessageBubbleCssVars(
  color: string | null,
  textColor: string | null,
) {
  if (typeof document === "undefined") {
    return;
  }
  const targets: HTMLElement[] = [
    document.documentElement,
    ...(Array.from(document.querySelectorAll(".app")) as HTMLElement[]),
  ];
  targets.forEach((target) => {
    if (color) {
      target.style.setProperty("--surface-bubble-user", color);
      target.style.setProperty("--color-message-user-bg", color);
      if (textColor) {
        target.style.setProperty("--color-message-user-text", textColor);
      }
      return;
    }
    target.style.removeProperty("--surface-bubble-user");
    target.style.removeProperty("--color-message-user-bg");
    target.style.removeProperty("--color-message-user-text");
  });
}

export function useUserMessageBubbleColor(userMsgColor: string) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const normalized = normalizeHexColor(userMsgColor);

    if (normalized) {
      applyUserMessageBubbleCssVars(normalized, getContrastingTextColor(normalized));
      try {
        window.localStorage.setItem("userMsgColor", normalized);
      } catch {
        // ignore localStorage write failures
      }
      return;
    }

    applyUserMessageBubbleCssVars(null, null);
    try {
      window.localStorage.removeItem("userMsgColor");
    } catch {
      // ignore localStorage write failures
    }
  }, [userMsgColor]);
}
