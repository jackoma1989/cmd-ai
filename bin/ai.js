#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { exec, execFile, spawn } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOME_DIR = os.homedir();
const XDG_CONFIG_HOME =
  process.env.XDG_CONFIG_HOME || path.join(HOME_DIR, '.config');
const XDG_STATE_HOME =
  process.env.XDG_STATE_HOME || path.join(HOME_DIR, '.local', 'state');
const XDG_DATA_HOME =
  process.env.XDG_DATA_HOME || path.join(HOME_DIR, '.local', 'share');

const APP_CONFIG_DIR = path.join(XDG_CONFIG_HOME, 'cmd-ai');
const APP_STATE_DIR = path.join(XDG_STATE_HOME, 'cmd-ai');
const APP_DATA_DIR = path.join(XDG_DATA_HOME, 'cmd-ai');

const CONFIG_PATH = path.join(APP_CONFIG_DIR, 'config.json');
const HISTORY_PATH = path.join(APP_STATE_DIR, 'history.json');
const AUTOCOMPLETE_PATH = path.join(APP_DATA_DIR, 'cmd-ai-completion.sh');

const LEGACY_CONFIG_PATH = path.join(HOME_DIR, '.ai-config.json');
const LEGACY_HISTORY_PATH = path.join(HOME_DIR, '.ai-command-history.json');
const LEGACY_AUTOCOMPLETE_PATH = path.join(HOME_DIR, '.cmd-ai-completion.sh');

const PROVIDERS = ['custom', 'minimax', 'antigravity', 'ollama', 'openai', 'gemini', 'claude'];

const MINIMAX_MODELS = ['MiniMax-M3.1-Flash-Preview'];

const ANTIGRAVITY_MODELS = [
  'gemini-3.8-flash',
  'gemini-4-argon',
  'claude-sonnet-5-5',
  'claude-opus-5-5',
];

const OPENAI_MODELS = [
  'gpt-5.3-codex',
  'gpt-5.3-codex-spark',
  'gpt-5.2-codex',
  'gpt-5.1-codex',
  'gpt-5.1-codex-max',
];

const GEMINI_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

const CLAUDE_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
];

const DEFAULT_CONFIG = {
  provider: 'minimax',
  minimaxUrl: 'https://api.minimaxi.com/v1/chat/completions',
  minimaxModel: MINIMAX_MODELS[0],
  minimaxReasoningEffort: 'low',
  antigravityUrl: 'https://your-openai-proxy.example.com/v1/chat/completions',
  antigravityModel: ANTIGRAVITY_MODELS[0],
  antigravityReasoningEffort: 'low',
  customUrl: 'https://api.openai.com/v1/chat/completions',
  customModel: 'gpt-4o-mini',
  customReasoningEffort: 'low',
  openaiModel: OPENAI_MODELS[0],
  openaiReasoningEffort: 'medium',
  geminiModel: GEMINI_MODELS[0],
  geminiReasoningEffort: 'medium',
  claudeModel: CLAUDE_MODELS[1],
  claudeReasoningEffort: 'medium',
};

const COMMAND_PROMPT_LIMIT = 220;
const VERSION_PROMPT_LIMIT = 24;
const VERSION_PROBE_TIMEOUT_MS = 1200;
const PROSE_LINE_STARTERS = new Set([
  'to',
  'for',
  'then',
  'next',
  'first',
  'second',
  'third',
  'finally',
  'option',
  'alternatively',
  'replace',
  'note',
  'you',
  'please',
  'run',
  'execute',
  'check',
  'try',
  'attempt',
]);
const SHELL_BUILTINS = new Set([
  '.',
  ':',
  '[',
  'alias',
  'cd',
  'echo',
  'eval',
  'exec',
  'export',
  'false',
  'printf',
  'pwd',
  'set',
  'source',
  'test',
  'true',
  'type',
  'unalias',
  'unset',
]);
const VERSION_PROBE_CANDIDATES = [
  'bash',
  'zsh',
  'sh',
  'fish',
  'nu',
  'node',
  'npm',
  'npx',
  'pnpm',
  'yarn',
  'bun',
  'deno',
  'corepack',
  'nx',
  'turbo',
  'vite',
  'webpack',
  'rollup',
  'parcel',
  'eslint',
  'prettier',
  'jest',
  'vitest',
  'cypress',
  'playwright',
  'react-native',
  'expo',
  'eas',
  'ng',
  'ionic',
  'svelte-kit',
  'next',
  'nuxt',
  'python',
  'python3',
  'pip',
  'pip3',
  'pipx',
  'poetry',
  'pipenv',
  'conda',
  'uv',
  'pytest',
  'ruff',
  'mypy',
  'jupyter',
  'git',
  'gh',
  'git-lfs',
  'curl',
  'wget',
  'jq',
  'yq',
  'grep',
  'sed',
  'awk',
  'rg',
  'fd',
  'fzf',
  'xargs',
  'parallel',
  'docker',
  'docker-compose',
  'podman',
  'nerdctl',
  'buildah',
  'skopeo',
  'kubectl',
  'helm',
  'kustomize',
  'minikube',
  'kind',
  'k3d',
  'k9s',
  'stern',
  'flux',
  'argocd',
  'terraform',
  'terragrunt',
  'packer',
  'vagrant',
  'ansible',
  'ansible-playbook',
  'vault',
  'consul',
  'nomad',
  'aws',
  'aws-vault',
  'sam',
  'az',
  'gcloud',
  'gsutil',
  'bq',
  'doctl',
  'flyctl',
  'heroku',
  'vercel',
  'netlify',
  'cloudflared',
  'rabbitmqctl',
  'kcat',
  'helmfile',
  'tar',
  'zip',
  'unzip',
  '7z',
  'gzip',
  'gunzip',
  'bzip2',
  'xz',
  'openssl',
  'gpg',
  'make',
  'cmake',
  'ninja',
  'meson',
  'bazel',
  'bazelisk',
  'buck',
  'go',
  'gofmt',
  'golangci-lint',
  'dlv',
  'rustc',
  'cargo',
  'rustup',
  'clippy-driver',
  'java',
  'javac',
  'mvn',
  'gradle',
  'kotlin',
  'dotnet',
  'msbuild',
  'nuget',
  'php',
  'composer',
  'phpunit',
  'artisan',
  'ruby',
  'bundle',
  'gem',
  'rake',
  'rails',
  'rspec',
  'perl',
  'gcc',
  'g++',
  'clang',
  'clang++',
  'gdb',
  'lldb',
  'swift',
  'xcodebuild',
  'xcrun',
  'pod',
  'carthage',
  'swiftlint',
  'fastlane',
  'flutter',
  'dart',
  'adb',
  'fastboot',
  'emulator',
  'sdkmanager',
  'avdmanager',
  'ffmpeg',
  'ffprobe',
  'imagemagick',
  'convert',
  'psql',
  'mysql',
  'mariadb',
  'mongo',
  'mongosh',
  'redis-cli',
  'sqlite3',
  'influx',
  'clickhouse-client',
  'duckdb',
  'liquibase',
  'flyway',
];
const VERSION_ARGS_BY_COMMAND = {
  adb: ['version'],
  argocd: ['version', '--client'],
  avdmanager: ['--version'],
  az: ['version'],
  bazel: ['version'],
  bq: ['version'],
  dart: ['--version'],
  dotnet: ['--version'],
  ffmpeg: ['-version'],
  ffprobe: ['-version'],
  flux: ['version'],
  flyctl: ['version'],
  gcloud: ['version'],
  gsutil: ['version', '-l'],
  helmfile: ['version'],
  java: ['--version'],
  javac: ['--version'],
  k3d: ['version'],
  k9s: ['version'],
  kind: ['version'],
  kubectl: ['version', '--client=true'],
  kustomize: ['version'],
  minikube: ['version'],
  mongosh: ['--version'],
  mvn: ['-version'],
  packer: ['version'],
  podman: ['version'],
  sdkmanager: ['--version'],
  stern: ['--version'],
  swift: ['--version'],
  terragrunt: ['--version'],
  terraform: ['version'],
  psql: ['--version'],
  python: ['--version'],
  python3: ['--version'],
  ruby: ['--version'],
  sh: ['--version'],
  xcodebuild: ['-version'],
};
const PACKAGE_MANAGER_CANDIDATES = {
  linux: [
    {
      command: 'apt-get',
      installTemplate: 'sudo apt-get update && sudo apt-get install -y <package>',
    },
    {
      command: 'apt',
      installTemplate: 'sudo apt update && sudo apt install -y <package>',
    },
    {
      command: 'dnf',
      installTemplate: 'sudo dnf install -y <package>',
    },
    {
      command: 'yum',
      installTemplate: 'sudo yum install -y <package>',
    },
    {
      command: 'pacman',
      installTemplate: 'sudo pacman -S --noconfirm <package>',
    },
    {
      command: 'zypper',
      installTemplate: 'sudo zypper install -y <package>',
    },
    {
      command: 'apk',
      installTemplate: 'sudo apk add <package>',
    },
    {
      command: 'nix-env',
      installTemplate: 'nix-env -iA nixpkgs.<package>',
    },
  ],
  darwin: [
    {
      command: 'brew',
      installTemplate: 'brew install <package>',
    },
    {
      command: 'port',
      installTemplate: 'sudo port install <package>',
    },
  ],
  win32: [
    {
      command: 'winget',
      installTemplate: 'winget install --id <package-id>',
    },
    {
      command: 'choco',
      installTemplate: 'choco install -y <package>',
    },
    {
      command: 'scoop',
      installTemplate: 'scoop install <package>',
    },
  ],
  fallback: [],
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question, singleKey = false) {
  if (singleKey && process.stdin.isTTY) {
    return new Promise(resolve => {
      process.stdout.write(question);
      const wasRaw = process.stdin.isRaw;
      process.stdin.setRawMode(true);
      process.stdin.resume();

      const onData = buf => {
        const str = buf.toString('utf8');
        process.stdin.removeListener('data', onData);
        process.stdin.setRawMode(Boolean(wasRaw));

        if (str === '\u0003') {
          process.stdout.write('\nOperation cancelled.\n');
          if (!rl.closed) rl.close();
          process.exit(1);
        }

        if (str === '\r' || str === '\n' || str === ' ' || str.toLowerCase() === 'y') {
          process.stdout.write('\n');
          resolve('y');
          return;
        }

        process.stdout.write(`${str === '\u001b' ? 'Esc' : str}\n`);
        resolve('n');
      };

      process.stdin.on('data', onData);
    });
  }

  if (rl.closed) {
    return Promise.resolve('');
  }

  return new Promise(resolve => rl.question(question, resolve));
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function resolvePreferredPath(primaryPath, legacyPath) {
  if (fs.existsSync(primaryPath)) return primaryPath;
  if (legacyPath && fs.existsSync(legacyPath)) return legacyPath;
  return primaryPath;
}

function startGenerationLoading() {
  if (!process.stdout.isTTY) {
    return {
      stop() {},
    };
  }

  const frames = ['-', '\\', '|', '/'];
  let frameIndex = 0;
  let stopped = false;

  const render = () => {
    const frame = frames[frameIndex];
    frameIndex = (frameIndex + 1) % frames.length;

    if (
      typeof process.stdout.clearLine === 'function' &&
      typeof process.stdout.cursorTo === 'function'
    ) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`Thinking ${frame}`);
      return;
    }

    process.stdout.write(`\rThinking ${frame}`);
  };

  render();
  const intervalId = setInterval(render, 120);

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(intervalId);

      if (
        typeof process.stdout.clearLine === 'function' &&
        typeof process.stdout.cursorTo === 'function'
      ) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        return;
      }

      process.stdout.write('\r');
    },
  };
}

