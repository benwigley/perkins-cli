import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';

program
  .command('init')
  .description('Initialize Perkins in your project')
  .action(async () => {
    console.log(chalk.blue('Initializing Perkins AI coding assistant...'));

    // Create config directory if it doesn't exist
    const configDir = path.join(os.homedir(), '.perkins');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Check if already initialized
    const configPath = path.join(configDir, 'config.json');
    if (fs.existsSync(configPath)) {
      const { reinitialize } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'reinitialize',
          message: 'Perkins is already initialized. Do you want to reinitialize?',
          default: false
        }
      ]);

      if (!reinitialize) {
        console.log(chalk.green('Initialization canceled.'));
        return;
      }
    }

    // Prompt for API key
    const { apiKey, modelName } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your API key:',
        validate: (input) => input.length > 0 ? true : 'API key is required'
      },
      {
        type: 'list',
        name: 'modelName',
        message: 'Select default model:',
        choices: [
          'gpt-4',
          'gpt-3.5-turbo',
          'claude-3-opus',
          'claude-3-sonnet'
        ],
        default: 'gpt-4'
      }
    ]);

    // Save config
    const config = {
      apiKey,
      modelName,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(chalk.green('✓ Perkins initialized successfully!'));
    console.log(chalk.gray(`Configuration saved to ${configPath}`));
  });
