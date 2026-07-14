const { createCanvas } = require("@napi-rs/canvas");
const fs = require("fs");

const size = 512;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext("2d");

// 渐变背景 — 蓝→靛
const gradient = ctx.createLinearGradient(0, 0, size, size);
gradient.addColorStop(0, "#0ea5e9");
gradient.addColorStop(1, "#4f46e5");
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, size, size);

// Ψ 符号 — 大字号 + 描边, 确保缩到 32x32 仍可见
ctx.fillStyle = "white";
ctx.strokeStyle = "white";
ctx.font = '900 360px "Segoe UI", "Microsoft YaHei", Arial, sans-serif';
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.lineWidth = 28;
ctx.lineJoin = "round";
// 先描边再填充, 让笔画更粗
ctx.strokeText("\u03A8", size / 2, size / 2 + 15);
ctx.fillText("\u03A8", size / 2, size / 2 + 15);

const outPath = "C:\\FodaOS\\cauchy-gui\\src-tauri\\icons\\source_icon.png";
fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
console.log("Icon saved:", outPath, fs.statSync(outPath).size, "bytes");
