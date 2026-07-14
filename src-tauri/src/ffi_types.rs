//! FFI 类型镜像 — 与引擎端 `#[repr(C)]` 定义位对位一致
//!
//! 本模块只包含 POD 类型 (Plain Old Data), 不依赖引擎 crate.
//! 所有常量值必须与 DLL 端 FFI 接口一致.

#![allow(dead_code)]

use std::os::raw::{c_int, c_uint};

// ============================================================================
// §1 错误码
// ============================================================================

pub const QSIM_OK: c_int = 0;
pub const QSIM_ERR_NULL_PTR: c_int = 1;
pub const QSIM_ERR_INVALID_QUBITS: c_int = 2;
pub const QSIM_ERR_INVALID_INDEX: c_int = 3;
pub const QSIM_ERR_INVALID_PARAM: c_int = 4;
pub const QSIM_ERR_OUT_OF_MEMORY: c_int = 5;
pub const QSIM_ERR_CANCELLED: c_int = 6;

// ============================================================================
// §2 门类型码 (FFI 函数名已包含门类型, 此处保留供文档)
// ============================================================================

pub const QSIM_GATE_H: c_int = 0;
pub const QSIM_GATE_X: c_int = 1;
pub const QSIM_GATE_Y: c_int = 2;
pub const QSIM_GATE_Z: c_int = 3;
pub const QSIM_GATE_S: c_int = 4;
pub const QSIM_GATE_T: c_int = 5;
pub const QSIM_GATE_CNOT: c_int = 6;
pub const QSIM_GATE_CZ: c_int = 7;
pub const QSIM_GATE_TOFFOLI: c_int = 8;
pub const QSIM_GATE_SWAP: c_int = 9;

// ============================================================================
// §3 渲染模式码
// ============================================================================

pub const QSIM_RENDER_PHASE_BRIGHTNESS: c_int = 0;
pub const QSIM_RENDER_PROBABILITY: c_int = 1;
pub const QSIM_RENDER_PHASE_ONLY: c_int = 2;
pub const QSIM_RENDER_RESIDUE_HEATMAP: c_int = 3;
pub const QSIM_RENDER_PHASE_FLOW: c_int = 4;
pub const QSIM_RENDER_TIME_EVOLUTION: c_int = 5;

// ============================================================================
// §4 QsimGate — FFI 量子门描述
// ============================================================================

#[repr(C)]
#[derive(Clone, Copy)]
pub struct QsimGate {
    pub gate_type: c_int,
    pub q: c_uint,
    pub q2: c_uint,
    pub q3: c_uint,
    pub theta: f64,
    pub phi: f64,
    pub lambda: f64,
}

impl QsimGate {
    pub fn single(gate_type: c_int, q: usize) -> Self {
        Self { gate_type, q: q as c_uint, q2: 0, q3: 0, theta: 0.0, phi: 0.0, lambda: 0.0 }
    }
    pub fn two_qubit(gate_type: c_int, q1: usize, q2: usize) -> Self {
        Self { gate_type, q: q1 as c_uint, q2: q2 as c_uint, q3: 0, theta: 0.0, phi: 0.0, lambda: 0.0 }
    }
}

// ============================================================================
// §5 不透明句柄类型 (DLL 内存, GUI 只持有指针)
// ============================================================================

pub type QsimStateHandle = *mut std::ffi::c_void;
pub type QsimSparseHandle = *mut std::ffi::c_void;
pub type QsimMpsHandle = *mut std::ffi::c_void;
pub type QsimVortexHandle = *mut std::ffi::c_void;
