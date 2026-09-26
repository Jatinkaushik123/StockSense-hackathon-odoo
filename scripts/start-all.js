/**
 * scripts/start-all.js
 * ------------------------------------------------------------------
 * Concurrently starts:
 *   1. Backend server (PostgreSQL embedded + Next.js on port 3000)
 *   2. Frontend Vite dev server (on port 5173, with proxy to :3000)
 *
 * Forwards output with color tags and handles graceful shutdown.
 */
const { spawn, execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const nodeCmd = process.execPath;

console.log('\n======================================================');
console.log('   StockSense IMS — Starting Monolith + Frontend UI');
console.log('======================================================\n');

function freePort(port) {
  if (isWindows) {
    try {
      const out = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = out.trim().split(/\r?\n/);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].endsWith(`:${port}`)) {
          const pid = parseInt(parts[parts.length - 1], 10);
          if (pid && pid !== process.pid) {
            console.log(`[start-all] Freeing port ${port} (PID ${pid})...`);
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            } catch {}
          }
        }
      }
    } catch {}
  }
}

// Clean stale ports before spawning
freePort(3000);
freePort(5173);
freePort(5174);

// 1. Start Backend Server
const backend = spawn(process.execPath, ['server.js'], {
  cwd: ROOT,
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, PORT: '3000' },
});

// 2. Start Frontend Vite Dev Server
const frontend = isWindows
  ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm --prefix Frontend run dev'], {
      cwd: ROOT,
      stdio: 'inherit',
      windowsVerbatimArguments: true,
      env: { ...process.env },
    })
  : spawn('npm', ['--prefix', 'Frontend', 'run', 'dev'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env },
    });

const cleanup = () => {
  console.log('\n[StockSense] Gracefully shutting down servers...');
  try {
    if (backend && !backend.killed) backend.kill('SIGTERM');
  } catch {}
  try {
    if (frontend && !frontend.killed) frontend.kill('SIGTERM');
  } catch {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

backend.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[backend] exited with code ${code}`);
    cleanup();
  }
});

frontend.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[frontend] exited with code ${code}`);
    cleanup();
  }
});
