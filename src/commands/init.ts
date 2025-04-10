import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AVAILABLE_MODELS, ModelInfo } from "../constants/models";

// Define provider-specific configuration
interface ProviderConfig {
  apiKey: string;
  models: string[];
}

// Define the main configuration structure
interface PerkinsConfig {
  providers: {
    openai?: ProviderConfig;
    anthropic?: ProviderConfig;
  };
  defaultModel: string;
  timestamp: string;
}

program
  .command('init')
  .description('Initialize Perkins in your project')
  .action(async () => {
    console.log(chalk.blueBright('Initializing Perkins AI coding assistant...'));

    // Create config directory if it doesn't exist
    const configDir = path.join(os.homedir(), '.perkins');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Check if already initialized
    const configPath = path.join(configDir, 'config.json');
    let existingConfig: PerkinsConfig | null = null;

    if (fs.existsSync(configPath)) {
      try {
        existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

        const { reinitialize } = await inquirer.prompt({
          type: 'confirm',
          name: 'reinitialize',
          message: 'Perkins is already initialized. Do you want to reinitialize?',
          default: false
        });

        if (!reinitialize) {
          console.log(chalk.green('Initialization canceled.'));
          return;
        }
      } catch (error) {
        console.log(chalk.yellow('Error reading existing config. Creating a new one.'));
      }
    }

    // Ask which providers to configure
    const { selectedProviders } = await inquirer.prompt({
      type: 'checkbox',
      name: 'selectedProviders',
      message: 'Select AI providers to configure:',
      choices: [
        { name: 'OpenAI (GPT models)', value: 'openai' },
        { name: 'Anthropic (Claude models)', value: 'anthropic' }
      ],
      validate: (input) => input.length > 0 ? true : 'Please select at least one provider'
    });

    const config: PerkinsConfig = {
      providers: {},
      defaultModel: existingConfig?.defaultModel || 'gpt-4',
      timestamp: new Date().toISOString()
    };

    // Configure each selected provider
    for (const provider of selectedProviders) {
      console.log(chalk.blue(`\nConfiguring ${provider.toUpperCase()}...`));

      const { apiKey } = await inquirer.prompt({
        type: 'password',
        name: 'apiKey',
        message: `Enter your ${provider.toUpperCase()} API key:`,
        validate: (input) => input.length > 0 ? true : 'API key is required'
      });

      config.providers[provider as keyof typeof config.providers] = {
        apiKey,
        models: [] // Start with empty models array
      };
    }

    // Set default model - show all available models from both providers
    const allModels = [
      ...AVAILABLE_MODELS.openai.map(model => ({
        provider: 'openai',
        ...model
      })),
      ...AVAILABLE_MODELS.anthropic.map(model => ({
        provider: 'anthropic',
        ...model
      }))
    ];

    const { defaultModel } = await inquirer.prompt({
      type: 'list',
      name: 'defaultModel',
      message: 'Select your default model:',
      choices: allModels.map(m => ({
        name: `${m.name} [${m.provider}]`,
        value: m.modelName
      })),
      default: existingConfig?.defaultModel || 'gpt-4'
    });

    config.defaultModel = defaultModel;

    // Save config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(chalk.green('\n✓ Perkins initialized successfully!'));
    console.log(chalk.gray(`Configuration saved to ${configPath}`));
    console.log(chalk.blueBright(`Default model set to: ${allModels.find(m => m.modelName === defaultModel)?.name || defaultModel}`));
    console.log(chalk.yellow('\nTip: Use `perkins models -a` to add additional models after initialization.'));
  });

export default program;
