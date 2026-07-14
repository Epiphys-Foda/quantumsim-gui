export type GateKind = "H" | "X" | "Y" | "Z" | "S" | "T" | "CNOT" | "CZ" | "SWAP";
export type Backend = "Dense" | "Sparse" | "Mps";

export interface PlacedGate {
  kind: GateKind;
  q1: number;
  q2: number | null;
  step: number;
}

export interface RunResult {
  probabilities: number[];
  measured: number;
  vortex_handle: number;
  elapsed_us: number;
  error: string | null;
}

export const GATES: GateKind[] = ["H", "X", "Y", "Z", "S", "T", "CNOT", "CZ", "SWAP"];

export const GATE_DESC: Record<GateKind, string> = {
  H: "Hadamard — 创建叠加",
  X: "Pauli-X — 翻转",
  Y: "Pauli-Y — 翻转+相位",
  Z: "Pauli-Z — 相位翻转",
  S: "S 门 — π/2 相位",
  T: "T 门 — π/4 相位",
  CNOT: "受控非 — 点控制位再点目标位",
  CZ: "受控 Z — 点控制位再点目标位",
  SWAP: "交换 — 点第一位再点第二位",
};

export interface GateColor {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const GATE_COLORS: Record<GateKind, GateColor> = {
  H:    { bg: "bg-sky-600/80",     text: "text-white",  border: "border-sky-400/80",    dot: "bg-sky-300" },
  X:    { bg: "bg-rose-600/80",    text: "text-white",  border: "border-rose-400/80",   dot: "bg-rose-300" },
  Y:    { bg: "bg-amber-600/80",   text: "text-white",  border: "border-amber-400/80",  dot: "bg-amber-300" },
  Z:    { bg: "bg-violet-600/80",  text: "text-white",  border: "border-violet-400/80", dot: "bg-violet-300" },
  S:    { bg: "bg-emerald-600/80", text: "text-white",  border: "border-emerald-400/80",dot: "bg-emerald-300" },
  T:    { bg: "bg-teal-600/80",    text: "text-white",  border: "border-teal-400/80",   dot: "bg-teal-300" },
  CNOT: { bg: "bg-indigo-600/80",  text: "text-white",  border: "border-indigo-400/80", dot: "bg-indigo-300" },
  CZ:   { bg: "bg-pink-600/80",    text: "text-white",  border: "border-pink-400/80",   dot: "bg-pink-300" },
  SWAP: { bg: "bg-yellow-600/80",  text: "text-white",  border: "border-yellow-400/80", dot: "bg-yellow-300" },
};

export const isTwoQubit = (g: GateKind): boolean =>
  g === "CNOT" || g === "CZ" || g === "SWAP";

export const BACKENDS: Backend[] = ["Dense", "Sparse", "Mps"];

export const BACKEND_LABEL: Record<Backend, string> = {
  Dense: "普通态向量 (1-32)",
  Sparse: "稀疏态向量 (1-100)",
  Mps: "MPS 张量网络 (1-10000)",
};

export const BACKEND_MAX_QUBITS: Record<Backend, number> = {
  Dense: 32,
  Sparse: 100,
  Mps: 10000,
};

export type Preset =
  | "Empty" | "Bell" | "Ghz3" | "Ghz5" | "Ghz10" | "Superposition"
  | "Grover2" | "Deutsch" | "Qft3" | "Ising2" | "Random4";

export const PRESETS: Preset[] = [
  "Empty", "Bell", "Ghz3", "Ghz5", "Ghz10", "Superposition",
  "Grover2", "Deutsch", "Qft3", "Ising2", "Random4",
];

export const PRESET_LABEL: Record<Preset, string> = {
  Empty: "— 清空 —",
  Bell: "Bell 纠缠态 (2q)",
  Ghz3: "GHZ 态 (3q)",
  Ghz5: "GHZ 态 (5q)",
  Ghz10: "GHZ 态 (10q)",
  Superposition: "均匀叠加 (nq)",
  Grover2: "Grover 搜索 (2q)",
  Deutsch: "Deutsch 算法 (2q)",
  Qft3: "量子傅里叶变换 (3q)",
  Ising2: "Ising 演化 (2q)",
  Random4: "随机电路 (4q)",
};

export function buildPreset(preset: Preset, nQubits: number): { circuit: PlacedGate[]; nQubits: number } {
  const circuit: PlacedGate[] = [];
  let n = nQubits;

  switch (preset) {
    case "Empty":
      break;
    case "Bell":
      n = 2;
      circuit.push({ kind: "H", q1: 0, q2: null, step: 0 });
      circuit.push({ kind: "CNOT", q1: 0, q2: 1, step: 1 });
      break;
    case "Ghz3":
      n = 3;
      circuit.push({ kind: "H", q1: 0, q2: null, step: 0 });
      circuit.push({ kind: "CNOT", q1: 0, q2: 1, step: 1 });
      circuit.push({ kind: "CNOT", q1: 0, q2: 2, step: 2 });
      break;
    case "Ghz5":
      n = 5;
      circuit.push({ kind: "H", q1: 0, q2: null, step: 0 });
      for (let t = 1; t < 5; t++) circuit.push({ kind: "CNOT", q1: 0, q2: t, step: t });
      break;
    case "Ghz10":
      n = 10;
      circuit.push({ kind: "H", q1: 0, q2: null, step: 0 });
      for (let t = 1; t < 10; t++) circuit.push({ kind: "CNOT", q1: 0, q2: t, step: t });
      break;
    case "Superposition":
      for (let q = 0; q < n; q++) circuit.push({ kind: "H", q1: q, q2: null, step: q });
      break;
    case "Grover2":
      n = 2;
      circuit.push({ kind: "H", q1: 0, q2: null, step: 0 });
      circuit.push({ kind: "H", q1: 1, q2: null, step: 0 });
      circuit.push({ kind: "CZ", q1: 0, q2: 1, step: 1 });
      circuit.push({ kind: "H", q1: 0, q2: null, step: 2 });
      circuit.push({ kind: "H", q1: 1, q2: null, step: 2 });
      circuit.push({ kind: "X", q1: 0, q2: null, step: 3 });
      circuit.push({ kind: "X", q1: 1, q2: null, step: 3 });
      circuit.push({ kind: "CZ", q1: 0, q2: 1, step: 4 });
      circuit.push({ kind: "X", q1: 0, q2: null, step: 5 });
      circuit.push({ kind: "X", q1: 1, q2: null, step: 5 });
      circuit.push({ kind: "H", q1: 0, q2: null, step: 6 });
      circuit.push({ kind: "H", q1: 1, q2: null, step: 6 });
      break;
    case "Deutsch":
      n = 2;
      circuit.push({ kind: "X", q1: 1, q2: null, step: 0 });
      circuit.push({ kind: "H", q1: 0, q2: null, step: 1 });
      circuit.push({ kind: "H", q1: 1, q2: null, step: 1 });
      circuit.push({ kind: "CNOT", q1: 0, q2: 1, step: 2 });
      circuit.push({ kind: "H", q1: 0, q2: null, step: 3 });
      break;
    case "Qft3":
      n = 3;
      circuit.push({ kind: "H", q1: 0, q2: null, step: 0 });
      circuit.push({ kind: "CNOT", q1: 0, q2: 1, step: 1 });
      circuit.push({ kind: "H", q1: 1, q2: null, step: 2 });
      circuit.push({ kind: "CNOT", q1: 1, q2: 2, step: 3 });
      circuit.push({ kind: "H", q1: 2, q2: null, step: 4 });
      circuit.push({ kind: "SWAP", q1: 0, q2: 2, step: 5 });
      break;
    case "Ising2":
      n = 2;
      circuit.push({ kind: "H", q1: 0, q2: null, step: 0 });
      circuit.push({ kind: "CNOT", q1: 0, q2: 1, step: 1 });
      circuit.push({ kind: "Z", q1: 1, q2: null, step: 2 });
      circuit.push({ kind: "CNOT", q1: 0, q2: 1, step: 3 });
      circuit.push({ kind: "H", q1: 0, q2: null, step: 4 });
      break;
    case "Random4":
      n = 4;
      circuit.push({ kind: "H", q1: 0, q2: null, step: 0 });
      circuit.push({ kind: "H", q1: 1, q2: null, step: 0 });
      circuit.push({ kind: "CNOT", q1: 0, q2: 2, step: 1 });
      circuit.push({ kind: "X", q1: 3, q2: null, step: 2 });
      circuit.push({ kind: "CZ", q1: 1, q2: 3, step: 3 });
      circuit.push({ kind: "H", q1: 2, q2: null, step: 4 });
      circuit.push({ kind: "SWAP", q1: 0, q2: 1, step: 5 });
      circuit.push({ kind: "T", q1: 3, q2: null, step: 6 });
      break;
  }
  return { circuit, nQubits: n };
}

export const RENDER_MODES = [
  "PhaseBrightness", "Probability", "PhaseOnly",
  "ResidueHeatmap", "PhaseFlow", "TimeEvolution",
] as const;

export type RenderMode = (typeof RENDER_MODES)[number];

export const RENDER_MODE_INDEX: Record<RenderMode, number> = {
  PhaseBrightness: 0,
  Probability: 1,
  PhaseOnly: 2,
  ResidueHeatmap: 3,
  PhaseFlow: 4,
  TimeEvolution: 5,
};