const CURRENT_SESSION_ID = String(process.ppid || 'default');
const MAX_CONTEXT_ENTRIES = 10;
const MAX_OUTPUT_CHARS_PER_ENTRY = 1500;

function saveHistory(entry) {
  let history = [];
  const historyReadPath = resolvePreferredPath(HISTORY_PATH, LEGACY_HISTORY_PATH);

  if (fs.existsSync(historyReadPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyReadPath, 'utf-8')).slice(-1000);
    } catch (e) {
      console.error('Error reading history file, starting fresh:', e.message);
      history = [];
    }
  }

  history.push({
    ...entry,
    sessionId: entry.sessionId || CURRENT_SESSION_ID,
    timestamp: new Date().toISOString(),
  });

  try {
    ensureParentDirectory(HISTORY_PATH);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error('Error writing history file:', e.message);
  }
}

function clearCurrentSessionHistory() {
  const historyReadPath = resolvePreferredPath(HISTORY_PATH, LEGACY_HISTORY_PATH);
  if (!fs.existsSync(historyReadPath)) return;

  try {
    const history = JSON.parse(fs.readFileSync(historyReadPath, 'utf-8'));
    if (!Array.isArray(history)) return;
    const filtered = history.filter(item => item.sessionId !== CURRENT_SESSION_ID);
    ensureParentDirectory(HISTORY_PATH);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(filtered, null, 2));
  } catch (e) {
    console.error('Error clearing session history:', e.message);
  }
}

function buildRecentConversationContext(historyReadPath) {
  if (!fs.existsSync(historyReadPath)) return '';

  try {
    const history = JSON.parse(fs.readFileSync(historyReadPath, 'utf-8'));
    if (!Array.isArray(history) || history.length === 0) return '';

    const sessionEntries = history
      .filter(
        item =>
          item &&
          item.sessionId === CURRENT_SESSION_ID &&
          item.prompt &&
          item.command &&
          item.command !== 'Error generating command'
      )
      .slice(-MAX_CONTEXT_ENTRIES);

    if (sessionEntries.length === 0) return '';

    const lines = [
      `Recent conversation & terminal output in this shell window (last ${sessionEntries.length} turn(s), chronological):`,
    ];

    sessionEntries.forEach((item, idx) => {
      lines.push(
        `[Turn ${idx + 1}] User: ${item.prompt}`,
        `[Turn ${idx + 1}] Command (${item.executed ? 'executed' : 'not executed'}): ${item.command}`
      );
      if (item.output && item.output.trim()) {
        lines.push(`[Turn ${idx + 1}] Terminal Output:\n${item.output.trim()}`);
      }
    });

    lines.push(
      'Use the conversation and terminal output above as context when the user refers to previous results, PIDs, files, errors, or follow-up actions.'
    );

    return lines.join('\n');
  } catch {
    return '';
  }
}

function removeLastHistoryEntryByNoteToken(token) {
  const historyReadPath = resolvePreferredPath(HISTORY_PATH, LEGACY_HISTORY_PATH);
  if (!token || !fs.existsSync(historyReadPath)) return;

  try {
    const history = JSON.parse(fs.readFileSync(historyReadPath, 'utf-8'));
    if (!Array.isArray(history) || history.length === 0) return;

    const lastEntry = history[history.length - 1];
    if (
      lastEntry &&
      typeof lastEntry.notes === 'string' &&
      lastEntry.notes.includes(token)
    ) {
      history.pop();
      ensureParentDirectory(HISTORY_PATH);
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
    }
  } catch (e) {
    console.error('Error rolling back history entry:', e.message);
  }
}

function supportsExecveHandoff() {
  return process.platform !== 'win32' && typeof process.execve === 'function';
}

function resolveExecutionShell() {
  const preferredShell = (process.env.SHELL || '').trim();
  if (
    preferredShell &&
    path.isAbsolute(preferredShell) &&
    fs.existsSync(preferredShell)
  ) {
    return preferredShell;
  }

  return '/bin/sh';
}

function isShellStateCommand(command) {
  const trimmed = (command || '').trim();
  if (!trimmed) return false;

  const segments = trimmed
    .split(/(?:&&|\|\||;|\r?\n)+/)
    .map(s => s.trim())
    .filter(Boolean);

  return segments.some(seg =>
    /^(?:cd(?:[.\\/\s]|$)|chdir\b|set-location\b|sl\b|push-location\b|pushd\b|pop-location\b|popd\b|cls\b|clear\b|clear-host\b|\$env:[a-z0-9_]+\s*=|set\s+[a-z0-9_]+\s*=|set-item\s+env:|remove-item\s+env:|conda\s+(?:activate|deactivate)\b|[a-z]:$|.*activate\.ps1\b)/i.test(
      seg
    )
  );
}

function isDangerous(command) {
  const normalized = command
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\\+$/, '')
    .replace(/\n/g, ';');

  const subcommands = normalized
    .split(/;|&&|\|\||\(|\)|\{|\}/)
    .map(s => s.trim())
    .filter(Boolean);

  const blackListPatterns = [
    'rm -rf /',
    'rm -rf ~',
    'rm -rf .*',
    'rm -rf *',
    'rm --no-preserve-root',
    'rm -r --no-preserve-root /',
    'mkfs',
    'mkfs.ext4',
    'mkfs.xfs',
    'mkfs.vfat',
    'dd if=',
    'dd of=/dev/',
    ':(){:|:&};:',
    '>:()',
    'shutdown',
    'reboot',
    'halt',
    'poweroff',
    'init 0',
    'init 6',
    'kill -9 1',
    'mv /',
    'chmod 000',
    'chmod -r 000 /',
    'chown root',
    'yes > /dev/',
    '>/dev/',
    'mount -o bind / /dev/null',
    'crontab -r',
    'echo .* >',
    'cat /dev/urandom >',
    'find / -exec rm',
    'find / -delete',
    'wipefs',
    'shred',
    'nohup .* >/dev/null 2>&1 &',
    'curl .* | sh',
    'wget .* | sh',
    'base64 -d <<< .* | sh',
  ];

  if (
    /\s*\|\s*(sh|bash|zsh|csh|ksh|python|perl|ruby)\s*(-c|\s|$)/.test(
      normalized
    )
  ) {
    console.warn(
      'Potential dangerous pattern: Piping output to a shell or interpreter.'
    );
    return true;
  }

  return subcommands.some(sub =>
    blackListPatterns.some(pattern => sub.startsWith(pattern))
  );
}

