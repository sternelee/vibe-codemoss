import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const strict = process.argv.includes("--strict");

// Common installation paths for CMake on Windows
const CMAKE_WINDOWS_PATHS = [
  "C:\\Program Files\\CMake\\bin\\cmake.exe",
  "C:\\Program Files (x86)\\CMake\\bin\\cmake.exe",
];

function hasCommand(command) {
  if (process.platform !== "win32") {
    return hasExecutableOnPath(command);
  }

  const result = spawnSync("where", [command], { stdio: "ignore" });
  if (result.status === 0) return true;

  // On Windows, also check common installation paths
  if (process.platform === "win32" && command === "cmake") {
    for (const cmakePath of CMAKE_WINDOWS_PATHS) {
      if (existsSync(cmakePath)) {
        return true;
      }
    }
  }
  return false;
}

export function hasExecutableOnPath(command, searchPath = process.env.PATH ?? "") {
  for (const directory of searchPath.split(path.delimiter)) {
    if (!directory) {
      continue;
    }
    const candidate = path.join(directory, command);
    try {
      accessSync(candidate, constants.X_OK);
      return true;
    } catch {
      // Keep scanning PATH entries.
    }
  }
  return false;
}

export function runDoctor({ strictMode = strict } = {}) {
  const missing = [];
  if (!hasCommand("cmake")) missing.push("cmake");

  if (missing.length === 0) {
    console.log("Doctor: OK");
    return 0;
  }

  console.log(`Doctor: missing dependencies: ${missing.join(" ")}`);

  switch (process.platform) {
    case "darwin":
      console.log("Install: brew install cmake");
      break;
    case "linux":
      console.log("Ubuntu/Debian: sudo apt-get install cmake");
      console.log("Fedora: sudo dnf install cmake");
      console.log("Arch: sudo pacman -S cmake");
      break;
    case "win32":
      console.log("Install: choco install cmake");
      console.log("Or download from: https://cmake.org/download/");
      break;
    default:
      console.log("Install CMake from: https://cmake.org/download/");
      break;
  }

  return strictMode ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(runDoctor());
}
