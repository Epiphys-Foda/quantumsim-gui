interface Props {
  probabilities: number[];
  measured: number;
}

export function ProbabilityChart({ probabilities, measured }: Props) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card/40 shadow-sm">
      <h3 className="text-sm font-semibold mb-2.5 text-foreground flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-gradient-to-b from-sky-400 to-cyan-500" />
        测量概率 P(|1⟩)
      </h3>
      {probabilities.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">(运行电路后显示)</p>
      ) : (
        <div className="space-y-2">
          {probabilities.map((p, q) => (
            <div key={q} className="flex items-center gap-2 text-xs">
              <span className="w-8 text-muted-foreground font-mono">q{q}</span>
              <div className="flex-1 h-5 bg-secondary/30 rounded-md overflow-hidden border border-border/30">
                <div
                  className="h-full rounded-md transition-all duration-300 bg-gradient-to-r from-sky-500 to-cyan-400"
                  style={{ width: `${Math.min(p * 100, 100)}%` }}
                />
              </div>
              <span className={`w-16 text-right font-mono font-semibold ${p > 0.5 ? "text-emerald-400" : p > 0.01 ? "text-sky-300" : "text-muted-foreground"}`}>
                {p.toFixed(4)}
              </span>
            </div>
          ))}
          <div className="pt-2.5 mt-1 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">确定性测量</span>
            <span className="font-mono font-bold text-lg text-emerald-400">{measured}</span>
          </div>
        </div>
      )}
    </div>
  );
}
