import { useEffect, useState } from "react";
import { ControlBar } from "./components/ControlBar";
import { GatePanel } from "./components/GatePanel";
import { CircuitGrid } from "./components/CircuitGrid";
import { ProbabilityChart } from "./components/ProbabilityChart";
import { VortexCanvas } from "./components/VortexCanvas";
import { HistoryLog } from "./components/HistoryLog";
import { runCircuit, vortexCount, vortexCharge, vortexClear, exportCircuit, importCircuit } from "./lib/api";
import {
  BACKEND_MAX_QUBITS,
  buildPreset,
  isTwoQubit,
  type Backend,
  type GateKind,
  type PlacedGate,
  type Preset,
  type RenderMode,
} from "./lib/types";

export default function App() {
  const [backend, setBackend] = useState<Backend>("Dense");
  const [nQubits, setNQubits] = useState(4);
  const [selectedGate, setSelectedGate] = useState<GateKind>("H");
  const [circuit, setCircuit] = useState<PlacedGate[]>([]);
  const [pending, setPending] = useState<{ gate: GateKind; q1: number; step: number } | null>(null);
  const [probabilities, setProbabilities] = useState<number[]>([]);
  const [measured, setMeasured] = useState(0);
  const [history, setHistory] = useState<string[]>(["就绪: 放置门后点 [▶ 运行此电路]"]);
  const [vortexHandle, setVortexHandle] = useState(0);
  const [vortexCnt, setVortexCnt] = useState(0);
  const [vortexChg, setVortexChg] = useState(0);
  const [renderMode, setRenderMode] = useState<RenderMode>("PhaseBrightness");
  const [animating, setAnimating] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [preset, setPreset] = useState<Preset>("Empty");
  const [fullscreen, setFullscreen] = useState(false);

  const addHistory = (line: string) => setHistory((h) => [...h, line]);

  const switchBackend = (b: Backend) => {
    setBackend(b);
    const max = BACKEND_MAX_QUBITS[b];
    setNQubits((n) => Math.min(n, max));
    setCircuit([]);
    setPending(null);
    setHasResult(false);
    setProbabilities([]);
    addHistory(`切换后端: ${b} (最大 ${max}q)`);
  };

  const changeNQubits = (n: number) => {
    setNQubits(n);
    setCircuit((c) => c.filter((g) => g.q1 < n && (g.q2 === null || g.q2 < 0 || g.q2 < n)));
    setPending(null);
    setHasResult(false);
    setProbabilities([]);
  };

  const loadPreset = (p: Preset) => {
    setPreset(p);
    setPending(null);
    setHasResult(false);
    setProbabilities([]);
    const result = buildPreset(p, nQubits);
    setCircuit(result.circuit);
    setNQubits(result.nQubits);
    addHistory(`已加载预设: ${p} (${result.circuit.length} 门, ${result.nQubits}q)`);
  };

  const clearAll = () => {
    setCircuit([]);
    setPending(null);
    setProbabilities([]);
    setMeasured(0);
    setHistory(["已清空电路"]);
    setHasResult(false);
    setAnimating(false);
    setPreset("Empty");
    if (vortexHandle !== 0) vortexClear(vortexHandle);
    setVortexHandle(0);
  };

  const cellClick = (qubit: number, step: number) => {
    if (pending) {
      if (qubit === pending.q1) {
        setPending(null);
        addHistory(`取消 ${pending.gate} 放置`);
        return;
      }
      setCircuit((c) => [
        ...c.filter(
          (g) =>
            !(
              g.step === pending.step &&
              (g.q1 === pending.q1 || g.q2 === pending.q1 ||
                g.q1 === qubit || g.q2 === qubit)
            )
        ),
        { kind: pending.gate, q1: pending.q1, q2: qubit, step: pending.step },
      ]);
      setPending(null);
      setHasResult(false);
      setProbabilities([]);
      addHistory(`步骤 ${step}: ${pending.gate}(q${pending.q1}, q${qubit})`);
      return;
    }

    const existingIdx = circuit.findIndex(
      (g) => g.step === step && (g.q1 === qubit || g.q2 === qubit)
    );
    if (existingIdx >= 0) {
      const existing = circuit[existingIdx];
      if (existing.kind === selectedGate && existing.q1 === qubit && !isTwoQubit(selectedGate)) {
        setCircuit((c) => c.filter((_, i) => i !== existingIdx));
        setHasResult(false);
        setProbabilities([]);
        addHistory(`删除步骤 ${step}: ${existing.kind}(q${qubit})`);
        return;
      }
      setCircuit((c) => c.filter((_, i) => i !== existingIdx));
    }

    if (isTwoQubit(selectedGate)) {
      setPending({ gate: selectedGate, q1: qubit, step });
      addHistory(`步骤 ${step}: ${selectedGate} — 已选 q${qubit}，请点目标比特`);
    } else {
      setCircuit((c) => [...c, { kind: selectedGate, q1: qubit, q2: null, step }]);
      setHasResult(false);
      setProbabilities([]);
      addHistory(`步骤 ${step}: ${selectedGate}(q${qubit})`);
    }
  };

  const onRun = async () => {
    if (hasResult) {
      setAnimating((a) => {
        addHistory(a ? "暂停渲染" : "继续动画");
        return !a;
      });
      return;
    }
    if (circuit.length === 0) {
      addHistory("警告: 电路为空,请先放置门或选预设");
      return;
    }
    try {
      addHistory(`运行中: ${circuit.length} 门, ${nQubits}q, ${backend}...`);
      const result = await runCircuit(backend, nQubits, circuit);
      if (result.error) {
        addHistory(`错误: ${result.error}`);
        return;
      }
      if (vortexHandle !== 0) vortexClear(vortexHandle);
      setProbabilities(result.probabilities);
      setMeasured(result.measured);
      setVortexHandle(result.vortex_handle);
      setHasResult(true);
      setAnimating(true);
      const cnt = await vortexCount(result.vortex_handle);
      const chg = await vortexCharge(result.vortex_handle);
      setVortexCnt(cnt);
      setVortexChg(chg);
      addHistory(`完成: ${result.elapsed_us}μs, 测量=${result.measured}, Vortex核=${cnt}, 荷=${chg}`);
    } catch (e) {
      addHistory(`运行失败: ${e}`);
    }
  };

  const onExport = async () => {
    if (circuit.length === 0) {
      addHistory("警告: 电路为空,无可导出");
      return;
    }
    try {
      const ok = await exportCircuit(backend, nQubits, circuit);
      if (ok) {
        addHistory(`已导出 JSON 3.0: ${circuit.length} 门, ${nQubits}q, ${backend}`);
      } else {
        addHistory("导出已取消");
      }
    } catch (e) {
      addHistory(`导出失败: ${e}`);
    }
  };

  const onImport = async () => {
    try {
      const doc = await importCircuit();
      if (!doc) {
        addHistory("导入已取消");
        return;
      }
      // 验证后端
      const validBackends: Backend[] = ["Dense", "Sparse", "Mps"];
      const newBackend = validBackends.includes(doc.backend) ? doc.backend : backend;
      // 验证量子比特数
      const max = BACKEND_MAX_QUBITS[newBackend];
      const newN = Math.min(Math.max(1, doc.nQubits), max);
      // 转换电路 (q2: number → number | null)
      const newCircuit: PlacedGate[] = doc.circuit.map((g) => ({
        kind: (["H","X","Y","Z","S","T","CNOT","CZ","SWAP"].includes(g.kind) ? g.kind : "H") as GateKind,
        q1: Math.max(0, Math.min(g.q1, newN - 1)),
        q2: g.q2 >= 0 ? Math.min(g.q2, newN - 1) : null,
        step: Math.max(0, g.step),
      }));
      // 清理旧状态
      if (vortexHandle !== 0) vortexClear(vortexHandle);
      setVortexHandle(0);
      setBackend(newBackend);
      setNQubits(newN);
      setCircuit(newCircuit);
      setPending(null);
      setHasResult(false);
      setAnimating(false);
      setProbabilities([]);
      setPreset("Empty");
      addHistory(`已导入 JSON ${doc.version}: ${newCircuit.length} 门, ${newN}q, ${newBackend}`);
    } catch (e) {
      addHistory(`导入失败: ${e}`);
    }
  };

  // ESC 退出全屏
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  if (fullscreen) {
    return (
      <div className="w-screen h-screen flex flex-col bg-background p-3 gap-2">
        <VortexCanvas
          handle={vortexHandle}
          hasResult={hasResult}
          animating={animating}
          renderMode={renderMode}
          vortexCount={vortexCnt}
          vortexCharge={vortexChg}
          onModeChange={setRenderMode}
          onFullscreen={() => setFullscreen(false)}
          fullscreen
        />
        <p className="text-center text-xs text-muted-foreground">ESC 退出全屏</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <ControlBar
        backend={backend}
        nQubits={nQubits}
        preset={preset}
        hasResult={hasResult}
        animating={animating}
        onBackend={switchBackend}
        onNQubits={changeNQubits}
        onPreset={loadPreset}
        onRun={onRun}
        onClear={clearAll}
        onExport={onExport}
        onImport={onImport}
      />
      <div className="flex-1 flex gap-2 p-2 min-h-0">
        {/* 左栏: 门 + 网格 (撑满上下) */}
        <div className="w-[480px] flex-shrink-0 flex flex-col gap-2 min-h-0">
          <GatePanel selected={selectedGate} pending={pending} onSelect={(g) => { setSelectedGate(g); setPending(null); }} />
          <CircuitGrid
            circuit={circuit}
            nQubits={nQubits}
            backend={backend}
            pending={pending}
            onCellClick={cellClick}
            hasResult={hasResult}
            animating={animating}
            onRun={onRun}
          />
        </div>
        {/* 中栏: Vortex */}
        <div className="flex-1 min-w-0">
          <VortexCanvas
            handle={vortexHandle}
            hasResult={hasResult}
            animating={animating}
            renderMode={renderMode}
            vortexCount={vortexCnt}
            vortexCharge={vortexChg}
            onModeChange={setRenderMode}
            onFullscreen={() => setFullscreen(true)}
          />
        </div>
        {/* 右栏: 概率 + 历史 */}
        <div className="w-[340px] flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
          <ProbabilityChart probabilities={probabilities} measured={measured} />
          <HistoryLog history={history} />
        </div>
      </div>
    </div>
  );
}
