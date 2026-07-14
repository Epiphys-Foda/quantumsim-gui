import { BACKENDS, BACKEND_LABEL, BACKEND_MAX_QUBITS, PRESETS, PRESET_LABEL, type Backend, type Preset } from "../lib/types";

interface Props {
  backend: Backend;
  nQubits: number;
  preset: Preset;
  hasResult: boolean;
  animating: boolean;
  onBackend: (b: Backend) => void;
  onNQubits: (n: number) => void;
  onPreset: (p: Preset) => void;
  onRun: () => void;
  onClear: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function ControlBar(props: Props) {
  const { backend, nQubits, preset, hasResult, animating } = props;
  const maxN = BACKEND_MAX_QUBITS[backend];

  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-border bg-gradient-to-r from-card via-card/80 to-card/60 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="text-white font-bold text-sm">Ψ</span>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-sky-300 to-indigo-300 bg-clip-text text-transparent">Ψ 量子平台</span>
          <span className="text-[10px] text-muted-foreground -mt-0.5">量子实验室</span>
        </div>
      </div>

      <div className="h-8 w-px bg-border" />

      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">后端</span>
        <select
          value={backend}
          onChange={(e) => props.onBackend(e.target.value as Backend)}
          className="bg-secondary text-foreground text-sm rounded-md px-2.5 py-1.5 border border-input focus:outline-none focus:ring-2 focus:ring-sky-500/40 cursor-pointer transition-all"
        >
          {BACKENDS.map((b) => (
            <option key={b} value={b}>{BACKEND_LABEL[b]}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">量子比特</span>
        <input
          type="range"
          min={1}
          max={maxN}
          value={nQubits}
          onChange={(e) => props.onNQubits(Number(e.target.value))}
          className="w-36 accent-sky-500 cursor-pointer"
        />
        <span className="w-12 text-center font-mono text-sm font-semibold text-sky-300">{nQubits}</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">预设</span>
        <select
          value={preset}
          onChange={(e) => props.onPreset(e.target.value as Preset)}
          className="bg-secondary text-foreground text-sm rounded-md px-2.5 py-1.5 border border-input focus:outline-none focus:ring-2 focus:ring-sky-500/40 cursor-pointer transition-all"
        >
          {PRESETS.map((p) => (
            <option key={p} value={p}>{PRESET_LABEL[p]}</option>
          ))}
        </select>
      </label>

      <div className="flex-1" />

      <button
        onClick={props.onImport}
        title="从 JSON 3.0 文件导入电路"
        className="px-3 py-2 rounded-lg text-sm border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 transition-all"
      >
        导入 JSON
      </button>
      <button
        onClick={props.onExport}
        title="导出当前电路为 JSON 3.0 文件"
        className="px-3 py-2 rounded-lg text-sm border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-all"
      >
        导出 JSON
      </button>

      <button
        onClick={props.onRun}
        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg ${
          hasResult
            ? "bg-secondary text-secondary-foreground hover:bg-accent shadow-none"
            : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/30"
        }`}
      >
        {hasResult ? (animating ? "⏸ 暂停渲染" : "▶ 继续动画") : "▶ 运行电路"}
      </button>

      <button
        onClick={props.onClear}
        className="px-3.5 py-2 rounded-lg text-sm border border-input bg-transparent hover:bg-accent transition-all"
      >
        清空
      </button>
    </div>
  );
}
