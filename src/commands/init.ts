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
    console.log(chalk.blue('Initializing Perkins AI coding assistant...'));

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

      // Let user select which models to enable
      const { selectedModels } = await inquirer.prompt({
        type: 'checkbox',
        name: 'selectedModels',
        message: `Select which ${provider.toUpperCase()} models you want to use:`,
        choices: AVAILABLE_MODELS[provider as keyof typeof AVAILABLE_MODELS].map(model => ({
          name: model.name,
          value: model.modelName
        })),
        default: AVAILABLE_MODELS[provider as keyof typeof AVAILABLE_MODELS].map(model => model.modelName),
        validate: (input) => input.length > 0 ? true : 'Please select at least one model'
      });

      config.providers[provider as keyof typeof config.providers] = {
        apiKey,
        models: selectedModels
      };
    }

    // Set default model
    const configuredModels = Object.entries(config.providers)
      .flatMap(([provider, providerConfig]) =>
        providerConfig?.models.map(model => ({
          provider,
          modelName: model,
          name: AVAILABLE_MODELS[provider as keyof typeof AVAILABLE_MODELS].find(m => m.modelName === model)?.name || model,
          isDefault: model === config.defaultModel
        })) || []);

    // Set default to the first available model
    const defaultModelValue = configuredModels.length > 0 ? configuredModels[0]?.name : '';

    const { defaultModel } = await inquirer.prompt({
      type: 'list',
      name: 'defaultModel',
      message: 'Select your default model:',
      choices: configuredModels.map(m => ({
        name: `${m.name}${m.isDefault ? ' (current default)' : ''} [${m.provider}]`,
        value: m.modelName
      })),
      default: defaultModelValue
    });

    config.defaultModel = defaultModel;

    // Save config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(chalk.green('\n✓ Perkins initialized successfully!'));
    console.log(chalk.gray(`Configuration saved to ${configPath}`));

    // Find the human-readable name for the default model
    const defaultModelInfo = Object.entries(AVAILABLE_MODELS)
      .flatMap(([_, models]) => models)
      .find(model => model.modelName === config.defaultModel);

    console.log(chalk.blue(`Default model set to: ${defaultModelInfo?.name || config.defaultModel}`));
  });

export default program;
