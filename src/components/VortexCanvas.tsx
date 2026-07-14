import { useEffect, useRef } from "react";
import { vortexRender, vortexEvolve } from "../lib/api";
import { RENDER_MODES, RENDER_MODE_INDEX, type RenderMode } from "../lib/types";

interface Props {
  handle: number;
  hasResult: boolean;
  animating: boolean;
  renderMode: RenderMode;
  vortexCount: number;
  vortexCharge: number;
  onModeChange: (m: RenderMode) => void;
  onFullscreen: () => void;
  fullscreen?: boolean;
}

export function VortexCanvas({
  handle,
  hasResult,
  animating,
  renderMode,
  vortexCount,
  vortexCharge,
  onModeChange,
  onFullscreen,
  fullscreen = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasResult || handle === 0 || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const maxSize = fullscreen ? 1024 : 384;
    const size = Math.min(container.clientWidth, container.clientHeight, maxSize);
    if (size < 32) return;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!animating) {
      vortexRender(handle, size, RENDER_MODE_INDEX[renderMode], 0).then((rgba) => {
        if (!canvasRef.current) return;
        const imageData = ctx.createImageData(size, size);
        imageData.data.set(rgba);
        ctx.putImageData(imageData, 0, 0);
      });
      return;
    }

    let cancelled = false;
    let frameCount = 0;
    let phase = 0;

    const tick = async () => {
      if (cancelled) return;
      phase += 0.02;
      await vortexEvolve(handle, 0.015);

      if (frameCount % 2 === 0) {
        const rgba = await vortexRender(handle, size, RENDER_MODE_INDEX[renderMode], phase);
        if (!cancelled && canvasRef.current) {
          const imageData = ctx.createImageData(size, size);
          imageData.data.set(rgba);
          ctx.putImageData(imageData, 0, 0);
        }
      }
      frameCount++;
      if (!cancelled) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => { cancelled = true; };
  }, [handle, hasResult, animating, renderMode, fullscreen]);

  const containerClass = fullscreen
    ? "flex flex-col h-full p-1 gap-1"
    : "flex flex-col h-full p-3 rounded-lg border border-border bg-card/40 shadow-sm";

  const canvasClass = fullscreen
    ? "w-full h-full object-contain"
    : "max-w-full max-h-full rounded-lg shadow-2xl shadow-violet-500/10";

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-400 to-pink-500" />
          涡旋场渲染
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-violet-500/30 text-violet-200 font-mono">核: {vortexCount}</span>
          <span className="px-2 py-0.5 rounded bg-pink-500/30 text-pink-200 font-mono">荷: {vortexCharge}</span>
        </div>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">模式</span>
          <select
            value={renderMode}
            onChange={(e) => onModeChange(e.target.value as RenderMode)}
            className="bg-secondary text-foreground text-xs rounded-md px-2 py-1 border border-input cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500/40"
          >
            {RENDER_MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <button
          onClick={onFullscreen}
          className="px-2.5 py-1 text-xs rounded-md border border-input hover:bg-accent transition-all"
        >
          {fullscreen ? "⛶ 退出" : "⛶ 全屏"}
        </button>
      </div>
      <div ref={containerRef} className="flex-1 flex items-center justify-center min-h-0">
        {hasResult ? (
          <canvas ref={canvasRef} className={canvasClass} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center">
              <span className="text-3xl">Ψ</span>
            </div>
            <p className="text-sm">搭建电路后点击 <span className="text-emerald-400 font-semibold">▶ 运行此电路</span> 显示涡旋场</p>
          </div>
        )}
      </div>
    </div>
  );
}
