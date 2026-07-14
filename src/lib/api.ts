import { invoke } from "@tauri-apps/api/core";
import type { Backend, PlacedGate, RunResult } from "./types";

export async function runCircuit(
  backend: Backend,
  nQubits: number,
  circuit: PlacedGate[]
): Promise<RunResult> {
  return invoke<RunResult>("run_circuit", {
    backend,
    nQubits,
    circuit: circuit.map((g) => ({ ...g, q2: g.q2 ?? -1 })),
  });
}

export async function vortexRender(
  handle: number,
  size: number,
  mode: number,
  time: number
): Promise<Uint8Array> {
  const buffer = await invoke<ArrayBuffer>("vortex_render", { handle, size, mode, time });
  return new Uint8Array(buffer);
}

export async function vortexEvolve(handle: number, dt: number): Promise<number> {
  return invoke<number>("vortex_evolve", { handle, dt });
}

export async function vortexCount(handle: number): Promise<number> {
  return invoke<number>("vortex_count", { handle });
}

export async function vortexCharge(handle: number): Promise<number> {
  return invoke<number>("vortex_charge", { handle });
}

export async function vortexClear(handle: number): Promise<void> {
  return invoke<void>("vortex_clear", { handle });
}

// JSON 3.0 电路格式
export interface CircuitJsonV3 {
  version: string;
  backend: Backend;
  nQubits: number;
  circuit: { kind: string; q1: number; q2: number; step: number }[];
}

export async function exportCircuit(
  backend: Backend,
  nQubits: number,
  circuit: PlacedGate[]
): Promise<boolean> {
  return invoke<boolean>("export_circuit", {
    backend,
    nQubits,
    circuit: circuit.map((g) => ({
      kind: g.kind,
      q1: g.q1,
      q2: g.q2 ?? -1,
      step: g.step,
    })),
  });
}

export async function importCircuit(): Promise<CircuitJsonV3 | null> {
  const result = await invoke<CircuitJsonV3 | null>("import_circuit");
  return result;
}
