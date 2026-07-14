//! 核心引擎桥接 — 通过 libloading 动态加载引擎
//!
//! 封装所有 FFI 调用, 对上层命令提供安全 Rust 接口.
//! 引擎缺失时返回 Err (GUI 无法启动).
//!
//! ## 设计原则
//! - GUI 必须主动调用 security_init + license_auto_verify_start, 否则 DLL 内
//!   宽限期 / 反调试 / 完整性校验 / watermark 等全部为死代码
//! - GUI 仍不含 license 业务逻辑 (验证在引擎内部), 但负责"按下启动按钮"
//! - Symbol 生命周期: Box::leak 让 Library 永久存活, Symbol<'static> 安全存入 struct

#![allow(unsafe_code)]

use crate::ffi_types::*;
use libloading::{Library, Symbol};
use serde::{Deserialize, Serialize};
use std::ffi::CString;
use std::os::raw::{c_char, c_int, c_uint};

/// HMAC shared secret (compiled in, prevents runtime plaintext exposure)
/// Reads from env var QSIM_HMAC_SECRET, falls back to empty string
const HMAC_SECRET: &str = match option_env!("QSIM_HMAC_SECRET") {
    Some(s) => s,
    None => "",
};

/// Client version (for license version check)
const CLIENT_VERSION: &str = env!("CARGO_PKG_VERSION");

