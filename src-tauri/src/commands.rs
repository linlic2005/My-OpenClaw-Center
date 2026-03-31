use serde::Serialize;

#[derive(Serialize)]
pub struct GatewayStatus {
    version: &'static str,
    uptime: u64,
    active_connections: u32,
}

#[tauri::command]
pub fn app_version() -> String {
    "1.0.0".to_string()
}

#[tauri::command]
pub fn gateway_status() -> GatewayStatus {
    GatewayStatus {
        version: "1.5.0",
        uptime: 86_400_000,
        active_connections: 5,
    }
}
