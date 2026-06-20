#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use rusqlite::{params, Connection};
use tauri::{AppHandle, Manager, WebviewWindow, Emitter};

// --- Structs for Data Sharing ---

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Session {
  #[serde(rename = "startTime")]
  pub start_time: i64,
  #[serde(rename = "endTime")]
  pub end_time: i64,
  pub duration: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Subtask {
  pub id: String,
  pub title: String,
  #[serde(rename = "isCompleted")]
  pub is_completed: bool,
  pub percentage: Option<i32>,
  #[serde(rename = "timeSpent")]
  pub time_spent: Option<i64>,
  pub sessions: Option<Vec<Session>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Task {
  pub id: String,
  pub title: String,
  pub description: String,
  pub percentage: i32,
  #[serde(rename = "isCompleted")]
  pub is_completed: bool,
  pub subtasks: Vec<Subtask>,
  #[serde(rename = "createdAt")]
  pub created_at: i64,
  #[serde(rename = "totalTimeSpent")]
  pub total_time_spent: Option<i64>,
  pub status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ActivitySession {
  pub id: String,
  pub r#type: String, // food, nap, rest, break, drift
  #[serde(rename = "startTime")]
  pub start_time: i64,
  #[serde(rename = "endTime")]
  pub end_time: i64,
  pub duration: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TimerState {
  #[serde(rename = "taskId")]
  pub task_id: Option<String>,
  #[serde(rename = "subtaskTitle")]
  pub subtask_title: Option<String>,
  #[serde(rename = "startTime")]
  pub start_time: Option<i64>,
  #[serde(rename = "isPaused")]
  pub is_paused: bool,
  pub elapsed: i64,
}

// --- App State ---
pub struct AppState {
  pub db_path: String,
  pub timer: Arc<Mutex<TimerState>>,
}

// --- Database Logic ---

fn get_db_connection(state: &tauri::State<'_, AppState>) -> Result<Connection, rusqlite::Error> {
  Connection::open(&state.db_path)
}

fn bootstrap_db(path: &str) -> Result<(), rusqlite::Error> {
  let conn = Connection::open(path)?;
  
  conn.execute(
    "CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      percentage INTEGER,
      is_completed INTEGER,
      created_at INTEGER,
      total_time_spent INTEGER,
      status TEXT
    )",
    [],
  )?;

  conn.execute(
    "CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      title TEXT NOT NULL,
      is_completed INTEGER,
      percentage INTEGER,
      time_spent INTEGER,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )",
    [],
  )?;

  conn.execute(
    "CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      subtask_id TEXT,
      start_time INTEGER,
      end_time INTEGER,
      duration INTEGER,
      FOREIGN KEY(subtask_id) REFERENCES subtasks(id) ON DELETE CASCADE
    )",
    [],
  )?;

  conn.execute(
    "CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      start_time INTEGER,
      end_time INTEGER,
      duration INTEGER
    )",
    [],
  )?;

  conn.execute(
    "CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )",
    [],
  )?;

  Ok(())
}

// --- DB-Backed Tauri IPC commands ---

#[tauri::command]
fn db_get_tasks(state: tauri::State<'_, AppState>) -> Result<Vec<Task>, String> {
  let conn = get_db_connection(&state).map_err(|e| e.to_string())?;
  
  let mut stmt = conn
    .prepare("SELECT id, title, description, percentage, is_completed, created_at, total_time_spent, status FROM tasks")
    .map_err(|e| e.to_string())?;

  let task_rows = stmt
    .query_map([], |row| {
      Ok((
        row.get::<_, String>(0)?,
        row.get::<_, String>(1)?,
        row.get::<_, String>(2)?,
        row.get::<_, i32>(3)?,
        row.get::<_, i32>(4)? != 0,
        row.get::<_, i64>(5)?,
        row.get::<_, Option<i64>>(6)?,
        row.get::<_, String>(7)?,
      ))
    })
    .map_err(|e| e.to_string())?;

  let mut tasks = Vec::new();

  for task_row in task_rows {
    let (id, title, description, percentage, is_completed, created_at, total_time_spent, status) = task_row.map_err(|e| e.to_string())?;
    
    // Fetch Subtasks
    let mut sub_stmt = conn
      .prepare("SELECT id, title, is_completed, percentage, time_spent FROM subtasks WHERE task_id = ?")
      .map_err(|e| e.to_string())?;
      
    let subtask_rows = sub_stmt
      .query_map([&id], |row| {
        Ok((
          row.get::<_, String>(0)?,
          row.get::<_, String>(1)?,
          row.get::<_, i32>(2)? != 0,
          row.get::<_, Option<i32>>(3)?,
          row.get::<_, Option<i64>>(4)?,
        ))
      })
      .map_err(|e| e.to_string())?;

    let mut subtasks = Vec::new();
    for sub_row in subtask_rows {
      let (sid, stitle, sis_completed, spercentage, stime_spent) = sub_row.map_err(|e| e.to_string())?;
      
      // Fetch Sessions for each subtask
      let mut sess_stmt = conn
        .prepare("SELECT start_time, end_time, duration FROM sessions WHERE subtask_id = ?")
        .map_err(|e| e.to_string())?;
        
      let sess_rows = sess_stmt
        .query_map([&sid], |row| {
          Ok(Session {
            start_time: row.get::<_, i64>(0)?,
            end_time: row.get::<_, i64>(1)?,
            duration: row.get::<_, i64>(2)?,
          })
        })
        .map_err(|e| e.to_string())?;

      let mut sessions = Vec::new();
      for sess in sess_rows {
        sessions.push(sess.map_err(|e| e.to_string())?);
      }

      subtasks.push(Subtask {
        id: sid,
        title: stitle,
        is_completed: sis_completed,
        percentage: spercentage,
        time_spent: stime_spent,
        sessions: Some(sessions),
      });
    }

    tasks.push(Task {
      id,
      title,
      description,
      percentage,
      is_completed,
      subtasks,
      created_at,
      total_time_spent,
      status,
    });
  }

  Ok(tasks)
}

