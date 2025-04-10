import { program } from 'commander';
import inquirer, { type DistinctQuestion } from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PerkinsConfig, ChatMessage, AIProvider } from "../types";
import { createAIProvider } from "../services/ai-service";


program
  .command('chat')
  .description('Start an interactive chat session with Perkins')
  .option('-m, --model <model>', 'Specify which AI model to use')
  .option('-s, --session <name>', 'Continue a named session')
  .action(async (options) => {
    console.log(chalk.blueBright('Starting chat with Perkins AI coding assistant...'));
    console.log(chalk.gray('Type "exit" or press Ctrl+C to end the session\n'));

    // Load config
    const configDir = path.join(os.homedir(), '.perkins');
    const configPath = path.join(configDir, 'config.json');

    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('Perkins is not initialized. Run "perkins init" first.'));
      return;
    }

    const config: PerkinsConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Set up session and history
    const sessionsDir = path.join(configDir, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }

    const sessionName = options.session || 'default';
    const sessionPath = path.join(sessionsDir, `${sessionName}.json`);

    // Initialize or load chat history
    let history: ChatMessage[] = [];
    if (options.session && fs.existsSync(sessionPath)) {
      try {
        history = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
        console.log(chalk.green(`Loaded session "${sessionName}" with ${history.length} messages`));

        // Show the last few messages for context
        const lastMessages = history.slice(-4);
        if (lastMessages.length > 0) {
          console.log(chalk.gray('\n=== Previous messages ==='));
          lastMessages.forEach(msg => {
            if (msg.role === 'system') return;
            const prefix = msg.role === 'user' ? chalk.blue('You: ') : chalk.green('Perkins: ');
            console.log(`${prefix}${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
          });
          console.log(chalk.gray('=== End of previous messages ===\n'));
        }
      } catch (error: any) {
        console.log(chalk.yellow(`Error loading session, starting fresh: ${error.message}`));
        history = [];
      }
    }

    // If no model specified, let user choose from available models
    let modelName = options.model || config.defaultModel;

    if (!options.model) {
      // Gather all available models from config
      const allModels = Object.entries(config.providers)
        .flatMap(([provider, providerConfig]) => providerConfig?.models || []);

      if (allModels.length > 1) {
        const { selectedModel } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedModel',
            message: 'Select AI model to use:',
            choices: allModels,
            default: config.defaultModel
          }
        ]);

        modelName = selectedModel;
      }
    }

    console.log(chalk.gray(`Using model: ${modelName}`));

    // Create AI provider based on selected model
    let aiProvider: AIProvider;
    try {
      aiProvider = createAIProvider(modelName, config);
      console.log(chalk.gray(`Provider: ${aiProvider.name}`));
    } catch (error: any) {
      console.log(chalk.red(error.message));
      return;
    }

    // Add system message to provide context if not present
    if (!history.some(msg => msg.role === 'system')) {
      history.unshift({
        role: 'system',
        content: 'You are Perkins, an AI coding assistant. Help the user with programming tasks, explain code, suggest improvements, and solve coding problems.'
      });
    }

    // Chat loop
    const questions: DistinctQuestion[] = [
      {
        type: 'input',
        name: 'userInput',
        message: chalk.blue('You:'),
      }
    ];

    let chatActive = true;
    while (chatActive) {
      const { userInput } = await inquirer.prompt(questions);

      // Skip empty inputs
      if (!userInput.trim()) {
        continue;
      }

      // Check for exit command
      if (userInput.toLowerCase() === 'exit') {
        chatActive = false;
        console.log(chalk.blueBright('\nEnding chat session. Goodbye!'));

        // Save session if specified
        if (options.session) {
          fs.writeFileSync(sessionPath, JSON.stringify(history, null, 2));
          console.log(chalk.gray(`Session saved as "${sessionName}"`));
        }

        break;
      }

      // Check for model switching command
      if (userInput.toLowerCase().startsWith('/model ')) {
        const requestedModel = userInput.substring(7).trim();

        // Find all available models
        const allModels = Object.entries(config.providers)
          .flatMap(([provider, providerConfig]) => providerConfig?.models || []);

        if (allModels.includes(requestedModel)) {
          try {
            aiProvider = createAIProvider(requestedModel, config);
            modelName = requestedModel;
            console.log(chalk.green(`Switched to model: ${modelName} (${aiProvider.name})`));
          } catch (error: any) {
            console.log(chalk.red(error.message));
          }
          continue;
        } else {
          console.log(chalk.yellow(`Model "${requestedModel}" not available. Available models:`));
          allModels.forEach(model => console.log(chalk.gray(`- ${model}`)));
          continue;
        }
      }

      // Add user message to history
      history.push({
        role: 'user',
        content: userInput
      });

      // Show spinner while waiting for AI response
      const spinner = ora('Perkins is thinking...').start();

      try {
        const response = await aiProvider.generateResponse(history);
        spinner.stop();

        // Add assistant response to history
        history.push({
          role: 'assistant',
          content: response
        });

        // Display response
        console.log(chalk.green('Perkins:'));
        console.log(response);
        console.log(); // Empty line for readability

        // Save history after each interaction if session is specified
        if (options.session) {
          fs.writeFileSync(sessionPath, JSON.stringify(history, null, 2));
        }
      } catch (error: any) {
        spinner.fail('Error getting response');
        console.error(chalk.red('Error:'), error.message);
      }
    }
  });

export default program;