function printHelp() {
  console.log(`
Usage: ai [prompt or command] [--flags]

Examples:
  ai list files in current directory
  ai remove all docker containers
  ai list files in current directory and save to file.txt
  ai config                    Configure provider, model, API keys, and reasoning effort
  ai history                   Show history of AI-generated commands
  ai man / --help / -h         Show this help message
  ai install-autocomplete      Install autocomplete to your shell config

Flags:
  --explain     Ask AI to explain the command before returning it
  --dry         Show the command but do not execute it
  --version     Show the package version

Providers:
  minimax     Uses MiniMax API (e.g. MiniMax-M3.1-Flash-Preview).
  antigravity Uses Antigravity proxy (e.g. gemini-3.8-flash).
  ollama      Uses local Ollama models (requires ollama installed).
  openai      Uses OpenAI Codex models (requires API key).
  gemini      Uses Google Gemini API models (requires API key).
  claude      Uses Anthropic Claude API models (requires API key).

Autocomplete:
  Run the following to enable autocomplete:
    ai install-autocomplete
`);
}

function installAutocompleteScript() {
  const sourcePath = path.join(__dirname, '..', 'cmd-ai-completion.sh');
  const targetPath = AUTOCOMPLETE_PATH;

  if (!fs.existsSync(sourcePath)) {
    console.error(`Autocomplete script not found at: ${sourcePath}\n`);
    console.error(
      "Could not locate the bundled completion script. Reinstall cmd-ai and try again.\n"
    );
    process.exit(1);
  }

  try {
    ensureParentDirectory(targetPath);
    fs.copyFileSync(sourcePath, targetPath);
    fs.chmodSync(targetPath, 0o644);
    console.log(`✅ Autocomplete script copied to: ${targetPath}`);
  } catch (e) {
    console.error(`Error copying autocomplete script: ${e.message}\n`);
    process.exit(1);
  }

  const shell = process.env.SHELL || '';
  let rcFile = null;
  if (shell.includes('zsh')) {
    rcFile = path.join(HOME_DIR, '.zshrc');
  } else if (shell.includes('bash')) {
    rcFile = path.join(HOME_DIR, '.bashrc');
  } else if (shell.includes('ksh')) {
    rcFile = path.join(HOME_DIR, '.kshrc');
  }

  const sourceCmd = `source ${targetPath}`;
  const legacySourceCmd = `source ${LEGACY_AUTOCOMPLETE_PATH}`;

  if (!rcFile) {
    console.log('\n🚨 Could not detect shell config file automatically.');
    console.log(
      'Please manually add this line to your shell config (.bashrc, .zshrc, etc.):'
    );
    console.log(`   ${sourceCmd}\n`);
    return;
  }

  try {
    let rcContent = fs.existsSync(rcFile)
      ? fs.readFileSync(rcFile, 'utf-8')
      : '';

    if (rcContent.includes(legacySourceCmd) && !rcContent.includes(sourceCmd)) {
      rcContent = rcContent.replaceAll(legacySourceCmd, sourceCmd);
      fs.writeFileSync(rcFile, rcContent);
      console.log(`✅ Updated ${rcFile} to migrate autocomplete source path.`);
    }

    if (!rcContent.includes(sourceCmd)) {
      const lines = rcContent.split('\n');
      const alreadySourced = lines.some(line =>
        line.trim().replace(/^#\s*/, '').includes(sourceCmd)
      );

      if (!alreadySourced) {
        fs.appendFileSync(rcFile, `\n# cmd-ai autocomplete\n${sourceCmd}\n`);
        console.log(`✅ Updated ${rcFile} to include autocomplete.`);
      } else {
        console.log(
          `ℹ️ ${rcFile} already includes the autocomplete script (or a commented version).`
        );
      }
    } else {
      console.log(`ℹ️ ${rcFile} already includes the autocomplete script.`);
    }

    console.log('\nℹ️ Please restart your terminal or run:');
    console.log(`   source ${rcFile}\n`);
  } catch (e) {
    console.error(`Error updating shell config file ${rcFile}: ${e.message}\n`);
    console.log('\n🚨 Could not update shell config file automatically.');
    console.log(
      `Please manually add this line to your shell config (${rcFile} or similar):`
    );
    console.log(`   ${sourceCmd}\n`);
  }
}

function unwrapOuterCommandWrapper(command) {
  let cleaned = command.trim();
  const wrapperPairs = {
    "'": "'",
    '"': '"',
    '`': '`',
  };

  // Some models wrap commands in one or more quote/backtick pairs.
  for (let i = 0; i < 3; i++) {
    if (cleaned.length < 2) break;

    const firstChar = cleaned[0];
    const lastChar = cleaned[cleaned.length - 1];
    if (wrapperPairs[firstChar] !== lastChar) {
      break;
    }

    const inner = cleaned.slice(1, -1).trim();
    if (!inner) break;
    cleaned = inner;
  }

  return cleaned;
}

function stripCommandLineDecorators(line) {
  let cleaned = line.trim();
  cleaned = cleaned.replace(/^>\s*/, '');
  cleaned = cleaned.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '');
  cleaned = cleaned.replace(/^\$\s+/, '').replace(/^#\s+/, '');
  cleaned = unwrapOuterCommandWrapper(cleaned);
  return cleaned.trim();
}

function getLeadingCommandToken(line) {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  let i = 0;

  if (tokens[i] === 'env') {
    i += 1;
  }

  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(tokens[i])) {
    i += 1;
  }

  if (tokens[i] === 'sudo') {
    i += 1;
    while (i < tokens.length && /^-/.test(tokens[i])) {
      const option = tokens[i];
      i += 1;
      if ((option === '-u' || option === '--user') && i < tokens.length) {
        i += 1;
      }
    }
  }

  if (i >= tokens.length) return null;

  return tokens[i].replace(/[;|&]+$/, '');
}

function isLikelyExecutableLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('```')) return false;
  if (/^\(.*\)$/.test(trimmed)) return false;
  if (/^[#]{2,}\s+/.test(trimmed)) return false;
  if (/^\d+[.)]\s+\S.*:\s*$/.test(trimmed)) return false;
  if (
    trimmed.endsWith(':') &&
    !/[;&|]/.test(trimmed) &&
    !/^[./~]/.test(trimmed)
  ) {
    return false;
  }

  const normalized = stripCommandLineDecorators(trimmed);
  if (!normalized) return false;

  const loweredLine = normalized.toLowerCase();
  if (
    loweredLine.startsWith('or ') ||
    loweredLine.startsWith('or, ') ||
    loweredLine.startsWith('alternatively')
  ) {
    return false;
  }

  const token = getLeadingCommandToken(normalized);
  if (!token) return false;

  const loweredToken = token.toLowerCase();
  if (PROSE_LINE_STARTERS.has(loweredToken)) return false;

  if (
    token.startsWith('/') ||
    token.startsWith('./') ||
    token.startsWith('../') ||
    token.startsWith('~/')
  ) {
    return true;
  }

  if (SHELL_BUILTINS.has(loweredToken)) return true;

  return /^[A-Za-z0-9_./:+@~-]+$/.test(token);
}

