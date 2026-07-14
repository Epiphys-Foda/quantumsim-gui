//! GUI 后端命令定义
//!
//! GUI 在启动时主动调用 security_init + license_auto_verify_start,
//! 闭合"宽限期完全失效"缺口. 安全业务逻辑仍在引擎内部, GUI 只负责"按下启动按钮".

mod dll_bridge;
mod ffi_types;

use crate::dll_bridge::{PlacedGateDto, QuantumDll, RunResultDto};
use serde::Serialize;
use std::os::raw::c_int;
use tauri::{Manager, State};

// ============================================================================
// §1 命令
// ============================================================================

/// license / 安全状态返回结构
#[derive(Serialize, Clone, Debug)]
pub struct SecurityStatusDto {
    /// 安全上下文是否成功初始化
    pub security_ok: bool,
    /// license 状态码: 0=有效 1=宽限期 2=过期 3=无效
    pub license_status: i32,
    /// 剩余宽限期天数
    pub remaining_days: u32,
    /// 当前威胁评分 (0=安全, ≥100=应退出)
    pub threat_score: u32,
}

#[tauri::command]
fn security_status(state: State<QuantumDll>) -> SecurityStatusDto {
    SecurityStatusDto {
        security_ok: true, // 已在启动时初始化, 此处恒为 true
        license_status: state.license_status_code(),
        remaining_days: state.license_days(),
        threat_score: state.security_threat_score(),
    }
}

/// 前端定时调用 (建议每 5 秒), 触发引擎内反调试 + canary 校验
#[tauri::command]
fn security_tick(state: State<QuantumDll>) -> i32 {
    state.security_tick()
}

#[tauri::command]
fn run_circuit(
    state: State<QuantumDll>,
    backend: String,
    n_qubits: usize,
    circuit: Vec<PlacedGateDto>,
) -> Result<RunResultDto, String> {
    Ok(state.run_circuit(&backend, n_qubits, &circuit))
}

#[tauri::command]
fn vortex_render(
    state: State<QuantumDll>,
    handle: usize,
    size: usize,
    mode: i32,
    time: f64,
) -> tauri::ipc::Response {
    let h = handle as *mut std::ffi::c_void;
    tauri::ipc::Response::new(state.vortex_render(h, size, mode as c_int, time))
}

#[tauri::command]
fn vortex_evolve(state: State<QuantumDll>, handle: usize, dt: f64) -> Result<i32, String> {
    let h = handle as *mut std::ffi::c_void;
    Ok(state.vortex_evolve(h, dt) as i32)
}

#[tauri::command]
fn vortex_count(state: State<QuantumDll>, handle: usize) -> usize {
    let h = handle as *mut std::ffi::c_void;
    state.vortex_count(h)
}

#[tauri::command]
fn vortex_charge(state: State<QuantumDll>, handle: usize) -> i32 {
    let h = handle as *mut std::ffi::c_void;
    state.vortex_charge(h)
}

#[tauri::command]
fn vortex_clear(state: State<QuantumDll>, handle: usize) {
    let h = handle as *mut std::ffi::c_void;
    state.vortex_clear(h);
}

// ============================================================================
// §2 JSON 3.0 电路导入/导出 — 兼容 OpenQASM 3.0 风格 JSON
// ============================================================================

/// 电路 JSON 3.0 格式:
/// {
///   "version": "3.0",
///   "backend": "Dense",
///   "nQubits": 4,
///   "circuit": [
///     {"kind": "H",    "q1": 0, "q2": null, "step": 0},
///     {"kind": "CNOT", "q1": 0, "q2": 1,    "step": 1}
///   ]
/// }
#[derive(serde::Serialize, serde::Deserialize)]
struct CircuitJsonV3 {
    version: String,
    backend: String,
    #[serde(rename = "nQubits")]
    n_qubits: usize,
    circuit: Vec<PlacedGateDto>,
}

