// kill-yarn-dev.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
// To run - npx tsx scripts/kill-yarn-dev.ts
const execAsync = promisify(exec);

interface ProcessInfo {
    pid: number;
    command: string;
    port?: number;
}

/**
 * Kill yarn dev process running on a specific port
 * @param port - The port number to check (default: 3000)
 * @param signal - The signal to send (default: 'SIGTERM')
 */
async function killYarnDevOnPort(
    port: number = 3000,
    signal: NodeJS.Signals = 'SIGTERM'
): Promise<void> {
    try {
        console.log(`🔍 Looking for yarn dev processes on port ${port}...`);

        const processes = await findProcessesOnPort(port);
        const yarnDevProcesses = processes.filter(p =>
            p.command.includes('yarn') &&
            p.command.includes('dev') &&
            (p.command.includes('next') || p.command.includes('next-dev'))
        );

        if (yarnDevProcesses.length === 0) {
            console.log(`✅ No yarn dev processes found on port ${port}`);
            return;
        }

        console.log(`📋 Found ${yarnDevProcesses.length} yarn dev process(es) on port ${port}:`);
        yarnDevProcesses.forEach(p => {
            console.log(`   PID: ${p.pid} - Command: ${p.command}`);
        });

        // Kill each process
        for (const process of yarnDevProcesses) {
            await killProcess(process.pid, signal);
        }

        // Verify processes are killed
        await verifyProcessesKilled(yarnDevProcesses, port);

    } catch (error) {
        console.error('❌ Error killing yarn dev processes:', error);
        throw error;
    }
}

/**
 * Find processes running on a specific port
 */
async function findProcessesOnPort(port: number): Promise<ProcessInfo[]> {
    const os = platform();
    let command: string;
    let parseFn: (output: string) => ProcessInfo[];

    if (os === 'win32') {
        // Windows
        command = `netstat -ano | findstr :${port}`;
        parseFn = parseWindowsNetstat;
    } else {
        // Linux/Mac
        command = `lsof -i :${port} -t -c node || true`;
        parseFn = parseUnixLsof;
    }

    try {
        const { stdout } = await execAsync(command);
        const processes = parseFn(stdout);

        // For Unix, we need to get the full command for each PID
        if (os !== 'win32') {
            for (const proc of processes) {
                try {
                    const { stdout: cmdOutput } = await execAsync(`ps -p ${proc.pid} -o command=`);
                    proc.command = cmdOutput.trim();
                } catch {
                    proc.command = `node (PID: ${proc.pid})`;
                }
            }
        }

        return processes;
    } catch (error) {
        // No processes found or command failed
        return [];
    }
}

/**
 * Parse Windows netstat output
 */
function parseWindowsNetstat(output: string): ProcessInfo[] {
    const processes: ProcessInfo[] = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
            const pid = parseInt(parts[parts.length - 1]);
            if (!isNaN(pid)) {
                // Get the command for this PID on Windows
                processes.push({
                    pid,
                    command: `yarn dev (PID: ${pid})`
                });
            }
        }
    }

    return processes;
}

/**
 * Parse Unix lsof output
 */
function parseUnixLsof(output: string): ProcessInfo[] {
    const processes: ProcessInfo[] = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const pid of lines) {
        const numPid = parseInt(pid.trim());
        if (!isNaN(numPid)) {
            processes.push({
                pid: numPid,
                command: '' // Will be filled in later
            });
        }
    }

    return processes;
}

/**
 * Kill a process by PID
 */
async function killProcess(pid: number, signal: NodeJS.Signals): Promise<void> {
    const os = platform();
    let command: string;

    if (os === 'win32') {
        command = `taskkill /PID ${pid} /F`;
    } else {
        command = `kill -${signal} ${pid}`;
    }

    try {
        console.log(`🛑 Killing process ${pid} with signal ${signal}...`);
        await execAsync(command);
        console.log(`✅ Process ${pid} killed successfully`);
    } catch (error) {
        console.warn(`⚠️ Could not kill process ${pid}:`, error);
        throw error;
    }
}

/**
 * Verify that processes are actually killed
 */
async function verifyProcessesKilled(
    processes: ProcessInfo[],
    port: number,
    maxAttempts: number = 5
): Promise<void> {
    console.log(`🔍 Verifying processes are killed on port ${port}...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const remaining = await findProcessesOnPort(port);
        const remainingYarnDev = remaining.filter(p =>
            p.command.includes('yarn') &&
            p.command.includes('dev')
        );

        if (remainingYarnDev.length === 0) {
            console.log(`✅ All processes killed on port ${port}`);
            return;
        }

        if (attempt < maxAttempts) {
            console.log(`⏳ Waiting for processes to terminate (attempt ${attempt}/${maxAttempts})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.warn(`⚠️ Some processes may still be running on port ${port}`);
    const remaining = await findProcessesOnPort(port);
    console.log('Remaining processes:', remaining);
}

// CLI Interface
interface CliOptions {
    port: number;
    signal: NodeJS.Signals;
    help: boolean;
}

function parseArgs(): CliOptions {
    const args = process.argv.slice(2);
    const options: CliOptions = {
        port: 3000,
        signal: 'SIGTERM',
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '-p' || arg === '--port') {
            const port = parseInt(args[++i]);
            if (!isNaN(port)) options.port = port;
        } else if (arg === '-s' || arg === '--signal') {
            const signal = args[++i] as NodeJS.Signals;
            if (signal) options.signal = signal;
        } else if (arg === '-h' || arg === '--help') {
            options.help = true;
        }
    }

    return options;
}

function showHelp(): void {
    console.log(`
🛑 Kill Yarn Dev Process

Usage:
  npx ts-node kill-yarn-dev.ts [options]

Options:
  -p, --port <number>   Port number to kill (default: 3000)
  -s, --signal <signal> Signal to send (default: SIGTERM)
  -h, --help            Show this help message

Examples:
  # Kill yarn dev on port 3000 (default)
  npx ts-node kill-yarn-dev.ts

  # Kill yarn dev on port 3001
  npx ts-node kill-yarn-dev.ts -p 3001

  # Force kill with SIGKILL
  npx ts-node kill-yarn-dev.ts -s SIGKILL

  # Kill on port 3001 with SIGKILL
  npx ts-node kill-yarn-dev.ts -p 3001 -s SIGKILL
`);
}

// Main execution
if (require.main === module) {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        process.exit(0);
    }

    killYarnDevOnPort(options.port, options.signal)
        .then(() => {
            console.log(`✨ Successfully killed yarn dev on port ${options.port}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Failed to kill yarn dev:', error);
            process.exit(1);
        });
}

export { killYarnDevOnPort };