function extractInlineCodeCommands(line) {
  const commands = [];
  const inlineCodeRegex = /`([^`]+)`/g;
  let match;

  while ((match = inlineCodeRegex.exec(line)) !== null) {
    const candidate = stripCommandLineDecorators(match[1]);
    if (candidate && isLikelyExecutableLine(candidate)) {
      commands.push(candidate);
    }
  }

  return commands;
}

function shouldExtractExecutableLines(commandText) {
  return (
    /(^|\n)\s*\d+[.)]\s+/m.test(commandText) ||
    /(^|\n)\s*[-*+]\s+/m.test(commandText) ||
    /(^|\n)\s*\(.*\)\s*$/m.test(commandText) ||
    /(^|\n)\s*[^`\n]+:\s*$/m.test(commandText) ||
    /`[^`]+`/.test(commandText)
  );
}

function normalizeExecutableCommandBlock(commandText) {
  const text = commandText.trim();
  if (!text || !shouldExtractExecutableLines(text)) {
    return text;
  }

  const lines = text.split('\n');
  const extracted = [];
  const seen = new Set();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const loweredLine = line.toLowerCase();

    if (
      extracted.length > 0 &&
      /^(\d+[.)]\s*)?(option|alternative)\b/.test(loweredLine)
    ) {
      break;
    }

    const directCandidate = stripCommandLineDecorators(line);
    if (directCandidate && isLikelyExecutableLine(directCandidate)) {
      const key = directCandidate.replace(/\s+/g, ' ').trim();
      if (!seen.has(key)) {
        seen.add(key);
        extracted.push(directCandidate);
      }
      continue;
    }

    const inlineCommands = extractInlineCodeCommands(line);
    for (const inlineCommand of inlineCommands) {
      const key = inlineCommand.replace(/\s+/g, ' ').trim();
      if (!seen.has(key)) {
        seen.add(key);
        extracted.push(inlineCommand);
      }
    }
  }

  if (extracted.length > 0) {
    return extracted.join('\n');
  }

  return text;
}

function collectJsonCandidates(text) {
  const candidates = [];
  const trimmed = text.trim();

  if (trimmed) {
    candidates.push(trimmed);
  }

  const fencedJsonRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match;
  while ((match = fencedJsonRegex.exec(text)) !== null) {
    const candidate = match[1].trim();
    if (candidate) {
      candidates.push(candidate);
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const braceSlice = trimmed.slice(firstBrace, lastBrace + 1).trim();
    if (braceSlice) {
      candidates.push(braceSlice);
      const cleanedBraceSlice = braceSlice.replace(/\}\s*\}+$/, '}');
      if (cleanedBraceSlice !== braceSlice) {
        candidates.push(cleanedBraceSlice);
      }
    }
  }

  return [...new Set(candidates)];
}

function normalizeCommandsFromJsonArray(commandsValue) {
  if (!Array.isArray(commandsValue)) return [];

  const commands = [];
  const seen = new Set();

  for (const item of commandsValue) {
    if (typeof item !== 'string') continue;

    const normalizedItem = normalizeExecutableCommandBlock(
      unwrapOuterCommandWrapper(item)
    );
    if (!normalizedItem) continue;

    const itemLines = normalizedItem
      .split('\n')
      .map(line => stripCommandLineDecorators(line))
      .filter(Boolean);

    for (const line of itemLines) {
      if (!isLikelyExecutableLine(line)) continue;
      const key = line.replace(/\s+/g, ' ').trim();
      if (seen.has(key)) continue;
      seen.add(key);
      commands.push(line);
    }
  }

  return commands;
}

function parseStructuredCommandResponse(output, explainMode) {
  const candidates = collectJsonCandidates(output);

  for (const candidate of candidates) {
    let parsed;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      continue;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      continue;
    }

    let commands = normalizeCommandsFromJsonArray(parsed.commands);

    if (commands.length === 0 && typeof parsed.command === 'string') {
      commands = normalizeCommandsFromJsonArray([parsed.command]);
    }

    if (commands.length === 0) {
      continue;
    }

    const explanation =
      explainMode &&
      typeof parsed.explanation === 'string' &&
      parsed.explanation.trim()
        ? parsed.explanation.trim()
        : null;

    return {
      explanation,
      command: commands.join('\n'),
    };
  }

  return null;
}

function parseModelOutput(output, explainMode) {
  const structuredResponse = parseStructuredCommandResponse(output, explainMode);
  if (structuredResponse) {
    return structuredResponse;
  }

  let explanation = null;
  let command = output.trim();

  const fencedCodeBlockRegex = /```(?:\w+)?\s*([\s\S]+?)```/s;
  const fencedMatch = command.match(fencedCodeBlockRegex);

  if (fencedMatch) {
    command = fencedMatch[1].trim();
    const explanationPart = output.substring(0, fencedMatch.index).trim();
    if (explanationPart) {
      explanation = explanationPart;
    }

    command = unwrapOuterCommandWrapper(command);
    command = normalizeExecutableCommandBlock(command);

    if (explanation) {
      const conversationalStarts =
        /^(?:(hi|hello|hey|greetings|i am|i'm|as a large language model|i cannot|i'm sorry|i understand|okay|sure|alright|of course|you can|you could|to do that|here is|here's)\b|(?:assistant|ai|system|user|model)\s*:)/i;

      const explanationLines = explanation
        .split('\n')
        .filter(line => line.trim() !== '');

      const cleanedExplanationLines = [];
      for (const line of explanationLines) {
        if (conversationalStarts.test(line.trim())) {
          break;
        }
        cleanedExplanationLines.push(line);
      }

      explanation = cleanedExplanationLines.join('\n').trim();
      explanation = explanation.replace(/^explanation:\s*/i, '').trim();
      if (explanation === '') explanation = null;
    }
  } else {
    const commandStartRegex =
      /^(?:[a-zA-Z0-9_-]+|\.|\/|~|[>|!$%&*+,\-./:;=?@^_~])/;
    const conversationalLineRegex =
      /^(?:(hi|hello|hey|greetings|i am|i'm|as a large language model|i cannot|i'm sorry|i understand|okay|sure|alright|of course|you can|you could|to do that|here is|here's)|[^\s]+:)/i;

    const lines = output.split('\n');

    let firstCommandLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (!trimmedLine) continue;

      if (
        commandStartRegex.test(trimmedLine) &&
        !conversationalLineRegex.test(trimmedLine.toLowerCase())
      ) {
        firstCommandLineIndex = i;
        break;
      }
    }

    if (firstCommandLineIndex !== -1) {
      if (explainMode) {
        explanation = lines.slice(0, firstCommandLineIndex).join('\n').trim();
        if (explanation === '') explanation = null;
      }
      command = lines.slice(firstCommandLineIndex).join('\n').trim();
      command = command.replace(/^\$\s+/, '').replace(/^#\s+/, '');
      command = unwrapOuterCommandWrapper(command);
      command = normalizeExecutableCommandBlock(command);
    } else {
      console.warn(
        'Warning: Could not identify a clear command start line or code block in the model output.'
      );
      command = output.trim();
      explanation = null;
    }
  }

  if (command === '') {
    console.warn(
      'Warning: Command extraction resulted in an empty string. Using full output as command.'
    );
    command = output.trim();
    explanation = null;
  }

  if (explanation) {
    explanation = explanation.trim();
    if (explanation === '') explanation = null;
  }

  return { explanation, command };
}

function normalizeConfig(rawConfig) {
  const config = { ...DEFAULT_CONFIG, ...(rawConfig || {}) };

  if (config.provider === 'local') {
    config.provider = 'ollama';
  }

  if (!config.openaiApiKey && config.apiKey) {
    config.openaiApiKey = config.apiKey;
  }
  if (config.apiKey) {
    delete config.apiKey;
  }

  if (!PROVIDERS.includes(config.provider)) {
    config.provider = DEFAULT_CONFIG.provider;
  }

  if (!config.minimaxModel) {
    config.minimaxModel = DEFAULT_CONFIG.minimaxModel;
  }
  if (!config.minimaxReasoningEffort) {
    config.minimaxReasoningEffort = DEFAULT_CONFIG.minimaxReasoningEffort;
  }
  if (!config.minimaxUrl) {
    config.minimaxUrl = DEFAULT_CONFIG.minimaxUrl;
  }

  if (!config.antigravityModel) {
    config.antigravityModel = DEFAULT_CONFIG.antigravityModel;
  }
  if (!config.antigravityReasoningEffort) {
    config.antigravityReasoningEffort = DEFAULT_CONFIG.antigravityReasoningEffort;
  }
  if (!config.antigravityUrl) {
    config.antigravityUrl = DEFAULT_CONFIG.antigravityUrl;
  }

  if (!config.customModel) {
    config.customModel = DEFAULT_CONFIG.customModel;
  }
  if (!config.customReasoningEffort) {
    config.customReasoningEffort = DEFAULT_CONFIG.customReasoningEffort;
  }
  if (!config.customUrl) {
    config.customUrl = DEFAULT_CONFIG.customUrl;
  }

  if (!config.openaiModel) {
    config.openaiModel = DEFAULT_CONFIG.openaiModel;
  }
  if (!config.geminiModel) {
    config.geminiModel = DEFAULT_CONFIG.geminiModel;
  }
  if (!config.claudeModel) {
    config.claudeModel = DEFAULT_CONFIG.claudeModel;
  }

  return config;
}

function buildSystemInstruction(
  osInfo,
  shellInfo,
  explainMode,
  commandAvailabilityContext
) {
  const modeInstruction = explainMode
    ? 'Return a strict JSON object with keys: "commands" (array of executable shell commands) and "explanation" (brief string).'
    : 'Return a strict JSON object with key: "commands" (array of executable shell commands). You may include "explanation" as null or omit it.';
  const outputShapeInstruction =
    'JSON only (no markdown fences, headings, numbered lists, bullet points, notes, placeholders, or alternative approaches). If multiple commands are required, list them in "commands" in execution order. Choose one best approach.';
  const commandAvailabilityInstruction = commandAvailabilityContext
    ? `Use the runtime tool context below to choose commands that are actually installed. If a needed command appears missing, add install command(s) using an available package manager, then the task command.

