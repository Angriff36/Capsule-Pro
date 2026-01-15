import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const ports = args.length
  ? args.map((value) => Number.parseInt(value, 10)).filter((value) => value > 0)
  : [
      2221, 2222, 2223, 2224, 2225, 2226, 2227, 2228, 2229, 2230, 2231, 2232,
      2233, 2234, 2235, 6006,
    ];

if (ports.length === 0) {
  process.exit(0);
}

const joinPorts = ports.join(", ");

try {
  if (process.platform === "win32") {
    const command = `
$ports = @(${joinPorts})
$procs = @()
foreach ($p in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  if ($conns) { $procs += $conns.OwningProcess }
}
$procs = $procs | Sort-Object -Unique
if ($procs.Count -eq 0) {
  Write-Host "No listening processes on ports ${joinPorts}."
} else {
  Write-Host "Stopping processes: $($procs -join ', ')"
  Stop-Process -Id $procs -Force
}
`;
    execSync(`powershell.exe -NoProfile -Command "${command}"`, {
      stdio: "inherit",
    });
  } else {
    for (const port of ports) {
      try {
        const pids = execSync(`lsof -ti :${port}`, {
          stdio: ["ignore", "pipe", "ignore"],
        })
          .toString()
          .trim()
          .split("\n")
          .filter(Boolean);
        if (pids.length > 0) {
          execSync(`kill -9 ${pids.join(" ")}`, { stdio: "inherit" });
        }
      } catch {
        // No process bound to this port or lsof missing.
      }
    }
  }
} catch (error) {
  console.error("Failed to free dev ports:", error);
}