// ============================================================================
// §1 DTO 类型 (Tauri 命令参数/返回值, 跨 FFI 序列化)
// ============================================================================

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PlacedGateDto {
    pub kind: String,
    pub q1: usize,
    pub q2: i64, // -1 表示单比特门
    pub step: usize,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RunResultDto {
    pub probabilities: Vec<f64>,
    pub measured: u64,
    pub vortex_handle: usize,
    pub elapsed_us: u128,
    pub error: Option<String>,
}

// ============================================================================
// §2 量子比特上限 (与 DLL 端一致)
// ============================================================================

pub const SPARSE_MAX_QUBITS: usize = 100;
pub const MPS_MAX_QUBITS: usize = 10000;

// ============================================================================
// §3 QuantumDll — FFI 客户端 (全部 Symbol<'static>)
// ============================================================================

/// 核心引擎文件名 (与引擎构建输出一致)
const CORE_DLL: &str = "quantum_sim.dll";

pub struct QuantumDll {
    lib: &'static Library,
    // Dense
    state_new: Symbol<'static, unsafe extern "C" fn(c_uint) -> QsimStateHandle>,
    state_free: Symbol<'static, unsafe extern "C" fn(QsimStateHandle)>,
    state_apply_h: Symbol<'static, unsafe extern "C" fn(QsimStateHandle, c_uint) -> c_int>,
    state_apply_x: Symbol<'static, unsafe extern "C" fn(QsimStateHandle, c_uint) -> c_int>,
    state_apply_y: Symbol<'static, unsafe extern "C" fn(QsimStateHandle, c_uint) -> c_int>,
    state_apply_z: Symbol<'static, unsafe extern "C" fn(QsimStateHandle, c_uint) -> c_int>,
    state_apply_s: Symbol<'static, unsafe extern "C" fn(QsimStateHandle, c_uint) -> c_int>,
    state_apply_t: Symbol<'static, unsafe extern "C" fn(QsimStateHandle, c_uint) -> c_int>,
    state_apply_cnot: Symbol<'static, unsafe extern "C" fn(QsimStateHandle, c_uint, c_uint) -> c_int>,
    state_apply_cz: Symbol<'static, unsafe extern "C" fn(QsimStateHandle, c_uint, c_uint) -> c_int>,
    state_apply_swap: Symbol<'static, unsafe extern "C" fn(QsimStateHandle, c_uint, c_uint) -> c_int>,
    state_prob_one: Symbol<'static, unsafe extern "C" fn(QsimStateHandle, c_uint) -> f64>,
    state_measure: Symbol<'static, unsafe extern "C" fn(QsimStateHandle) -> u64>,
    // Sparse
    sparse_new: Symbol<'static, unsafe extern "C" fn(c_uint) -> QsimSparseHandle>,
    sparse_free: Symbol<'static, unsafe extern "C" fn(QsimSparseHandle)>,
    sparse_apply_h: Symbol<'static, unsafe extern "C" fn(QsimSparseHandle, c_uint) -> c_int>,
    sparse_apply_x: Symbol<'static, unsafe extern "C" fn(QsimSparseHandle, c_uint) -> c_int>,
    sparse_apply_y: Symbol<'static, unsafe extern "C" fn(QsimSparseHandle, c_uint) -> c_int>,
    sparse_apply_z: Symbol<'static, unsafe extern "C" fn(QsimSparseHandle, c_uint) -> c_int>,
    sparse_apply_s: Symbol<'static, unsafe extern "C" fn(QsimSparseHandle, c_uint) -> c_int>,
    sparse_apply_t: Symbol<'static, unsafe extern "C" fn(QsimSparseHandle, c_uint) -> c_int>,
    sparse_apply_cnot: Symbol<'static, unsafe extern "C" fn(QsimSparseHandle, c_uint, c_uint) -> c_int>,
    sparse_apply_cz: Symbol<'static, unsafe extern "C" fn(QsimSparseHandle, c_uint, c_uint) -> c_int>,
    sparse_apply_swap: Symbol<'static, unsafe extern "C" fn(QsimSparseHandle, c_uint, c_uint) -> c_int>,
    sparse_prob_one: Symbol<'static, unsafe extern "C" fn(QsimSparseHandle, c_uint) -> f64>,
    sparse_measure: Symbol<'static, unsafe extern "C" fn(QsimSparseHandle) -> u64>,
    // MPS
    mps_new: Symbol<'static, unsafe extern "C" fn(c_uint, c_uint) -> QsimMpsHandle>,
    mps_free: Symbol<'static, unsafe extern "C" fn(QsimMpsHandle)>,
    mps_apply_h: Symbol<'static, unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int>,
    mps_apply_x: Symbol<'static, unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int>,
    mps_apply_y: Symbol<'static, unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int>,
    mps_apply_z: Symbol<'static, unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int>,
    mps_apply_s: Symbol<'static, unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int>,
    mps_apply_t: Symbol<'static, unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int>,
    mps_apply_cnot: Symbol<'static, unsafe extern "C" fn(QsimMpsHandle, c_uint, c_uint) -> c_int>,
    mps_apply_cz: Symbol<'static, unsafe extern "C" fn(QsimMpsHandle, c_uint, c_uint) -> c_int>,
    mps_apply_swap: Symbol<'static, unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int>,
    mps_prob_one: Symbol<'static, unsafe extern "C" fn(QsimMpsHandle, c_uint) -> f64>,
    mps_measure: Symbol<'static, unsafe extern "C" fn(QsimMpsHandle) -> u64>,
    // Vortex
    vortex_new: Symbol<'static, unsafe extern "C" fn() -> QsimVortexHandle>,
    vortex_free: Symbol<'static, unsafe extern "C" fn(QsimVortexHandle)>,
    vortex_clear: Symbol<'static, unsafe extern "C" fn(QsimVortexHandle)>,
    vortex_count: Symbol<'static, unsafe extern "C" fn(QsimVortexHandle) -> usize>,
    vortex_charge: Symbol<'static, unsafe extern "C" fn(QsimVortexHandle) -> c_int>,
    vortex_set_time: Symbol<'static, unsafe extern "C" fn(QsimVortexHandle, f64)>,
    vortex_evolve: Symbol<'static, unsafe extern "C" fn(QsimVortexHandle, f64) -> c_int>,
    vortex_build_from_state: Symbol<'static, unsafe extern "C" fn(QsimVortexHandle, QsimStateHandle, usize) -> c_int>,
    vortex_build_from_sparse: Symbol<'static, unsafe extern "C" fn(QsimVortexHandle, QsimSparseHandle, usize) -> c_int>,
    vortex_build_from_mps: Symbol<'static, unsafe extern "C" fn(QsimVortexHandle, QsimMpsHandle, usize) -> c_int>,
    vortex_render: Symbol<'static, unsafe extern "C" fn(QsimVortexHandle, usize, usize, c_int, f64, *mut u8, usize) -> c_int>,
    // §3.2 Security & License (必须主动启动, 否则 DLL 内安全机制全为死代码)
    security_init: Symbol<'static, unsafe extern "C" fn() -> c_int>,
    security_tick: Symbol<'static, unsafe extern "C" fn() -> c_int>,
    security_threat_score: Symbol<'static, unsafe extern "C" fn() -> u32>,
    license_check_version: Symbol<'static, unsafe extern "C" fn(*const c_char, *const c_char) -> c_int>,
    license_auto_verify_start: Symbol<'static, unsafe extern "C" fn(*const c_char) -> c_int>,
    license_status: Symbol<'static, unsafe extern "C" fn() -> c_int>,
    license_remaining_days: Symbol<'static, unsafe extern "C" fn() -> u32>,
    license_clear_cache: Symbol<'static, unsafe extern "C" fn()>,
}

impl QuantumDll {
    /// 加载核心引擎并加载所有 FFI 符号 (含 license / security)
    pub fn load() -> Result<Self, String> {
        let dll_path = std::env::current_exe()
            .ok()
            .and_then(|exe| exe.parent().map(|d| d.join(CORE_DLL)))
            .ok_or_else(|| "无法定位程序目录".to_string())?;

        let lib = unsafe { Library::new(&dll_path) }
            .map_err(|e| format!("核心引擎加载失败 ({}): {}", dll_path.display(), e))?;

        let lib: &'static Library = Box::leak(Box::new(lib));

        macro_rules! sym_fn {
            ($name:expr, $ty:ty) => {
                unsafe { lib.get::<$ty>($name) }
                    .map_err(|e| format!("DLL 缺少 {}: {}", std::str::from_utf8($name).unwrap_or("?"), e))?
            };
        }

        Ok(Self {
            lib,
            state_new: sym_fn!(b"qsim_state_new\0", unsafe extern "C" fn(c_uint) -> QsimStateHandle),
            state_free: sym_fn!(b"qsim_state_free\0", unsafe extern "C" fn(QsimStateHandle)),
            state_apply_h: sym_fn!(b"qsim_state_apply_h\0", unsafe extern "C" fn(QsimStateHandle, c_uint) -> c_int),
            state_apply_x: sym_fn!(b"qsim_state_apply_x\0", unsafe extern "C" fn(QsimStateHandle, c_uint) -> c_int),
            state_apply_y: sym_fn!(b"qsim_state_apply_y\0", unsafe extern "C" fn(QsimStateHandle, c_uint) -> c_int),
            state_apply_z: sym_fn!(b"qsim_state_apply_z\0", unsafe extern "C" fn(QsimStateHandle, c_uint) -> c_int),
            state_apply_s: sym_fn!(b"qsim_state_apply_s\0", unsafe extern "C" fn(QsimStateHandle, c_uint) -> c_int),
            state_apply_t: sym_fn!(b"qsim_state_apply_t\0", unsafe extern "C" fn(QsimStateHandle, c_uint) -> c_int),
            state_apply_cnot: sym_fn!(b"qsim_state_apply_cnot\0", unsafe extern "C" fn(QsimStateHandle, c_uint, c_uint) -> c_int),
            state_apply_cz: sym_fn!(b"qsim_state_apply_cz\0", unsafe extern "C" fn(QsimStateHandle, c_uint, c_uint) -> c_int),
            state_apply_swap: sym_fn!(b"qsim_state_apply_swap\0", unsafe extern "C" fn(QsimStateHandle, c_uint, c_uint) -> c_int),
            state_prob_one: sym_fn!(b"qsim_state_prob_one\0", unsafe extern "C" fn(QsimStateHandle, c_uint) -> f64),
            state_measure: sym_fn!(b"qsim_state_measure\0", unsafe extern "C" fn(QsimStateHandle) -> u64),

            sparse_new: sym_fn!(b"qsim_sparse_new\0", unsafe extern "C" fn(c_uint) -> QsimSparseHandle),
            sparse_free: sym_fn!(b"qsim_sparse_free\0", unsafe extern "C" fn(QsimSparseHandle)),
            sparse_apply_h: sym_fn!(b"qsim_sparse_apply_h\0", unsafe extern "C" fn(QsimSparseHandle, c_uint) -> c_int),
            sparse_apply_x: sym_fn!(b"qsim_sparse_apply_x\0", unsafe extern "C" fn(QsimSparseHandle, c_uint) -> c_int),
            sparse_apply_y: sym_fn!(b"qsim_sparse_apply_y\0", unsafe extern "C" fn(QsimSparseHandle, c_uint) -> c_int),
            sparse_apply_z: sym_fn!(b"qsim_sparse_apply_z\0", unsafe extern "C" fn(QsimSparseHandle, c_uint) -> c_int),
            sparse_apply_s: sym_fn!(b"qsim_sparse_apply_s\0", unsafe extern "C" fn(QsimSparseHandle, c_uint) -> c_int),
            sparse_apply_t: sym_fn!(b"qsim_sparse_apply_t\0", unsafe extern "C" fn(QsimSparseHandle, c_uint) -> c_int),
            sparse_apply_cnot: sym_fn!(b"qsim_sparse_apply_cnot\0", unsafe extern "C" fn(QsimSparseHandle, c_uint, c_uint) -> c_int),
            sparse_apply_cz: sym_fn!(b"qsim_sparse_apply_cz\0", unsafe extern "C" fn(QsimSparseHandle, c_uint, c_uint) -> c_int),
            sparse_apply_swap: sym_fn!(b"qsim_sparse_apply_swap\0", unsafe extern "C" fn(QsimSparseHandle, c_uint, c_uint) -> c_int),
            sparse_prob_one: sym_fn!(b"qsim_sparse_prob_one\0", unsafe extern "C" fn(QsimSparseHandle, c_uint) -> f64),
            sparse_measure: sym_fn!(b"qsim_sparse_measure\0", unsafe extern "C" fn(QsimSparseHandle) -> u64),

            mps_new: sym_fn!(b"qsim_mps_new\0", unsafe extern "C" fn(c_uint, c_uint) -> QsimMpsHandle),
            mps_free: sym_fn!(b"qsim_mps_free\0", unsafe extern "C" fn(QsimMpsHandle)),
            mps_apply_h: sym_fn!(b"qsim_mps_apply_h\0", unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int),
            mps_apply_x: sym_fn!(b"qsim_mps_apply_x\0", unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int),
            mps_apply_y: sym_fn!(b"qsim_mps_apply_y\0", unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int),
            mps_apply_z: sym_fn!(b"qsim_mps_apply_z\0", unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int),
            mps_apply_s: sym_fn!(b"qsim_mps_apply_s\0", unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int),
            mps_apply_t: sym_fn!(b"qsim_mps_apply_t\0", unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int),
            mps_apply_cnot: sym_fn!(b"qsim_mps_apply_cnot\0", unsafe extern "C" fn(QsimMpsHandle, c_uint, c_uint) -> c_int),
            mps_apply_cz: sym_fn!(b"qsim_mps_apply_cz\0", unsafe extern "C" fn(QsimMpsHandle, c_uint, c_uint) -> c_int),
            mps_apply_swap: sym_fn!(b"qsim_mps_apply_swap\0", unsafe extern "C" fn(QsimMpsHandle, c_uint) -> c_int),
            mps_prob_one: sym_fn!(b"qsim_mps_prob_one\0", unsafe extern "C" fn(QsimMpsHandle, c_uint) -> f64),
            mps_measure: sym_fn!(b"qsim_mps_measure\0", unsafe extern "C" fn(QsimMpsHandle) -> u64),

            vortex_new: sym_fn!(b"qsim_vortex_field_new\0", unsafe extern "C" fn() -> QsimVortexHandle),
            vortex_free: sym_fn!(b"qsim_vortex_field_free\0", unsafe extern "C" fn(QsimVortexHandle)),
            vortex_clear: sym_fn!(b"qsim_vortex_field_clear\0", unsafe extern "C" fn(QsimVortexHandle)),
            vortex_count: sym_fn!(b"qsim_vortex_field_count\0", unsafe extern "C" fn(QsimVortexHandle) -> usize),
            vortex_charge: sym_fn!(b"qsim_vortex_field_total_charge\0", unsafe extern "C" fn(QsimVortexHandle) -> c_int),
            vortex_set_time: sym_fn!(b"qsim_vortex_field_set_time\0", unsafe extern "C" fn(QsimVortexHandle, f64)),
            vortex_evolve: sym_fn!(b"qsim_vortex_field_evolve\0", unsafe extern "C" fn(QsimVortexHandle, f64) -> c_int),
            vortex_build_from_state: sym_fn!(b"qsim_vortex_field_build_from_state\0", unsafe extern "C" fn(QsimVortexHandle, QsimStateHandle, usize) -> c_int),
            vortex_build_from_sparse: sym_fn!(b"qsim_vortex_field_build_from_sparse\0", unsafe extern "C" fn(QsimVortexHandle, QsimSparseHandle, usize) -> c_int),
            vortex_build_from_mps: sym_fn!(b"qsim_vortex_field_build_from_mps\0", unsafe extern "C" fn(QsimVortexHandle, QsimMpsHandle, usize) -> c_int),
            vortex_render: sym_fn!(b"qsim_vortex_render\0", unsafe extern "C" fn(QsimVortexHandle, usize, usize, c_int, f64, *mut u8, usize) -> c_int),

            // §3.2 Security & License (闭合宽限期失效缺口)
            security_init: sym_fn!(b"qsim_security_init\0", unsafe extern "C" fn() -> c_int),
            security_tick: sym_fn!(b"qsim_security_tick\0", unsafe extern "C" fn() -> c_int),
            security_threat_score: sym_fn!(b"qsim_security_threat_score\0", unsafe extern "C" fn() -> u32),
            license_check_version: sym_fn!(b"qsim_license_check_version\0", unsafe extern "C" fn(*const c_char, *const c_char) -> c_int),
            license_auto_verify_start: sym_fn!(b"qsim_license_auto_verify_start\0", unsafe extern "C" fn(*const c_char) -> c_int),
            license_status: sym_fn!(b"qsim_license_status\0", unsafe extern "C" fn() -> c_int),
            license_remaining_days: sym_fn!(b"qsim_license_remaining_days\0", unsafe extern "C" fn() -> u32),
            license_clear_cache: sym_fn!(b"qsim_license_clear_cache\0", unsafe extern "C" fn()),
        })
    }

    /// 启动安全上下文 + 后台 license 自动验证线程
    ///
    /// 必须在 `app.manage(dll)` 之前调用, 否则 DLL 内所有安全机制为死代码:
    /// - security_init: create SecurityContext (anti-debug + integrity check + anti-dump)
    /// - license_auto_verify_start: 启动 6 小时周期后台验证线程
    /// - license_check_version: 首次版本检查 (触发宽限期令牌缓存)
    ///
    /// 返回 (security_ok, license_status_code, remaining_days)
    pub fn start_security_and_license(&self) -> (bool, i32, u32) {
        // 1. 初始化安全上下文 (反调试 + 完整性校验 + 内存 DRM)
        let sec_ret = unsafe { (self.security_init)() };
        let security_ok = sec_ret == 0;

        // 2. 首次 license 版本检查 (写入离线令牌, 启动 30 天宽限期计时)
        let version_c = CString::new(CLIENT_VERSION).unwrap_or_default();
        let secret_c = CString::new(HMAC_SECRET).unwrap_or_default();
        let _ = unsafe { (self.license_check_version)(version_c.as_ptr(), secret_c.as_ptr()) };

        // 3. 启动后台自动验证线程 (6 小时周期, detach 模式)
        let _ = unsafe { (self.license_auto_verify_start)(secret_c.as_ptr()) };

        // 4. 读取当前 license 状态
        let status_raw = unsafe { (self.license_status)() };
        let status = status_raw as i32;
        let days = unsafe { (self.license_remaining_days)() };

        (security_ok, status, days)
    }

    /// 周期性安全检测 (供前端定时调用, 每 64 步反调试)
    pub fn security_tick(&self) -> i32 {
        unsafe { (self.security_tick)() }
    }

    /// 当前威胁评分 (0=安全, ≥100=应退出)
    pub fn security_threat_score(&self) -> u32 {
        unsafe { (self.security_threat_score)() }
    }

    /// license 状态码 (0=有效, 1=宽限期, 2=过期, 3=无效)
    pub fn license_status_code(&self) -> i32 {
        let raw = unsafe { (self.license_status)() };
        raw as i32
    }

    /// 剩余宽限期天数
    pub fn license_days(&self) -> u32 {
        unsafe { (self.license_remaining_days)() }
    }

    // ========================================================================
    // §4 一站式电路执行
    // ========================================================================

    pub fn run_circuit(&self, backend: &str, n_qubits: usize, circuit: &[PlacedGateDto]) -> RunResultDto {
        let t0 = std::time::Instant::now();
        let mut probs = vec![0.0f64; n_qubits];
        let mut measured: u64 = 0;
        let vortex_handle = unsafe { (self.vortex_new)() };

        if vortex_handle.is_null() {
            return RunResultDto {
                probabilities: probs, measured, vortex_handle: 0, elapsed_us: 0,
                error: Some("Vortex场创建失败".to_string()),
            };
        }

        let result = match backend {
            "Dense" => {
                if n_qubits > 32 {
                    Err(format!("普通后端最多 32 量子比特 (当前 {})", n_qubits))
                } else {
                    unsafe { self.run_dense(n_qubits, circuit, &mut probs, &mut measured, vortex_handle) }
                }
            }
            "Sparse" => {
                if n_qubits > SPARSE_MAX_QUBITS {
                    Err(format!("稀疏后端最多 {} 量子比特 (当前 {})", SPARSE_MAX_QUBITS, n_qubits))
                } else {
                    unsafe { self.run_sparse(n_qubits, circuit, &mut probs, &mut measured, vortex_handle) }
                }
            }
            "Mps" => {
                if n_qubits > MPS_MAX_QUBITS {
                    Err(format!("MPS 后端最多 {} 量子比特 (当前 {})", MPS_MAX_QUBITS, n_qubits))
                } else {
                    unsafe { self.run_mps(n_qubits, circuit, &mut probs, &mut measured, vortex_handle) }
                }
            }
            other => Err(format!("未知后端: {}", other)),
        };

        let elapsed_us = t0.elapsed().as_micros();
        match result {
            Ok(()) => RunResultDto {
                probabilities: probs, measured,
                vortex_handle: vortex_handle as usize,
                elapsed_us, error: None,
            },
            Err(msg) => {
                unsafe { (self.vortex_free)(vortex_handle); }
                RunResultDto {
                    probabilities: probs, measured,
                    vortex_handle: 0, elapsed_us,
                    error: Some(msg),
                }
            }
        }
    }

    unsafe fn run_dense(&self, n_qubits: usize, circuit: &[PlacedGateDto], probs: &mut [f64], measured: &mut u64, vh: QsimVortexHandle) -> Result<(), String> {
        let sv = (self.state_new)(n_qubits as c_uint);
        if sv.is_null() { return Err("Dense 态向量创建失败".to_string()); }
        for g in circuit {
            let code = self.apply_gate_dense(sv, g);
            if code != QSIM_OK { (self.state_free)(sv); return Err(format!("Dense 应用门 {} 失败 (码 {})", g.kind, code)); }
        }
        for q in 0..n_qubits { probs[q] = (self.state_prob_one)(sv, q as c_uint); }
        *measured = (self.state_measure)(sv);
        let _ = (self.vortex_build_from_state)(vh, sv, 12);
        (self.state_free)(sv);
        Ok(())
    }

    unsafe fn run_sparse(&self, n_qubits: usize, circuit: &[PlacedGateDto], probs: &mut [f64], measured: &mut u64, vh: QsimVortexHandle) -> Result<(), String> {
        let sv = (self.sparse_new)(n_qubits as c_uint);
        if sv.is_null() { return Err("Sparse 态向量创建失败".to_string()); }
        for g in circuit {
            let code = self.apply_gate_sparse(sv, g);
            if code != QSIM_OK { (self.sparse_free)(sv); return Err(format!("Sparse 应用门 {} 失败 (码 {})", g.kind, code)); }
        }
        for q in 0..n_qubits { probs[q] = (self.sparse_prob_one)(sv, q as c_uint); }
        *measured = (self.sparse_measure)(sv);
        let _ = (self.vortex_build_from_sparse)(vh, sv, 12);
        (self.sparse_free)(sv);
        Ok(())
    }

    unsafe fn run_mps(&self, n_qubits: usize, circuit: &[PlacedGateDto], probs: &mut [f64], measured: &mut u64, vh: QsimVortexHandle) -> Result<(), String> {
        let chi = if n_qubits > 100 { 8 } else if n_qubits > 20 { 16 } else { 32 };
        let mps = (self.mps_new)(n_qubits as c_uint, chi as c_uint);
        if mps.is_null() { return Err("MPS 创建失败".to_string()); }
        for g in circuit {
            let code = self.apply_gate_mps(mps, g);
            if code != QSIM_OK { (self.mps_free)(mps); return Err(format!("MPS 应用门 {} 失败 (码 {})", g.kind, code)); }
        }
        for q in 0..n_qubits { probs[q] = (self.mps_prob_one)(mps, q as c_uint); }
        *measured = (self.mps_measure)(mps);
        let _ = (self.vortex_build_from_mps)(vh, mps, 12);
        (self.mps_free)(mps);
        Ok(())
    }

    unsafe fn apply_gate_dense(&self, sv: QsimStateHandle, g: &PlacedGateDto) -> c_int {
        match g.kind.as_str() {
            "H" => (self.state_apply_h)(sv, g.q1 as c_uint),
            "X" => (self.state_apply_x)(sv, g.q1 as c_uint),
            "Y" => (self.state_apply_y)(sv, g.q1 as c_uint),
            "Z" => (self.state_apply_z)(sv, g.q1 as c_uint),
            "S" => (self.state_apply_s)(sv, g.q1 as c_uint),
            "T" => (self.state_apply_t)(sv, g.q1 as c_uint),
            "CNOT" if g.q2 >= 0 => (self.state_apply_cnot)(sv, g.q1 as c_uint, g.q2 as c_uint),
            "CZ" if g.q2 >= 0 => (self.state_apply_cz)(sv, g.q1 as c_uint, g.q2 as c_uint),
            "SWAP" if g.q2 >= 0 => (self.state_apply_swap)(sv, g.q1 as c_uint, g.q2 as c_uint),
            _ => QSIM_ERR_INVALID_PARAM,
        }
    }

    unsafe fn apply_gate_sparse(&self, sv: QsimSparseHandle, g: &PlacedGateDto) -> c_int {
        match g.kind.as_str() {
            "H" => (self.sparse_apply_h)(sv, g.q1 as c_uint),
            "X" => (self.sparse_apply_x)(sv, g.q1 as c_uint),
            "Y" => (self.sparse_apply_y)(sv, g.q1 as c_uint),
            "Z" => (self.sparse_apply_z)(sv, g.q1 as c_uint),
            "S" => (self.sparse_apply_s)(sv, g.q1 as c_uint),
            "T" => (self.sparse_apply_t)(sv, g.q1 as c_uint),
            "CNOT" if g.q2 >= 0 => (self.sparse_apply_cnot)(sv, g.q1 as c_uint, g.q2 as c_uint),
            "CZ" if g.q2 >= 0 => (self.sparse_apply_cz)(sv, g.q1 as c_uint, g.q2 as c_uint),
            "SWAP" if g.q2 >= 0 => (self.sparse_apply_swap)(sv, g.q1 as c_uint, g.q2 as c_uint),
            _ => QSIM_ERR_INVALID_PARAM,
        }
    }

    unsafe fn apply_gate_mps(&self, mps: QsimMpsHandle, g: &PlacedGateDto) -> c_int {
        match g.kind.as_str() {
            "H" => (self.mps_apply_h)(mps, g.q1 as c_uint),
            "X" => (self.mps_apply_x)(mps, g.q1 as c_uint),
            "Y" => (self.mps_apply_y)(mps, g.q1 as c_uint),
            "Z" => (self.mps_apply_z)(mps, g.q1 as c_uint),
            "S" => (self.mps_apply_s)(mps, g.q1 as c_uint),
            "T" => (self.mps_apply_t)(mps, g.q1 as c_uint),
            "CNOT" if g.q2 >= 0 => (self.mps_apply_cnot)(mps, g.q1 as c_uint, g.q2 as c_uint),
            "CZ" if g.q2 >= 0 => (self.mps_apply_cz)(mps, g.q1 as c_uint, g.q2 as c_uint),
            "SWAP" => (self.mps_apply_swap)(mps, g.q1 as c_uint),
            _ => QSIM_ERR_INVALID_PARAM,
        }
    }

    // ========================================================================
    // §5 Vortex操作
    // ========================================================================

    pub fn vortex_new(&self) -> QsimVortexHandle { unsafe { (self.vortex_new)() } }
    pub fn vortex_free(&self, h: QsimVortexHandle) { if !h.is_null() { unsafe { (self.vortex_free)(h); } } }
    pub fn vortex_clear(&self, h: QsimVortexHandle) { if !h.is_null() { unsafe { (self.vortex_clear)(h); } } }
    pub fn vortex_count(&self, h: QsimVortexHandle) -> usize { if h.is_null() { 0 } else { unsafe { (self.vortex_count)(h) } } }
    pub fn vortex_charge(&self, h: QsimVortexHandle) -> i32 { if h.is_null() { 0 } else { unsafe { (self.vortex_charge)(h) } } }
    pub fn vortex_set_time(&self, h: QsimVortexHandle, t: f64) { if !h.is_null() { unsafe { (self.vortex_set_time)(h, t); } } }
    pub fn vortex_evolve(&self, h: QsimVortexHandle, dt: f64) -> c_int { if h.is_null() { QSIM_ERR_NULL_PTR } else { unsafe { (self.vortex_evolve)(h, dt) } } }

    pub fn vortex_render(&self, h: QsimVortexHandle, size: usize, mode: c_int, time: f64) -> Vec<u8> {
        let mut buf = vec![0u8; size * size * 4];
        if !h.is_null() {
            let _ = unsafe { (self.vortex_render)(h, size, size, mode, time, buf.as_mut_ptr(), buf.len()) };
        }
        buf
    }
}
