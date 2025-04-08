#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Check Node.js version
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
if (majorVersion < 16) {
  console.error(`Error: Node.js version 16 or higher is required. You are using ${nodeVersion}.`);
  process.exit(1);
}

// Run the CLI
require('../dist/index.js');
