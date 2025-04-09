import { program } from 'commander';
// import chalk from 'chalk';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import command modules
import './commands/init';
import './commands/chat';
import './commands/model';

// Set up the CLI program
program
  .name('perkins')
  .description('AI coding assistant CLI')
  .version('0.1.0');

// Parse arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.help();
}