#[tauri::command]
async fn export_circuit(
    backend: String,
    n_qubits: usize,
    circuit: Vec<PlacedGateDto>,
) -> Result<bool, String> {
    let doc = CircuitJsonV3 {
        version: "3.0".to_string(),
        backend,
        n_qubits,
        circuit,
    };
    let json = serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())?;

    let file = rfd::AsyncFileDialog::new()
        .set_title("导出电路 JSON 3.0")
        .add_filter("JSON", &["json"])
        .set_file_name("circuit.json")
        .save_file()
        .await;

    match file {
        Some(path) => {
            std::fs::write(path.path(), json).map_err(|e| e.to_string())?;
            Ok(true)
        }
        None => Ok(false),
    }
}

#[tauri::command]
async fn import_circuit() -> Result<Option<CircuitJsonV3>, String> {
    let file = rfd::AsyncFileDialog::new()
        .set_title("导入电路 JSON 3.0")
        .add_filter("JSON", &["json"])
        .pick_file()
        .await;

    match file {
        Some(path) => {
            let content = std::fs::read_to_string(path.path()).map_err(|e| e.to_string())?;
            let doc: CircuitJsonV3 = serde_json::from_str(&content).map_err(|e| e.to_string())?;
            if !doc.version.starts_with("3.") {
                return Err(format!("不支持的版本: {} (仅支持 3.x)", doc.version));
            }
            Ok(Some(doc))
        }
        None => Ok(None),
    }
}

// ============================================================================
// §3 Windows MessageBox — DLL 缺失时弹框提示 (不闪退)
// ============================================================================

#[cfg(windows)]
fn show_error_dialog(title: &str, msg: &str) {
    use std::ffi::CString;
    let title_c = CString::new(title).unwrap_or_else(|_| CString::new("Error").unwrap());
    let msg_c = CString::new(msg).unwrap_or_else(|_| CString::new("Unknown error").unwrap());
    unsafe {
        extern "system" {
            fn MessageBoxA(hWnd: *mut std::ffi::c_void, lpText: *const i8, lpCaption: *const i8, uType: u32) -> i32;
        }
        // 0x10 = MB_ICONERROR
        MessageBoxA(std::ptr::null_mut(), msg_c.as_ptr(), title_c.as_ptr(), 0x10);
    }
}

#[cfg(not(windows))]
fn show_error_dialog(title: &str, msg: &str) {
    eprintln!("{}: {}", title, msg);
}

// ============================================================================
// §4 应用入口
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            match QuantumDll::load() {
                Ok(dll) => {
                    // 启动安全上下文 + 后台 license 自动验证
                    // 必须在 app.manage 之前调用, 否则宽限期/反调试/watermark 全失效
                    let (sec_ok, lic_status, days) = dll.start_security_and_license();
                    if sec_ok {
                        eprintln!(
                            "[Security] 安全上下文已启动 | license={}, 剩余 {} 天",
                            lic_status, days
                        );
                    } else {
                        eprintln!("[Security] ⚠ 安全上下文初始化失败, 继续运行但防护降级");
                    }
                    app.manage(dll);
                    Ok(())
                }
                Err(e) => {
                    eprintln!("核心引擎加载失败: {}", e);
                    show_error_dialog(
                        "启动失败",
                        &format!(
                            "无法加载核心引擎:\n\n{}\n\n请确认引擎文件与此程序在同一目录后重试.",
                            e
                        ),
                    );
                    Err(Box::new(std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        format!("引擎加载失败: {}", e),
                    )) as Box<dyn std::error::Error>)
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            run_circuit,
            vortex_render,
            vortex_evolve,
            vortex_count,
            vortex_charge,
            vortex_clear,
            export_circuit,
            import_circuit,
            // 安全状态查询 + 周期性反调试
            security_status,
            security_tick,
        ])
        .run(tauri::generate_context!())
        .expect("error while running application");
}
