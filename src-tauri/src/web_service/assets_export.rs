use std::fs;
use std::path::{Component, Path, PathBuf};

use tauri::{AppHandle, Manager};

const VERSION_MARKER_FILE: &str = ".ccgui-web-assets-version";

/// Materialize the frontend for the daemon web service.
///
/// The bundle no longer ships a second copy of `dist` (the frontend is already
/// embedded in the main binary). Instead the embedded assets are exported once
/// per app version to `<app-data>/web-assets/current`, and the daemon is
/// pointed at it via the `MOSSX_WEB_ASSETS_DIR` env var.
///
/// `index.html` is NOT taken from the embedded assets: tauri injects the app
/// CSP into embedded HTML at compile time, and that CSP (connect-src limited
/// to 127.0.0.1) would break browser/LAN access to the web service. The
/// pristine vite `index.html` is bundled as the `web/index.html` resource and
/// copied from there instead.
pub(crate) fn ensure_web_assets_export(app: &AppHandle) -> Result<PathBuf, String> {
    let export_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?
        .join("web-assets")
        .join("current");
    let version = app.package_info().version.to_string();

    if export_is_current(&export_dir, &version) {
        return Ok(export_dir);
    }

    let pristine_index = app
        .path()
        .resource_dir()
        .map_err(|error| format!("failed to resolve resource dir: {error}"))?
        .join("web")
        .join("index.html");

    let resolver = app.asset_resolver();
    let assets = resolver.iter().filter_map(|(key, _)| {
        let key = key.to_string();
        let bytes = resolver.get(key.clone())?.bytes;
        Some((key, bytes))
    });

    export_assets(&export_dir, &version, assets, &pristine_index)?;
    Ok(export_dir)
}

fn export_is_current(export_dir: &Path, version: &str) -> bool {
    fs::read_to_string(export_dir.join(VERSION_MARKER_FILE))
        .is_ok_and(|marker| marker.trim() == version)
}

/// Rebuild the export directory from scratch.
///
/// The export path is version-independent (`web-assets/current`) so a daemon
/// that outlives an app update keeps serving from a valid path once the new
/// app re-exports. The version marker is written last: a partial export never
/// carries the marker and is rebuilt on the next run.
/// ponytail: the wipe+rewrite gives an already-running daemon a brief 404
/// window during re-export, same as the old in-place bundle replacement.
fn export_assets(
    export_dir: &Path,
    version: &str,
    assets: impl Iterator<Item = (String, Vec<u8>)>,
    pristine_index: &Path,
) -> Result<(), String> {
    let _ = fs::remove_dir_all(export_dir);
    fs::create_dir_all(export_dir)
        .map_err(|error| format!("failed to create {}: {error}", export_dir.display()))?;

    for (key, bytes) in assets {
        let Some(relative) = sanitize_asset_key(&key) else {
            continue;
        };
        if relative
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("html"))
        {
            // Embedded HTML carries the compile-time injected CSP; the
            // pristine copy below replaces it.
            continue;
        }
        let target = export_dir.join(&relative);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("failed to create {}: {error}", parent.display()))?;
        }
        fs::write(&target, bytes)
            .map_err(|error| format!("failed to write {}: {error}", target.display()))?;
    }

    fs::copy(pristine_index, export_dir.join("index.html")).map_err(|error| {
        format!(
            "failed to copy pristine index.html from {}: {error}",
            pristine_index.display()
        )
    })?;

    fs::write(export_dir.join(VERSION_MARKER_FILE), version)
        .map_err(|error| format!("failed to write version marker: {error}"))?;
    Ok(())
}

/// Embedded asset keys are build-controlled; reject anything that is not a
/// plain relative path instead of trying to resolve it.
fn sanitize_asset_key(key: &str) -> Option<PathBuf> {
    let mut relative = PathBuf::new();
    for component in Path::new(key.trim_start_matches('/')).components() {
        match component {
            Component::Normal(part) => relative.push(part),
            Component::CurDir => {}
            _ => return None,
        }
    }
    if relative.as_os_str().is_empty() {
        None
    } else {
        Some(relative)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unique_test_dir(prefix: &str) -> PathBuf {
        std::env::temp_dir().join(format!("{prefix}-{}", uuid::Uuid::new_v4().as_simple()))
    }

    #[test]
    fn export_writes_assets_pristine_index_and_marker() {
        let root = unique_test_dir("web-assets-export");
        let export_dir = root.join("current");
        let pristine_index = root.join("pristine-index.html");
        std::fs::create_dir_all(&root).expect("create test root");
        std::fs::write(&pristine_index, "<html>pristine</html>").expect("write pristine index");

        let assets = vec![
            ("/index.html".to_string(), b"<html>csp-injected</html>".to_vec()),
            ("/assets/App-abc.js".to_string(), b"js".to_vec()),
            ("/vite.svg".to_string(), b"svg".to_vec()),
            ("/../escape.txt".to_string(), b"nope".to_vec()),
        ];

        export_assets(&export_dir, "1.2.3", assets.into_iter(), &pristine_index)
            .expect("export succeeds");

        assert_eq!(
            std::fs::read_to_string(export_dir.join("index.html")).expect("read index"),
            "<html>pristine</html>",
            "index.html must come from the pristine copy, not the embedded one"
        );
        assert_eq!(
            std::fs::read(export_dir.join("assets/App-abc.js")).expect("read js"),
            b"js"
        );
        assert_eq!(
            std::fs::read(export_dir.join("vite.svg")).expect("read svg"),
            b"svg"
        );
        assert!(!root.join("escape.txt").exists(), "path escape must be rejected");
        assert!(export_is_current(&export_dir, "1.2.3"));
        assert!(!export_is_current(&export_dir, "1.2.4"));

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn export_rebuilds_and_drops_stale_files() {
        let root = unique_test_dir("web-assets-rebuild");
        let export_dir = root.join("current");
        let pristine_index = root.join("pristine-index.html");
        std::fs::create_dir_all(export_dir.join("assets")).expect("create stale dir");
        std::fs::write(export_dir.join("assets/old-hash.js"), "stale").expect("write stale");
        std::fs::write(&pristine_index, "<html>v2</html>").expect("write pristine index");

        let assets = vec![("/assets/new-hash.js".to_string(), b"fresh".to_vec())];
        export_assets(&export_dir, "2.0.0", assets.into_iter(), &pristine_index)
            .expect("export succeeds");

        assert!(!export_dir.join("assets/old-hash.js").exists());
        assert!(export_dir.join("assets/new-hash.js").exists());

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn sanitize_asset_key_rejects_traversal_and_absolute() {
        assert_eq!(
            sanitize_asset_key("/assets/App.js"),
            Some(PathBuf::from("assets/App.js"))
        );
        assert_eq!(sanitize_asset_key("/../x"), None);
        assert_eq!(sanitize_asset_key("/a/../../x"), None);
        assert_eq!(sanitize_asset_key(""), None);
    }
}
