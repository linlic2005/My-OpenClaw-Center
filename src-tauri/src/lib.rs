mod commands;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::app_version,
            commands::gateway_status
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").expect("main window");
            window.set_title("OpenClaw Center")?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
