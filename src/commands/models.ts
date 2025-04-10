import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PerkinsConfig } from "../types";
import { AVAILABLE_MODELS, ModelInfo } from "../constants/models";

program
  .command('models')
  .description('List and manage AI models')
  .option('-a, --add', 'Add a new model')
  .option('-d, --delete', 'Delete a model')
  .option('-s, --set-default', 'Set default model')
  .action(async (options) => {
    // Load config
    const configDir = path.join(os.homedir(), '.perkins');
    const configPath = path.join(configDir, 'config.json');

    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('Perkins is not initialized. Run "perkins init" first.'));
      return;
    }

    const config: PerkinsConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Get all configured models
    const configuredModels = Object.entries(config.providers)
      .flatMap(([provider, providerConfig]) =>
        providerConfig?.models.map(model => ({
          provider,
          modelName: model,
          name: AVAILABLE_MODELS[provider as keyof typeof AVAILABLE_MODELS].find(m => m.modelName === model)?.name || model,
          isDefault: model === config.defaultModel
        })) || []);

    if (options.add) {
      // Determine which provider to add model to
      const providers = Object.keys(config.providers);
      if (providers.length === 0) {
        console.log(chalk.red('No providers configured. Run "perkins init" first.'));
        return;
      }

      let selectedProvider: string;
      if (providers.length === 1) {
        selectedProvider = providers[0];
      } else {
        const { provider } = await inquirer.prompt([
          {
            type: 'list',
            name: 'provider',
            message: 'Select provider to add model for:',
            choices: providers
          }
        ]);
        selectedProvider = provider;
      }

      // Get available models that aren't already configured
      const existingModels = config.providers[selectedProvider as keyof typeof config.providers]?.models || [];
      const availableModels = AVAILABLE_MODELS[selectedProvider as keyof typeof AVAILABLE_MODELS]
        .filter(model => !existingModels.includes(model.modelName));

      if (availableModels.length === 0) {
        console.log(chalk.yellow('All known models for this provider are already configured.'));

        // Allow custom model input
        const { customModel } = await inquirer.prompt([
          {
            type: 'input',
            name: 'customModel',
            message: 'Enter custom model name (or leave empty to cancel):',
          }
        ]);

        if (customModel) {
          existingModels.push(customModel);
          config.providers[selectedProvider as keyof typeof config.providers]!.models = existingModels;
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          console.log(chalk.green(`Added custom model: ${customModel}`));
        }
        return;
      }

      // Select model to add
      const { modelToAdd } = await inquirer.prompt([
        {
          type: 'list',
          name: 'modelToAdd',
          message: 'Select model to add:',
          choices: [
            ...availableModels.map(model => ({
              name: model.name,
              value: model.modelName
            })),
            new inquirer.Separator(),
            { name: '-- Enter custom model --', value: 'custom' }
          ]
        }
      ]);

      let finalModel = modelToAdd;
      if (modelToAdd === '-- Enter custom model --') {
        const { customModel } = await inquirer.prompt([
          {
            type: 'input',
            name: 'customModel',
            message: 'Enter custom model name:',
            validate: (input) => input.length > 0 ? true : 'Model name is required'
          }
        ]);
        finalModel = customModel;
      }

      // Add the model
      existingModels.push(finalModel);
      config.providers[selectedProvider as keyof typeof config.providers]!.models = existingModels;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.green(`Added model: ${finalModel}`));

    } else if (options.delete) {
      // List all models and let user select one to delete
      if (configuredModels.length === 0) {
        console.log(chalk.yellow('No models configured.'));
        return;
      }

      const { modelToDelete } = await inquirer.prompt([
        {
          type: 'list',
          name: 'modelToDelete',
          message: 'Select model to delete:',
          choices: configuredModels.map(m => ({
            name: `${m.name}${m.isDefault ? ' (default)' : ''} [${m.provider}]`,
            value: m
          }))
        }
      ]);

      // Prevent deleting the default model
      if (modelToDelete.isDefault) {
        console.log(chalk.red('Cannot delete the default model. Set a new default first.'));
        return;
      }

      // Remove the model
      const provider = modelToDelete.provider;
      const providerModels = config.providers[provider as keyof typeof config.providers]?.models || [];
      const updatedModels = providerModels.filter(m => m !== modelToDelete.modelName);

      config.providers[provider as keyof typeof config.providers]!.models = updatedModels;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.green(`Deleted model: ${modelToDelete.name}`));

    } else if (options.setDefault) {
      // List all models and let user select a new default
      if (configuredModels.length === 0) {
        console.log(chalk.yellow('No models configured.'));
        return;
      }

      const { newDefault } = await inquirer.prompt([
        {
          type: 'list',
          name: 'newDefault',
          message: 'Select new default model:',
          choices: configuredModels.map(m => ({
            name: `${m.name}${m.isDefault ? ' (current default)' : ''} [${m.provider}]`,
            value: m.modelName
          })),
          default: config.defaultModel
        }
      ]);

      // Set new default
      config.defaultModel = newDefault;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.green(`Default model set to: ${newDefault}`));

    } else {
      // Just list all models
      console.log(chalk.blueBright('Configured models:'));
      if (configuredModels.length === 0) {
        console.log(chalk.yellow('No models configured.'));
      } else {
        Object.entries(config.providers).forEach(([provider, providerConfig]) => {
          if (providerConfig && providerConfig.models.length > 0) {
            console.log(chalk.blueBright(`\n${provider.toUpperCase()}:`));
            providerConfig.models.forEach(model => {
              const modelInfo = AVAILABLE_MODELS[provider as keyof typeof AVAILABLE_MODELS].find(m => m.modelName === model);
              const modelName = modelInfo ? modelInfo.name : model;
              const isDefault = model === config.defaultModel;
              console.log(`  ${chalk.green('•')} ${modelName}${isDefault ? chalk.yellow(' (default)') : ''}`);
            });
          }
        });
      }
    }
  });

export default program;
