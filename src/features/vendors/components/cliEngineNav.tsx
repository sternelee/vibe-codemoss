import claudeCodeCliIcon from "@lobehub/icons-static-svg/icons/claudecode-color.svg";
import codeBuddyCliIcon from "@lobehub/icons-static-svg/icons/codebuddy-color.svg";
import codexCliIcon from "@lobehub/icons-static-svg/icons/codex-color.svg";
import copilotCliIcon from "@lobehub/icons-static-svg/icons/copilot-color.svg";
import cursorCliIcon from "@lobehub/icons-static-svg/icons/cursor.svg";
import geminiCliIcon from "@lobehub/icons-static-svg/icons/geminicli-color.svg";
import glmCliIcon from "@lobehub/icons-static-svg/icons/chatglm-color.svg";
import huaweiIcon from "@lobehub/icons-static-svg/icons/huawei-color.svg";
import kimiCliIcon from "@lobehub/icons-static-svg/icons/kimi.svg";
import openCodeCliIcon from "@lobehub/icons-static-svg/icons/opencode.svg";
import piCliIcon from "@lobehub/icons-static-svg/icons/pi.svg";
import qoderCliIcon from "@lobehub/icons-static-svg/icons/qoder-color.svg";
import qwenCliIcon from "@lobehub/icons-static-svg/icons/qwen-color.svg";
import traeCliIcon from "@lobehub/icons-static-svg/icons/trae-color.svg";
import type { VendorTab } from "../types";

type UnsupportedCliEngineId =
  | "opencode"
  | "qoder"
  | "qwen"
  | "codebuddy"
  | "copilot"
  | "cursor"
  | "gemini"
  | "glm"
  | "trae"
  | "deveco"
  | "pi"
  | "iflow"
  | "kimi"
  | "kiro";

export type CliEngineId = VendorTab | UnsupportedCliEngineId;

export type CliEngineNavItem =
  | { key: VendorTab; label: string; hasConfig: boolean; supported: true }
  | { key: UnsupportedCliEngineId; label: string; supported: false };

const CLI_ICON_BY_ID: Record<CliEngineId, string | null> = {
  claude: claudeCodeCliIcon,
  codex: codexCliIcon,
  gemini: geminiCliIcon,
  opencode: openCodeCliIcon,
  glm: glmCliIcon,
  trae: traeCliIcon,
  cursor: cursorCliIcon,
  kimi: kimiCliIcon,
  deveco: huaweiIcon,
  pi: piCliIcon,
  iflow: null,
  qoder: qoderCliIcon,
  qwen: qwenCliIcon,
  codebuddy: codeBuddyCliIcon,
  copilot: copilotCliIcon,
  kiro: null,
};

export function buildCliEngineNavItems(options: {
  claudeHasConfig: boolean;
  codexHasConfig: boolean;
}): CliEngineNavItem[] {
  return [
    { key: "claude", label: "Claude Code CLI", hasConfig: options.claudeHasConfig, supported: true },
    { key: "codex", label: "Codex CLI", hasConfig: options.codexHasConfig, supported: true },
    { key: "gemini", label: "Gemini CLI", supported: false },
    { key: "opencode", label: "OpenCode CLI", supported: false },
    { key: "glm", label: "GLM CLI", supported: false },
    { key: "trae", label: "Trae CLI", supported: false },
    { key: "cursor", label: "Cursor CLI", supported: false },
    { key: "kimi", label: "Kimi CLI", supported: false },
    { key: "deveco", label: "DevEco CLI", supported: false },
    { key: "pi", label: "PI CLI", supported: false },
    { key: "iflow", label: "iFlow CLI", supported: false },
    { key: "qoder", label: "Qoder CLI", supported: false },
    { key: "qwen", label: "Qwen CLI", supported: false },
    { key: "codebuddy", label: "CodeBuddy CLI", supported: false },
    { key: "copilot", label: "Copilot CLI", supported: false },
    { key: "kiro", label: "Kiro CLI", supported: false },
  ];
}

export function CliIcon({ id, label }: { id: CliEngineId; label: string }) {
  const icon = CLI_ICON_BY_ID[id];
  return icon ? (
    <img src={icon} alt="" className="vendor-cli-logo-img" aria-hidden="true" />
  ) : (
    <span className={`vendor-cli-logo vendor-cli-logo-${id}`} aria-hidden="true">
      {label.charAt(0)}
    </span>
  );
}
