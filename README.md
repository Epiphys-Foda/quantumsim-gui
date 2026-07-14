# QuantumSim GUI

> Quantum Simulation Platform — Interactive Quantum Circuit Builder & Simulator

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-blue)](https://epiphys.com)
[![Website](https://img.shields.io/badge/Website-epiphys.com-green)](https://epiphys.com)

## Overview

QuantumSim is a high-performance quantum simulation platform supporting up to **100,000 qubits** across 5 backend types. This repository contains the **GUI client** (open-source, Apache-2.0). The core simulation engine (`quantum_sim.dll`) is a separate commercial component.

## Features

- **21 Quantum Gates**: H, X, Y, Z, S, T, CNOT, CZ, Toffoli, SWAP, Rx, Ry, Rz, U3, iSWAP, XX, YY, CRx, CRy, CRz, Fredkin
- **5 Simulation Backends**:
  - Dense State Vector — up to 32 qubits
  - Sparse State Vector — up to 64 qubits
  - MPS (Matrix Product State) — up to 100,000 qubits
  - Stabilizer — up to 256 qubits (Clifford circuits)
  - Hybrid (GPU) — up to 32 qubits
- **Interactive Circuit Builder**: Drag-and-drop gate placement, real-time simulation
- **JSON Import/Export**: Circuit sharing and batch processing
- **OpenQASM 2.0 Support**: Import/export standard quantum assembly
- **GPU Acceleration**: Cross-platform GPU backend

## Download

Pre-built binaries (including `quantum_sim.dll`) are available at:
**[https://epiphys.com](https://epiphys.com)**

## Build from Source

### Prerequisites

- Rust (stable channel)
- Node.js 18+
- npm

### Build Steps

```bash
# Install frontend dependencies
npm install

# Build in development mode
npm run tauri dev

# Build for production (outputs .exe)
npm run tauri build -- --no-bundle
```

## License

- **GUI Source Code**: Apache-2.0 (this repository)
- **Core Engine (quantum_sim.dll)**: Commercial license, 30-day free trial

## Links

- **Website**: [https://epiphys.com](https://epiphys.com)
- **Documentation**: [https://epiphys.com](https://epiphys.com)
- **Download**: [https://epiphys.com](https://epiphys.com)

## Architecture

```
quantumsim-gui/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # UI components
│   ├── App.tsx             # Main app
│   └── ...
├── src-tauri/              # Backend (Rust + Tauri)
│   ├── src/
│   │   ├── dll_bridge.rs   # DLL FFI bridge
│   │   └── lib.rs          # Entry point
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── README.md
```

## Note

The GUI communicates with `quantum_sim.dll` via FFI (Foreign Function Interface). The DLL provides 136+ C ABI functions for quantum simulation. To use the GUI, you need either:
1. Download the pre-built package from [epiphys.com](https://epiphys.com)
2. Build the DLL from source (requires separate license)