${commandAvailabilityContext}`
    : '';

  const envInstruction = shellInfo.toLowerCase().includes('powershell')
    ? 'Environment rules: The user is currently in Windows PowerShell (default Windows PowerShell 5.1 compatible syntax). Always generate valid Windows PowerShell commands (e.g. Set-Location, Get-ChildItem, Select-String, $HOME, $env:VAR, ";" for command chaining instead of "&&"). Do NOT output Linux/bash-only syntax.'
    : '';

  return `
You are a helpful shell (${shellInfo}) assistant, running on ${osInfo}.
The user will ask for a task they want to accomplish or need help with.
Your goal is to provide safe and correct shell command(s) to accomplish that task.
${envInstruction}
${modeInstruction}
${outputShapeInstruction}
${commandAvailabilityInstruction}
Output only valid JSON.
`.trim();
}

function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

async function isCommandInstalled(command) {
  try {
    await execFileAsync(command, ['--version'], {
      timeout: 5000,
      windowsHide: true,
    });
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    return true;
  }
}

function listInstalledCommandsFromPath() {
  const rawPath = process.env.PATH || '';
  if (!rawPath) return [];

  const pathDirs = rawPath
    .split(path.delimiter)
    .map(dir => dir.trim().replace(/^"+|"+$/g, ''))
    .filter(Boolean);

  const commands = new Set();
  const visitedDirs = new Set();
  const windowsPathExt = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .map(ext => ext.toLowerCase())
    .filter(Boolean);

  for (const dir of pathDirs) {
    if (visitedDirs.has(dir)) continue;
    visitedDirs.add(dir);

    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() && !entry.isSymbolicLink()) continue;

      const fullPath = path.join(dir, entry.name);

      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (!stat.isFile()) continue;

      if (process.platform === 'win32') {
        const extension = path.extname(entry.name).toLowerCase();
        if (!windowsPathExt.includes(extension)) continue;
        const commandName = path.basename(entry.name, extension);
        if (commandName) {
          commands.add(commandName);
        }
        continue;
      }

      if ((stat.mode & 0o111) !== 0) {
        commands.add(entry.name);
      }
    }
  }

  return Array.from(commands).sort((a, b) => a.localeCompare(b));
}

function toVersionLine(text) {
  if (!text || typeof text !== 'string') return null;
  const line = stripAnsi(text)
    .split(/\r?\n/)
    .map(value => value.trim())
    .find(Boolean);
  if (!line) return null;
  if (!/\d/.test(line) && !/version/i.test(line)) return null;
  if (
    /(unknown|illegal|invalid|unrecognized)\s+option|usage:/i.test(line) &&
    !/version/i.test(line)
  ) {
    return null;
  }
  return line;
}

async function getCommandVersion(command) {
  const candidates = [];
  const specificArgs = VERSION_ARGS_BY_COMMAND[command];
  if (specificArgs) {
    candidates.push(specificArgs);
  }
  candidates.push(['--version']);
  candidates.push(['-V']);

  const seen = new Set();
  for (const args of candidates) {
    const key = args.join('\u0000');
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const { stdout, stderr } = await execFileAsync(command, args, {
        timeout: VERSION_PROBE_TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: 128 * 1024,
      });

      const versionLine = toVersionLine(stdout) || toVersionLine(stderr);
      if (versionLine) return versionLine;
    } catch (error) {
      if (error.code === 'ENOENT' || error.killed) {
        return null;
      }

      const versionLine =
        toVersionLine(error.stdout) ||
        toVersionLine(error.stderr) ||
        toVersionLine(error.message);
      if (versionLine) return versionLine;
    }
  }

  return null;
}

async function detectAvailablePackageManagers() {
  const platformManagers =
    PACKAGE_MANAGER_CANDIDATES[process.platform] || PACKAGE_MANAGER_CANDIDATES.fallback;

  const checks = await Promise.all(
    platformManagers.map(async manager => ({
      manager,
      installed: await isCommandInstalled(manager.command),
    }))
  );

  return checks
    .filter(result => result.installed)
    .map(result => result.manager);
}

async function buildCommandAvailabilityContext() {
  const installedCommands = listInstalledCommandsFromPath();
  const installedSet = new Set(installedCommands);
  const includedCommands = installedCommands.slice(0, COMMAND_PROMPT_LIMIT);

  const versionCandidates = VERSION_PROBE_CANDIDATES.filter(command =>
    installedSet.has(command)
  ).slice(0, VERSION_PROMPT_LIMIT);

  const versionChecks = await Promise.all(
    versionCandidates.map(async command => ({
      command,
      version: await getCommandVersion(command),
    }))
  );
  const detectedVersions = versionChecks.filter(item => item.version);

  const availablePackageManagers = await detectAvailablePackageManagers();

  const lines = [
    'Runtime tool context (generated locally):',
    `- PATH commands discovered: ${installedCommands.length}`,
  ];

  if (includedCommands.length === 0) {
    lines.push('- Installed command names: none detected');
  } else if (installedCommands.length > includedCommands.length) {
    lines.push(
      `- Installed command names (alphabetical, first ${includedCommands.length} due to token cap): ${includedCommands.join(', ')}`
    );
  } else {
    lines.push(
      `- Installed command names (alphabetical): ${includedCommands.join(', ')}`
    );
  }

  if (detectedVersions.length > 0) {
    lines.push(
      `- Detected command versions (sample of ${detectedVersions.length}): ${detectedVersions
        .map(item => `${item.command}=${item.version}`)
        .join('; ')}`
    );
  } else {
    lines.push('- Detected command versions: unavailable');
  }

  if (availablePackageManagers.length > 0) {
    lines.push(
      `- Available package managers: ${availablePackageManagers
        .map(manager => `${manager.command} (${manager.installTemplate})`)
        .join('; ')}`
    );
  } else {
    lines.push('- Available package managers: none detected');
  }

  lines.push(
    '- Command policy: Prefer installed commands from the list above. If a required command appears missing, include install command(s) using only available package managers before the task command.'
  );

  return lines.join('\n');
}

async function getOllamaModels() {
  let stdout = '';
  let stderr = '';

  try {
    const result = await execFileAsync('ollama', ['list'], {
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    stdout = result.stdout || '';
    stderr = result.stderr || '';
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        'Ollama command was not found. Install Ollama first: https://ollama.com/download'
      );
    }
    const errOut = [error.stdout, error.stderr, error.message]
      .filter(Boolean)
      .join('\n')
      .trim();
    throw new Error(`Failed to list Ollama models.\n${stripAnsi(errOut)}`);
  }

  const output = stripAnsi(stdout).trim();
  const lines = output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    if (stderr && stderr.trim()) {
      throw new Error(stripAnsi(stderr).trim());
    }
    return [];
  }

  const rows = lines[0].toLowerCase().startsWith('name')
    ? lines.slice(1)
    : lines;
  const models = rows
    .map(line => line.split(/\s+/)[0])
    .filter(Boolean)
    .filter(model => model.toLowerCase() !== 'name');

  return [...new Set(models)];
}

async function promptChoice(label, options, currentValue = null) {
  if (!options || options.length === 0) {
    throw new Error(`No options were provided for ${label}.`);
  }

  const defaultIndex =
    currentValue && options.includes(currentValue)
      ? options.indexOf(currentValue)
      : 0;

  console.log(`\n${label}:`);
  options.forEach((option, index) => {
    const marker = index === defaultIndex ? ' (default)' : '';
    console.log(`  ${index + 1}. ${option}${marker}`);
  });

  while (true) {
    const answer = (await ask(`Choose ${label.toLowerCase()} [${defaultIndex + 1}]: `)).trim();

    if (!answer) {
      return options[defaultIndex];
    }

    if (/^\d+$/.test(answer)) {
      const selectedIndex = Number.parseInt(answer, 10) - 1;
      if (selectedIndex >= 0 && selectedIndex < options.length) {
        return options[selectedIndex];
      }
    }

    if (options.includes(answer)) {
      return answer;
    }

    console.log(
      `Invalid selection. Enter a number between 1 and ${options.length}, or an exact option value.`
    );
  }
}

async function promptApiKey(name, existingKey = '') {
  if (existingKey) {
    const answer = (
      await ask(`Paste your ${name} API key (press ENTER to keep current): `)
    ).trim();
    return answer || existingKey;
  }

  while (true) {
    const answer = (await ask(`Paste your ${name} API key: `)).trim();
    if (answer) {
      return answer;
    }
    console.log('API key is required.');
  }
}

function getOpenAIReasoningOptions(model) {
  if (model === 'gpt-5.3-codex' || model === 'gpt-5.2-codex') {
    return ['low', 'medium', 'high', 'xhigh'];
  }
  return ['low', 'medium', 'high'];
}

function supportsClaudeReasoningEffort(model) {
  return ['claude-opus-4-6', 'claude-sonnet-4-6'].includes(model);
}

function getGeminiThinkingConfig(model, effort) {
  if (model.startsWith('gemini-3')) {
    return { thinkingLevel: effort };
  }

  const budgetMap = {
    'gemini-2.5-pro': {
      low: 2048,
      medium: 8192,
      high: 24576,
    },
    'gemini-2.5-flash': {
      low: 1024,
      medium: 6144,
      high: 16384,
    },
    'gemini-2.5-flash-lite': {
      low: 512,
      medium: 4096,
      high: 12288,
    },
  };

  const modelMap = budgetMap[model];
  if (!modelMap) {
    return null;
  }

  const thinkingBudget = modelMap[effort] || modelMap.medium;
  return { thinkingBudget };
}

function extractOpenAIText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data?.output)) {
    const parts = [];
    for (const item of data.output) {
      if (!Array.isArray(item?.content)) continue;
      for (const content of item.content) {
        if (
          (content?.type === 'output_text' || content?.type === 'text') &&
          typeof content.text === 'string' &&
          content.text.trim()
        ) {
          parts.push(content.text.trim());
        }
      }
    }
    if (parts.length) {
      return parts.join('\n').trim();
    }
  }

  if (typeof data?.choices?.[0]?.message?.content === 'string') {
    return data.choices[0].message.content.trim();
  }

  return '';
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return '';
  }

  const textParts = parts
    .map(part => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean);

  return textParts.join('\n').trim();
}

function extractClaudeText(data) {
  if (!Array.isArray(data?.content)) {
    return '';
  }

  const textBlocks = data.content
    .filter(block => block?.type === 'text' && typeof block?.text === 'string')
    .map(block => block.text.trim())
    .filter(Boolean);

  return textBlocks.join('\n').trim();
}

async function generateCommandOpenAI(
  userPrompt,
  osInfo,
  shellInfo,
  commandAvailabilityContext,
  apiKey,
  model,
  reasoningEffort,
  explainMode
) {
  const systemInstruction = buildSystemInstruction(
    osInfo,
    shellInfo,
    explainMode,
    commandAvailabilityContext
  );

  const payload = {
    model,
    reasoning: { effort: reasoningEffort },
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: systemInstruction,
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: userPrompt,
          },
        ],
      },
    ],
    max_output_tokens: explainMode ? 1200 : 400,
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `OpenAI API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const rawOutput = extractOpenAIText(data);

  if (!rawOutput) {
    throw new Error('OpenAI API returned an empty response.');
  }

  return rawOutput;
}

