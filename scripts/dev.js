import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('⚡ Starting PacedLearner Server (FSRS Core) & Client Dashboard...\n');

const serverProc = spawn('npm', ['--prefix', 'server', 'run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

const clientProc = spawn('npm', ['--prefix', 'client', 'run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

const shutdown = () => {
  console.log('\n🛑 Shutting down PacedLearner services...');
  serverProc.kill();
  clientProc.kill();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