#[tauri::command]
fn db_save_task(state: tauri::State<'_, AppState>, task: Task) -> Result<(), String> {
  let mut conn = get_db_connection(&state).map_err(|e| e.to_string())?;
  let tx = conn.transaction().map_err(|e| e.to_string())?;

  tx.execute(
    "INSERT OR REPLACE INTO tasks (id, title, description, percentage, is_completed, created_at, total_time_spent, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    params![
      task.id,
      task.title,
      task.description,
      task.percentage,
      task.is_completed as i32,
      task.created_at,
      task.total_time_spent,
      task.status
    ],
  )
  .map_err(|e| e.to_string())?;

  // Clear existing subtasks and sessions to replace them securely
  for sub in &task.subtasks {
    tx.execute("DELETE FROM sessions WHERE subtask_id = ?", params![sub.id]).map_err(|e| e.to_string())?;
  }
  tx.execute("DELETE FROM subtasks WHERE task_id = ?", params![task.id]).map_err(|e| e.to_string())?;

  for sub in &task.subtasks {
    tx.execute(
      "INSERT INTO subtasks (id, task_id, title, is_completed, percentage, time_spent) VALUES (?, ?, ?, ?, ?, ?)",
      params![
        sub.id,
        task.id,
        sub.title,
        sub.is_completed as i32,
        sub.percentage,
        sub.time_spent
      ],
    )
    .map_err(|e| e.to_string())?;

    if let Some(sessions) = &sub.sessions {
      for sess in sessions {
        let sess_id = format!("{}_{}", sub.id, sess.start_time);
        tx.execute(
          "INSERT OR REPLACE INTO sessions (id, subtask_id, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?)",
          params![
            sess_id,
            sub.id,
            sess.start_time,
            sess.end_time,
            sess.duration
          ],
        )
        .map_err(|e| e.to_string())?;
      }
    }
  }

  tx.commit().map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
