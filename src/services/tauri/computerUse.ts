import { invoke } from "@tauri-apps/api/core";
import type {
  ComputerUseActivationResult,
  ComputerUseBridgeStatus,
} from "../../types";

export async function getComputerUseBridgeStatus(): Promise<ComputerUseBridgeStatus> {
  return invoke<ComputerUseBridgeStatus>("get_computer_use_bridge_status");
}

export async function runComputerUseActivationProbe(): Promise<ComputerUseActivationResult> {
  return invoke<ComputerUseActivationResult>("run_computer_use_activation_probe");
}
