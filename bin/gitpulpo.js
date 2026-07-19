#!/usr/bin/env node
'use strict';

// Launcher para `npx gitpulpo` / instalación global: arranca el servidor y
// abre el navegador cuando el puerto ya escucha. Cero dependencias.
const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  process.stdout.write(
    'GitPulpo — visualizador local de repos Git\n\n' +
    'Uso: gitpulpo [opciones]\n\n' +
    '  --no-open      no abrir el navegador automáticamente\n' +
    '  -h, --help     mostrar esta ayuda\n\n' +
    'Variables de entorno:\n' +
    '  PORT           puerto de escucha (por defecto 3737)\n'
  );
  process.exit(0);
}

const { start } = require(path.join(__dirname, '..', 'server.js'));
const server = start();

server.on('listening', () => {
  const addr = server.address();
  const url = `http://localhost:${addr && addr.port ? addr.port : process.env.PORT || 3737}`;
  if (args.includes('--no-open')) return;
  openBrowser(url);
});

server.on('error', err => {
  if (err && err.code === 'EADDRINUSE') {
    process.stderr.write(`\n✗ El puerto ya está en uso. Prueba con otro:  PORT=4000 gitpulpo\n`);
    process.exit(1);
  }
  throw err;
});

function openBrowser(url) {
  let cmd, cmdArgs;
  if (process.platform === 'win32') {
    cmd = 'cmd'; cmdArgs = ['/c', 'start', '', url];
  } else if (process.platform === 'darwin') {
    cmd = 'open'; cmdArgs = [url];
  } else {
    cmd = 'xdg-open'; cmdArgs = [url];
  }
  try {
    spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true }).unref();
  } catch {
    // si falla la apertura, el usuario ya tiene la URL en el log del server
  }
}