fn db_delete_task(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
  let conn = get_db_connection(&state).map_err(|e| e.to_string())?;
  
  // Cascading deletes manually in case SQLite config lacks foreign key support activated by default
  let subtask_ids: Vec<String> = {
    let mut stmt = conn.prepare("SELECT id FROM subtasks WHERE task_id = ?").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([&id], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?;
    rows.filter_map(Result::ok).collect()
  };

  for sid in subtask_ids {
    let _ = conn.execute("DELETE FROM sessions WHERE subtask_id = ?", params![sid]);
  }
  let _ = conn.execute("DELETE FROM subtasks WHERE task_id = ?", params![id]);
  conn.execute("DELETE FROM tasks WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
  
  Ok(())
}

#[tauri::command]
fn db_get_activities(state: tauri::State<'_, AppState>) -> Result<Vec<ActivitySession>, String> {
  let conn = get_db_connection(&state).map_err(|e| e.to_string())?;
  let mut stmt = conn
    .prepare("SELECT id, type, start_time, end_time, duration FROM activities")
    .map_err(|e| e.to_string())?;

  let rows = stmt
    .query_map([], |row| {
      Ok(ActivitySession {
        id: row.get(0)?,
        r#type: row.get(1)?,
        start_time: row.get(2)?,
        end_time: row.get(3)?,
        duration: row.get(4)?,
      })
    })
    .map_err(|e| e.to_string())?;

  let mut list = Vec::new();
  for row in rows {
    list.push(row.map_err(|e| e.to_string())?);
  }
  Ok(list)
}

#[tauri::command]
fn db_add_activity(state: tauri::State<'_, AppState>, activity: ActivitySession) -> Result<(), String> {
  let conn = get_db_connection(&state).map_err(|e| e.to_string())?;
  conn.execute(
    "INSERT OR REPLACE INTO activities (id, type, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?)",
    params![
      activity.id,
      activity.r#type,
      activity.start_time,
      activity.end_time,
      activity.duration
    ],
  )
  .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
fn db_get_setting(state: tauri::State<'_, AppState>, key: String) -> Result<Option<String>, String> {
  let conn = get_db_connection(&state).map_err(|e| e.to_string())?;
  let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?").map_err(|e| e.to_string())?;
  let mut rows = stmt.query([&key]).map_err(|e| e.to_string())?;
  
  if let Some(row) = rows.next().map_err(|e| e.to_string())? {
    let val: String = row.get(0).map_err(|e| e.to_string())?;
    Ok(Some(val))
  } else {
    Ok(None)
  }
}

#[tauri::command]
fn db_save_setting(state: tauri::State<'_, AppState>, key: String, value: String) -> Result<(), String> {
  let conn = get_db_connection(&state).map_err(|e| e.to_string())?;
  conn.execute(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    params![key, value],
  )
  .map_err(|e| e.to_string())?;
  Ok(())
}

// --- Window Manager IPC Handles ---

#[tauri::command]
fn open_timer_widget(app_handle: AppHandle) -> Result<(), String> {
  if let Some(widget) = app_handle.get_webview_window("timer-widget") {
    widget.show().map_err(|e| e.to_string())?;
    widget.set_always_on_top(true).map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn close_timer_widget(app_handle: AppHandle) -> Result<(), String> {
  if let Some(widget) = app_handle.get_webview_window("timer-widget") {
    widget.hide().map_err(|e| e.to_string())?;
  }
  Ok(())
}

// --- Shared Timer Logic Commands ---

#[tauri::command]
fn start_timer_sync(state: tauri::State<'_, AppState>, task_id: String, subtask_title: String) -> Result<(), String> {
  let mut timer = state.timer.lock().unwrap();
  timer.task_id = Some(task_id);
  timer.subtask_title = Some(subtask_title);
  timer.start_time = Some(chrono::Utc::now().timestamp_millis());
  timer.is_paused = false;
  timer.elapsed = 0;
  Ok(())
}

#[tauri::command]
fn stop_timer_sync(state: tauri::State<'_, AppState>) -> Result<TimerState, String> {
  let mut timer = state.timer.lock().unwrap();
  let results = timer.clone();
  timer.task_id = None;
  timer.subtask_title = None;
  timer.start_time = None;
  timer.is_paused = false;
  timer.elapsed = 0;
  Ok(results)
}

#[tauri::command]
fn update_timer_elapsed(state: tauri::State<'_, AppState>, elapsed: i64) -> Result<(), String> {
  let mut timer = state.timer.lock().unwrap();
  timer.elapsed = elapsed;
  Ok(())
}

#[tauri::command]
fn get_timer_sync_state(state: tauri::State<'_, AppState>) -> Result<TimerState, String> {
  let timer = state.timer.lock().unwrap();
  Ok(timer.clone())
}

// --- App Bootstrap ---

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      // Setup Local Data SQLite DB Location
      let mut app_dir = app.path().app_data_dir().unwrap_or_else(|_| {
        std::env::current_dir().unwrap()
      });
      std::fs::create_dir_all(&app_dir).unwrap_or_default();
      app_dir.push("trackit.db");
      let path_str = app_dir.to_string_lossy().to_string();

      // Ensure folders and tables exist
      bootstrap_db(&path_str).expect("Failed to initialize database");

      // Set App State
      app.manage(AppState {
        db_path: path_str,
        timer: Arc::new(Mutex::new(TimerState {
          task_id: None,
          subtask_title: None,
          start_time: None,
          is_paused: false,
          elapsed: 0,
        })),
      });

      // System Tray Handler for Phase 5
      // Beautiful tray with Quit and Toggle Window options
      let tray_menu = tauri::menu::Menu::with_items(
        app,
        &[
          &tauri::menu::MenuItem::with_id(app, "toggle_dash", "Toggle Dashboard", true, None::<&str>).unwrap(),
          &tauri::menu::MenuItem::with_id(app, "toggle_timer", "Toggle Timer Widget", true, None::<&str>).unwrap(),
          &tauri::menu::MenuItem::with_id(app, "quit", "Quit TrackIt", true, None::<&str>).unwrap(),
        ],
      ).expect("Failed to build tray menu");

      let _tray = tauri::tray::TrayIconBuilder::new()
        .menu(tray_menu)
        .on_menu_event(|app, event| {
          match event.id.as_ref() {
            "toggle_dash" => {
              if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                  let _ = window.hide();
                } else {
                  let _ = window.show();
                  let _ = window.set_focus();
                }
              }
            }
            "toggle_timer" => {
              if let Some(window) = app.get_webview_window("timer-widget") {
                if window.is_visible().unwrap_or(false) {
                  let _ = window.hide();
                } else {
                  let _ = window.show();
                  let _ = window.set_always_on_top(true);
                  let _ = window.set_focus();
                }
              }
            }
            "quit" => {
              app.exit(0);
            }
            _ => {}
          }
        })
        .build(app)
        .expect("Failed to construct tray icon");

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      db_get_tasks,
      db_save_task,
      db_delete_task,
      db_get_activities,
      db_add_activity,
      db_get_setting,
      db_save_setting,
      open_timer_widget,
      close_timer_widget,
      start_timer_sync,
      stop_timer_sync,
      update_timer_elapsed,
      get_timer_sync_state
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