async function generateCommandGemini(
  userPrompt,
  osInfo,
  shellInfo,
  commandAvailabilityContext,
  apiKey,
  model,
  reasoningEffort,
  explainMode
) {
  const systemInstruction = buildSystemInstruction(
    osInfo,
    shellInfo,
    explainMode,
    commandAvailabilityContext
  );
  const thinkingConfig = getGeminiThinkingConfig(model, reasoningEffort);

  const generationConfig = {
    responseMimeType: 'text/plain',
  };

  if (thinkingConfig) {
    generationConfig.thinkingConfig = thinkingConfig;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemInstruction}\n\nTask: "${userPrompt}"`,
              },
            ],
          },
        ],
        generationConfig,
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Google Gemini API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const rawOutput = extractGeminiText(data);
  if (!rawOutput) {
    throw new Error('Gemini API returned an empty response.');
  }

  return rawOutput;
}

async function generateCommandClaude(
  userPrompt,
  osInfo,
  shellInfo,
  commandAvailabilityContext,
  apiKey,
  model,
  reasoningEffort,
  explainMode
) {
  const systemInstruction = buildSystemInstruction(
    osInfo,
    shellInfo,
    explainMode,
    commandAvailabilityContext
  );

  const payload = {
    model,
    max_tokens: explainMode ? 1200 : 400,
    messages: [
      {
        role: 'user',
        content: `${systemInstruction}\n\nTask: "${userPrompt}"`,
      },
    ],
  };

  if (supportsClaudeReasoningEffort(model)) {
    payload.output_config = {
      effort: reasoningEffort,
    };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Anthropic API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const rawOutput = extractClaudeText(data);
  if (!rawOutput) {
    throw new Error('Claude API returned an empty response.');
  }

  return rawOutput;
}

async function generateCommandOllama(
  userPrompt,
  osInfo,
  shellInfo,
  commandAvailabilityContext,
  model,
  explainMode
) {
  const isInstalled = await isCommandInstalled('ollama');
  if (!isInstalled) {
    throw new Error(
      'Ollama command was not found. Install Ollama first: https://ollama.com/download'
    );
  }

  const systemInstruction = buildSystemInstruction(
    osInfo,
    shellInfo,
    explainMode,
    commandAvailabilityContext
  );
  const prompt = `${systemInstruction}\n\nTask: "${userPrompt}"`;

  try {
    const { stdout, stderr } = await execFileAsync('ollama', ['run', model, prompt], {
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });

    const output = stripAnsi((stdout || '').trim());
    if (output) {
      return output;
    }

    const errText = stripAnsi((stderr || '').trim());
    if (errText) {
      throw new Error(errText);
    }

    throw new Error('Ollama returned no output.');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        'Ollama command was not found. Install Ollama first: https://ollama.com/download'
      );
    }
    const details = [error.stdout, error.stderr, error.message]
      .filter(Boolean)
      .join('\n')
      .trim();
    throw new Error(`Ollama request failed.\n${stripAnsi(details)}`);
  }
}

async function generateCommandChatCompletions(
  providerName,
  endpointUrl,
  userPrompt,
  osInfo,
  shellInfo,
  commandAvailabilityContext,
  apiKey,
  model,
  reasoningEffort,
  explainMode
) {
  const systemInstruction = buildSystemInstruction(
    osInfo,
    shellInfo,
    explainMode,
    commandAvailabilityContext
  );

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: systemInstruction,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    max_tokens: explainMode ? 1200 : 400,
  };

  if (reasoningEffort) {
    payload.reasoning_effort = reasoningEffort;
  }

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `${providerName} API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const rawOutput = extractOpenAIText(data);

  if (!rawOutput) {
    throw new Error(`${providerName} API returned an empty response.`);
  }

  return rawOutput;
}

async function configureMinimax(config) {
  console.log('\nConfiguring MiniMax provider.');

  config.minimaxApiKey = await promptApiKey(
    'MiniMax',
    config.minimaxApiKey || ''
  );
  config.minimaxModel = await promptChoice(
    'MiniMax model',
    MINIMAX_MODELS,
    config.minimaxModel
  );
  config.minimaxReasoningEffort = await promptChoice(
    'MiniMax reasoning effort',
    ['low', 'medium', 'high', 'xhigh', 'max'],
    config.minimaxReasoningEffort
  );
}

async function configureAntigravity(config) {
  console.log('\nConfiguring Antigravity / OpenAI-compatible proxy provider.');

  const urlInput = (
    await ask(
      `Endpoint URL [${config.antigravityUrl || DEFAULT_CONFIG.antigravityUrl}]: `
    )
  ).trim();
  if (urlInput) {
    config.antigravityUrl = urlInput;
  }

  config.antigravityApiKey = await promptApiKey(
    'Antigravity',
    config.antigravityApiKey || ''
  );
  config.antigravityModel = await promptChoice(
    'Antigravity model',
    ANTIGRAVITY_MODELS,
    config.antigravityModel
  );
  config.antigravityReasoningEffort = await promptChoice(
    'Antigravity reasoning effort',
    ['low', 'medium', 'high'],
    config.antigravityReasoningEffort
  );
}

async function configureCustom(config) {
  console.log('\nConfiguring Custom OpenAI-compatible provider.');

  const urlInput = (
    await ask(`Endpoint URL [${config.customUrl || DEFAULT_CONFIG.customUrl}]: `)
  ).trim();
  if (urlInput) {
    config.customUrl = urlInput;
  }

  config.customApiKey = await promptApiKey('Custom', config.customApiKey || '');

  const modelInput = (
    await ask(`Model name [${config.customModel || DEFAULT_CONFIG.customModel}]: `)
  ).trim();
  if (modelInput) {
    config.customModel = modelInput;
  }

  config.customReasoningEffort = await promptChoice(
    'Reasoning effort',
    ['low', 'medium', 'high', 'xhigh', 'max'],
    config.customReasoningEffort
  );
}

async function configureOpenAI(config) {
  console.log('\nConfiguring OpenAI provider.');
  console.log(
    'Models are hardcoded to current Codex options. You can update this list in bin/ai.js later.'
  );

  config.openaiApiKey = await promptApiKey(
    'OpenAI',
    config.openaiApiKey || ''
  );
  config.openaiModel = await promptChoice(
    'OpenAI model',
    OPENAI_MODELS,
    config.openaiModel
  );

  const effortOptions = getOpenAIReasoningOptions(config.openaiModel);
  config.openaiReasoningEffort = await promptChoice(
    'OpenAI reasoning effort',
    effortOptions,
    config.openaiReasoningEffort
  );
}

