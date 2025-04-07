import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

if (!isMainThread) {
  const { command } = workerData;

  async function processCommand() {
    try {
      const process = exec(command);

      process.stdout.on('data', (data) => {
        parentPort.postMessage({ type: 'data', data });
      });

      process.stderr.on('data', (data) => {
        parentPort.postMessage({ type: 'error', data });
      });

      process.on('close', (code) => {
        parentPort.postMessage({ type: 'done', code });
      });
    } catch (error) {
      parentPort.postMessage({ type: 'error', error: error.message });
    }
  }

  processCommand();
}
