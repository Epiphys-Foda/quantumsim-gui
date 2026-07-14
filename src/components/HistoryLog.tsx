interface Props {
  history: string[];
}

export function HistoryLog({ history }: Props) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card/40 shadow-sm flex-1 flex flex-col min-h-0">
      <h3 className="text-sm font-semibold mb-2 text-foreground flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
        操作历史
      </h3>
      <div className="overflow-y-auto flex-1 min-h-0 space-y-0.5 pr-1">
        {[...history].reverse().map((line, i) => (
          <div
            key={i}
            className={`text-xs font-mono leading-relaxed px-2 py-1 rounded ${
              line.startsWith("错误") || line.startsWith("警告")
                ? "text-rose-400 bg-rose-500/10"
                : line.startsWith("完成") || line.startsWith("运行中")
                ? "text-emerald-400 bg-emerald-500/10"
                : "text-muted-foreground hover:bg-secondary/30"
            }`}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