async function configureGemini(config) {
  console.log('\nConfiguring Gemini provider.');
  console.log(
    'Models are hardcoded from current Gemini API docs. You can update this list in bin/ai.js later.'
  );

  config.geminiApiKey = await promptApiKey(
    'Google Gemini',
    config.geminiApiKey || ''
  );
  config.geminiModel = await promptChoice(
    'Gemini model',
    GEMINI_MODELS,
    config.geminiModel
  );
  config.geminiReasoningEffort = await promptChoice(
    'Gemini reasoning effort',
    ['low', 'medium', 'high'],
    config.geminiReasoningEffort
  );
}

async function configureClaude(config) {
  console.log('\nConfiguring Claude provider.');
  console.log(
    'Models are hardcoded from current Anthropic API docs. You can update this list in bin/ai.js later.'
  );

  config.claudeApiKey = await promptApiKey(
    'Anthropic Claude',
    config.claudeApiKey || ''
  );
  config.claudeModel = await promptChoice(
    'Claude model',
    CLAUDE_MODELS,
    config.claudeModel
  );

  if (supportsClaudeReasoningEffort(config.claudeModel)) {
    const effortOptions =
      config.claudeModel === 'claude-opus-4-6'
        ? ['low', 'medium', 'high', 'max']
        : ['low', 'medium', 'high'];

    config.claudeReasoningEffort = await promptChoice(
      'Claude reasoning effort',
      effortOptions,
      config.claudeReasoningEffort
    );
  } else {
    console.log(
      '\nSelected Claude model does not expose reasoning effort controls in this CLI path; using default model behavior.'
    );
  }
}

async function configureOllama(config) {
  console.log('\nConfiguring Ollama provider.');

  const installed = await isCommandInstalled('ollama');
  if (!installed) {
    throw new Error(
      'Ollama is not installed or not in PATH. Install it first: https://ollama.com/download'
    );
  }

  const models = await getOllamaModels();
  if (models.length === 0) {
    throw new Error(
      'No Ollama models found. Pull one first, for example: ollama pull llama3.2'
    );
  }

  config.ollamaModel = await promptChoice(
    'Ollama model',
    models,
    config.ollamaModel
  );
}

async function configureProviderSettings(config) {
  if (config.provider === 'custom') {
    await configureCustom(config);
    return;
  }

  if (config.provider === 'minimax') {
    await configureMinimax(config);
    return;
  }

  if (config.provider === 'antigravity') {
    await configureAntigravity(config);
    return;
  }

  if (config.provider === 'openai') {
    await configureOpenAI(config);
    return;
  }

  if (config.provider === 'gemini') {
    await configureGemini(config);
    return;
  }

  if (config.provider === 'claude') {
    await configureClaude(config);
    return;
  }

  if (config.provider === 'ollama') {
    await configureOllama(config);
    return;
  }

  throw new Error(`Unsupported provider "${config.provider}".`);
}

function summarizeProvider(config) {
  if (config.provider === 'custom') {
    return `Provider: custom | Model: ${config.customModel} | Reasoning effort: ${config.customReasoningEffort}`;
  }
  if (config.provider === 'minimax') {
    return `Provider: minimax | Model: ${config.minimaxModel} | Reasoning effort: ${config.minimaxReasoningEffort}`;
  }
  if (config.provider === 'antigravity') {
    return `Provider: antigravity | Model: ${config.antigravityModel} | Reasoning effort: ${config.antigravityReasoningEffort}`;
  }
  if (config.provider === 'openai') {
    return `Provider: openai | Model: ${config.openaiModel} | Reasoning effort: ${config.openaiReasoningEffort}`;
  }
  if (config.provider === 'gemini') {
    return `Provider: gemini | Model: ${config.geminiModel} | Reasoning effort: ${config.geminiReasoningEffort}`;
  }
  if (config.provider === 'claude') {
    if (supportsClaudeReasoningEffort(config.claudeModel)) {
      return `Provider: claude | Model: ${config.claudeModel} | Reasoning effort: ${config.claudeReasoningEffort}`;
    }
    return `Provider: claude | Model: ${config.claudeModel}`;
  }
  return `Provider: ollama | Model: ${config.ollamaModel || '(not set)'}`;
}

async function generateWithConfiguredProvider(
  config,
  userPrompt,
  osInfo,
  shellInfo,
  commandAvailabilityContext,
  explainMode
) {
  if (config.provider === 'custom') {
    if (!config.customApiKey) {
      throw new Error(
        'Missing API key for provider "custom". Run "ai config" first.'
      );
    }
    return generateCommandChatCompletions(
      'Custom',
      config.customUrl,
      userPrompt,
      osInfo,
      shellInfo,
      commandAvailabilityContext,
      config.customApiKey,
      config.customModel,
      config.customReasoningEffort,
      explainMode
    );
  }

  if (config.provider === 'minimax') {
    if (!config.minimaxApiKey) {
      throw new Error(
        'Missing MiniMax API key for provider "minimax". Run "ai config" first.'
      );
    }
    return generateCommandChatCompletions(
      'MiniMax',
      config.minimaxUrl,
      userPrompt,
      osInfo,
      shellInfo,
      commandAvailabilityContext,
      config.minimaxApiKey,
      config.minimaxModel,
      config.minimaxReasoningEffort,
      explainMode
    );
  }

  if (config.provider === 'antigravity') {
    if (!config.antigravityApiKey) {
      throw new Error(
        'Missing Antigravity API key for provider "antigravity". Run "ai config" first.'
      );
    }
    return generateCommandChatCompletions(
      'Antigravity',
      config.antigravityUrl,
      userPrompt,
      osInfo,
      shellInfo,
      commandAvailabilityContext,
      config.antigravityApiKey,
      config.antigravityModel,
      config.antigravityReasoningEffort,
      explainMode
    );
  }

  if (config.provider === 'openai') {
    if (!config.openaiApiKey) {
      throw new Error(
        'Missing OpenAI API key for provider "openai". Run "ai config" first.'
      );
    }
    return generateCommandOpenAI(
      userPrompt,
      osInfo,
      shellInfo,
      commandAvailabilityContext,
      config.openaiApiKey,
      config.openaiModel,
      config.openaiReasoningEffort,
      explainMode
    );
  }

  if (config.provider === 'gemini') {
    if (!config.geminiApiKey) {
      throw new Error(
        'Missing Google Gemini API key for provider "gemini". Run "ai config" first.'
      );
    }
    return generateCommandGemini(
      userPrompt,
      osInfo,
      shellInfo,
      commandAvailabilityContext,
      config.geminiApiKey,
      config.geminiModel,
      config.geminiReasoningEffort,
      explainMode
    );
  }

  if (config.provider === 'claude') {
    if (!config.claudeApiKey) {
      throw new Error(
        'Missing Anthropic API key for provider "claude". Run "ai config" first.'
      );
    }
    return generateCommandClaude(
      userPrompt,
      osInfo,
      shellInfo,
      commandAvailabilityContext,
      config.claudeApiKey,
      config.claudeModel,
      config.claudeReasoningEffort,
      explainMode
    );
  }

  if (!config.ollamaModel) {
    throw new Error(
      'Missing Ollama model for provider "ollama". Run "ai config" first.'
    );
  }

  return generateCommandOllama(
    userPrompt,
    osInfo,
    shellInfo,
    commandAvailabilityContext,
    config.ollamaModel,
    explainMode
  );
}

