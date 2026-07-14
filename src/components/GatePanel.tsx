import { GATES, GATE_DESC, GATE_COLORS, isTwoQubit, type GateKind } from "../lib/types";

interface Props {
  selected: GateKind;
  pending: { gate: GateKind; q1: number; step: number } | null;
  onSelect: (g: GateKind) => void;
}

export function GatePanel({ selected, pending, onSelect }: Props) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card/40 shadow-sm">
      <h3 className="text-sm font-semibold mb-2.5 text-foreground flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500" />
        量子门
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {GATES.map((g) => {
          const c = GATE_COLORS[g];
          const isSelected = selected === g && !pending;
          const isPending = pending?.gate === g;
          return (
            <button
              key={g}
              onClick={() => onSelect(g)}
              className={`px-2 py-2.5 rounded-lg text-sm font-mono font-bold border transition-all ${
                isSelected
                  ? `${c.bg} ${c.text} ${c.border} ring-2 ring-offset-0 ring-offset-card shadow-lg`
                  : isPending
                  ? "bg-chart-3/30 text-chart-3 border-chart-3/50 shadow-sm animate-pulse"
                  : `${c.bg} ${c.text} ${c.border} opacity-80 hover:opacity-100`
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 px-2.5 py-2 rounded-md bg-secondary/30 text-xs text-muted-foreground min-h-[3em] flex items-center">
        {pending
          ? `⏳ ${pending.gate} 已选 q${pending.q1} 步骤${pending.step}，请点目标比特`
          : GATE_DESC[selected]}
      </div>
      {isTwoQubit(selected) && (
        <p className="mt-1.5 text-xs text-amber-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          双比特门：需点两个比特
        </p>
      )}
    </div>
  );
}
