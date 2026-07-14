import { GATE_COLORS, type Backend, type GateKind, type PlacedGate } from "../lib/types";

interface Props {
  circuit: PlacedGate[];
  nQubits: number;
  backend: Backend;
  pending: { gate: GateKind; q1: number; step: number } | null;
  onCellClick: (qubit: number, step: number) => void;
  hasResult: boolean;
  animating: boolean;
  onRun: () => void;
}

export function CircuitGrid({ circuit, nQubits, backend, pending, onCellClick, hasResult, animating, onRun }: Props) {
  const maxStep = circuit.reduce((m, g) => Math.max(m, g.step), 0);
  const steps = Math.max(Math.min(maxStep + 4, 24), 12);

  const findGate = (qubit: number, step: number): PlacedGate | undefined => {
    return circuit.find((g) => g.step === step && (g.q1 === qubit || g.q2 === qubit));
  };

  const cellText = (qubit: number, step: number): string => {
    const g = findGate(qubit, step);
    if (!g) return "";
    return g.kind;
  };

  const isPendingFirst = (qubit: number, step: number): boolean => {
    if (!pending) return false;
    return pending.q1 === qubit && pending.step === step;
  };

  return (
    <div className="p-3 rounded-lg border border-border bg-card/40 shadow-sm flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
          电路网格
        </h3>
        <span className="text-xs text-muted-foreground font-mono">
          {nQubits}q · {backend} · {circuit.length} 门 · {steps} 步
        </span>
      </div>
      <div className="overflow-auto flex-1 min-h-0 rounded-md border border-border/50">
        <table className="border-collapse text-xs w-full table-fixed">
          <thead className="sticky top-0 z-10">
            <tr className="bg-card/90 backdrop-blur">
              <th className="sticky left-0 bg-card/90 px-2 py-1.5 text-muted-foreground font-mono font-semibold border-b border-r border-border w-10">q\s</th>
              {Array.from({ length: steps }, (_, s) => (
                <th key={s} className="px-0.5 py-1.5 text-muted-foreground font-mono font-semibold border-b border-border">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: nQubits }, (_, q) => (
              <tr key={q} className="hover:bg-secondary/20">
                <td className="sticky left-0 bg-card/90 px-2 py-1 text-muted-foreground font-mono font-semibold border-r border-border w-10">q{q}</td>
                {Array.from({ length: steps }, (_, s) => {
                  const text = cellText(q, s);
                  const isPending = isPendingFirst(q, s);
                  const g = findGate(q, s);
                  const colorClass = g ? GATE_COLORS[g.kind] : null;
                  return (
                    <td key={s} className="p-0.5">
                      <button
                        onClick={() => onCellClick(q, s)}
                        className={`w-full h-9 rounded-md text-[10px] font-mono font-bold border transition-all ${
                          isPending
                            ? "bg-chart-3/30 text-chart-3 border-chart-3/60 animate-pulse"
                            : text
                            ? `${colorClass!.bg} ${colorClass!.text} ${colorClass!.border} hover:scale-105`
                            : "bg-secondary/20 text-muted-foreground/30 border-transparent hover:bg-accent hover:text-muted-foreground"
                        }`}
                      >
                        {isPending ? "●" : text || "·"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground/60 text-center">
        点击格子放置选中门 · 再点删除 · 双比特门先点控制位再点目标位
      </p>
      {circuit.length > 0 && (
        <button
          onClick={onRun}
          className={`mt-2 w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
            hasResult
              ? "bg-secondary text-secondary-foreground hover:bg-accent border border-input"
              : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/30"
          }`}
        >
          {hasResult ? (animating ? "⏸ 暂停渲染" : "▶ 继续动画") : "▶ 运行此电路"}
        </button>
      )}
    </div>
  );
}