async function main() {
  process.on('exit', () => {
    if (!rl.closed) {
      rl.close();
    }
  });

  rl.on('SIGINT', () => {
    console.log('\nOperation cancelled.');
    if (!rl.closed) {
      rl.close();
    }
    process.exit(1);
  });

  const args = process.argv.slice(2);
  const configReadPath = resolvePreferredPath(CONFIG_PATH, LEGACY_CONFIG_PATH);
  const historyReadPath = resolvePreferredPath(HISTORY_PATH, LEGACY_HISTORY_PATH);

  let config = { ...DEFAULT_CONFIG };
  if (fs.existsSync(configReadPath)) {
    try {
      const existingConfig = JSON.parse(fs.readFileSync(configReadPath, 'utf-8'));
      config = normalizeConfig(existingConfig);
    } catch (e) {
      console.error('Error reading config file:', e.message);
      config = { ...DEFAULT_CONFIG };
    }
  } else {
    config = normalizeConfig(config);
  }

  if (args[0] === 'config') {
    console.log('\nConfigure cmd-ai settings.');
    console.log(`Current provider: ${config.provider}`);

    const selectedProvider = (
      await ask(
        `Choose AI provider (${PROVIDERS.join(', ')}) [${config.provider}]: `
      )
    )
      .trim()
      .toLowerCase();

    if (selectedProvider) {
      if (!PROVIDERS.includes(selectedProvider)) {
        console.error(
          `Invalid provider selected. Choose one of: ${PROVIDERS.join(', ')}.`
        );
        rl.close();
        process.exit(1);
      }
      config.provider = selectedProvider;
    }

    try {
      await configureProviderSettings(config);
      ensureParentDirectory(CONFIG_PATH);
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

      console.log('\n✅ Configuration saved successfully.');
      console.log(summarizeProvider(config));
      console.log('You can now run commands like:');
      console.log('  ai list all files in this folder\n');
    } catch (error) {
      console.error(`\nConfiguration failed: ${error.message}`);
      rl.close();
      process.exit(1);
    }

    rl.close();
    return;
  }

  if (['man', '--help', '-h'].includes(args[0])) {
    printHelp();
    rl.close();
    return;
  }

  if (args[0] === '--version') {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
      );
      console.log(`cmd-ai v${pkg.version}`);
    } catch (error) {
      console.error(
        'Could not read package.json to determine version: ' + error.message
      );
      console.log('cmd-ai version unknown');
    }

    rl.close();
    return;
  }

  if (args[0] === 'install-autocomplete') {
    installAutocompleteScript();
    rl.close();
    return;
  }

  if (args[0] === 'clear' || args[0] === 'reset') {
    clearCurrentSessionHistory();
    console.log('Current terminal context cleared.');
    rl.close();
    return;
  }

  if (args[0] === 'history') {
    if (!fs.existsSync(historyReadPath)) {
      console.log('No command history found.');
      rl.close();
      return;
    }

    try {
      const history = JSON.parse(fs.readFileSync(historyReadPath, 'utf-8'));
      if (history.length === 0) {
        console.log('Command history is empty.');
        rl.close();
        return;
      }

      history.forEach((entry, idx) => {
        console.log(
          `\n--- History Entry #${idx + 1} ---\nTimestamp: ${
            entry.timestamp
          }\nPrompt: ${entry.prompt}\nCommand:\n${entry.command}\nExecuted: ${
            entry.executed
          }${entry.provider ? ` (Provider: ${entry.provider})` : ''}${
            entry.notes ? `\nNotes: ${entry.notes}` : ''
          }`
        );
      });
    } catch (e) {
      console.error('Error reading or parsing history file:', e.message);
    }

    rl.close();
    return;
  }

  const explainMode = args.includes('--explain');
  const dryRun = args.includes('--dry');
  const filteredArgs = args.filter(arg => !['--explain', '--dry'].includes(arg));
  const userPrompt = filteredArgs.join(' ');
  const osInfo = `${os.platform()} ${os.release()} (${os.arch()})`;
  const shellInfo =
    process.platform === 'win32'
      ? (process.env.CMD_AI_SHELL_EXEC_FILE || '').toLowerCase().endsWith('.bat')
        ? 'cmd.exe (Windows)'
        : 'Windows PowerShell'
      : process.env.SHELL
      ? path.basename(process.env.SHELL)
      : 'sh, zsh, ksh, etc';
  let commandAvailabilityContext = '';

  if (!userPrompt) {
    printHelp();
    rl.close();
    process.exit(0);
  }

  try {
    commandAvailabilityContext = await buildCommandAvailabilityContext();
  } catch (error) {
    console.warn(
      `Warning: Could not gather local command inventory (${error.message}). Continuing without it.`
    );
  }

  const recentConversationContext =
    buildRecentConversationContext(historyReadPath);
  if (recentConversationContext) {
    commandAvailabilityContext = commandAvailabilityContext
      ? `${commandAvailabilityContext}\n\n${recentConversationContext}`
      : recentConversationContext;
  }

  let rawModelOutput = '';
  const executedProvider = config.provider;
  const loadingIndicator = startGenerationLoading(executedProvider);

  try {
    rawModelOutput = await generateWithConfiguredProvider(
      config,
      userPrompt,
      osInfo,
      shellInfo,
      commandAvailabilityContext,
      explainMode
    );
    loadingIndicator.stop();
  } catch (error) {
    loadingIndicator.stop();
    console.error(`\nError generating command: ${error.message}`);
    saveHistory({
      prompt: userPrompt,
      command: 'Error generating command',
      executed: false,
      provider: executedProvider,
      notes: `Generation failed: ${error.message}`,
    });
    rl.close();
    process.exit(1);
  }

  const { explanation, command } = parseModelOutput(rawModelOutput, explainMode);

  if (explainMode && explanation) {
    console.log('\n--- Explanation ---');
    console.log(explanation);
  }

  console.log(`\n> ${command}`);

  if (!command || command.trim() === '') {
    console.error('\nCould not extract a valid command from the AI response.');
    console.log('Full AI output was:');
    console.log(rawModelOutput);
    saveHistory({
      prompt: userPrompt,
      command: rawModelOutput,
      executed: false,
      provider: executedProvider,
      notes: 'Command extraction failed',
    });
    rl.close();
    return;
  }

  if (isDangerous(command)) {
    console.error(
      '\n** WARNING: This command looks dangerous and will not be executed automatically. **'
    );
    saveHistory({
      prompt: userPrompt,
      command,
      executed: false,
      provider: executedProvider,
      notes: 'Dangerous command detected',
    });
    rl.close();
    return;
  }

  const confirm = await ask(
    dryRun
      ? '[Dry run] Press ENTER to simulate (or n/Esc to cancel): '
      : 'Press ENTER to run (or n/Esc to cancel): ',
    true
  );
  const shouldRun =
    confirm.trim() === '' || confirm.trim().toLowerCase() === 'y';

  if (!shouldRun) {
    console.log('Cancelled.');
    saveHistory({
      prompt: userPrompt,
      command,
      executed: false,
      provider: executedProvider,
      notes: 'Cancelled by user',
    });
    rl.close();
    return;
  }

  if (dryRun) {
    console.log('[Dry run] Command not executed.');
    saveHistory({
      prompt: userPrompt,
      command,
      executed: false,
      provider: executedProvider,
      notes: 'Dry run',
    });
    rl.close();
    return;
  }

  rl.close();

  const shellExecFile = (process.env.CMD_AI_SHELL_EXEC_FILE || '').trim();
  if (shellExecFile && isShellStateCommand(command)) {
    try {
      ensureParentDirectory(shellExecFile);
      fs.writeFileSync(shellExecFile, command, 'utf-8');
      saveHistory({
        prompt: userPrompt,
        command,
        output: `[Executed in parent shell: ${command}]`,
        executed: true,
        provider: executedProvider,
        notes: 'Delegated to parent shell session',
      });
      return;
    } catch (error) {
      console.warn(
        `Warning: Could not hand off command to parent shell (${error.message}). Falling back to child execution.`
      );
    }
  }

  if (supportsExecveHandoff()) {
    const shellPath = resolveExecutionShell();
    const shellArgv0 = path.basename(shellPath) || shellPath;
    const handoffToken = `execve-handoff:${Date.now().toString(36)}:${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    saveHistory({
      prompt: userPrompt,
      command,
      executed: true,
      provider: executedProvider,
      notes: `Delegated to ${shellPath} via execve; exit status not captured [${handoffToken}]`,
    });

    try {
      process.execve(shellPath, [shellArgv0, '-c', command], process.env);
      return;
    } catch (error) {
      removeLastHistoryEntryByNoteToken(handoffToken);
    }
  }

  const child = spawn(command, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell:
      process.platform === 'win32' && process.env.PSModulePath
        ? 'powershell.exe'
        : true,
  });

  let capturedOutput = '';
  const appendCaptured = chunk => {
    const text = stripAnsi(chunk.toString());
    capturedOutput += text;
    if (capturedOutput.length > MAX_OUTPUT_CHARS_PER_ENTRY * 2) {
      capturedOutput = capturedOutput.slice(-MAX_OUTPUT_CHARS_PER_ENTRY);
    }
  };

  if (child.stdout) {
    child.stdout.on('data', chunk => {
      process.stdout.write(chunk);
      appendCaptured(chunk);
    });
  }

  if (child.stderr) {
    child.stderr.on('data', chunk => {
      process.stderr.write(chunk);
      appendCaptured(chunk);
    });
  }

  child.on('error', error => {
    console.error(`\nExecution error:\n${error.message}`);
    saveHistory({
      prompt: userPrompt,
      command,
      output: capturedOutput.slice(-MAX_OUTPUT_CHARS_PER_ENTRY),
      executed: false,
      provider: executedProvider,
      notes: `Execution failed: ${error.message}`,
    });
  });

  child.on('exit', code => {
    saveHistory({
      prompt: userPrompt,
      command,
      output: capturedOutput.slice(-MAX_OUTPUT_CHARS_PER_ENTRY),
      executed: code === 0,
      provider: executedProvider,
      notes: code && code !== 0 ? `Exited with code ${code}` : undefined,
    });
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });
}

process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection:', reason);
  if (rl && !rl.closed) {
    rl.close();
  }
  if (!process.exitCode) {
    process.exit(1);
  }
});

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
  if (rl && !rl.closed) {
    rl.close();
  }
  if (!process.exitCode) {
    process.exit(1);
  }
});

main();
