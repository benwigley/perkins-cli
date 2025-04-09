import OpenAI from "openai";
import { program } from 'commander';
import inquirer, { type DistinctQuestion } from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Define a history interface for chat messages
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

program
  .command('chat')
  .description('Start an interactive chat session with Perkins')
  .option('-m, --model <model>', 'Specify which AI model to use')
  .option('-s, --session <name>', 'Continue a named session')
  .action(async (options) => {
    console.log(chalk.blue('Starting chat with Perkins AI coding assistant...'));
    console.log(chalk.gray('Type "exit" or press Ctrl+C to end the session\n'));

    // Load config
    const configDir = path.join(os.homedir(), '.perkins');
    const configPath = path.join(configDir, 'config.json');

    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('Perkins is not initialized. Run "perkins init" first.'));
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

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

    // Use specified model or default from config
    const modelName = options.model || config.modelName;
    console.log(chalk.gray(`Using model: ${modelName}`));

    // Initialize AI client
    const ai = new OpenAI({ apiKey: config.apiKey });

    // Add system message to provide context
    const systemMessage = {
      role: 'system',
      content: 'You are Perkins, an AI coding assistant. Help the user with programming tasks, explain code, suggest improvements, and solve coding problems.'
    };

    // Chat loop
    const questions: DistinctQuestion[] = [
      {
        type: 'input',
        name: 'userInput',
        message: chalk.blue('You:'),
        // prefix: '',
      }
    ];
    let chatActive = true;
    while (chatActive) {
      const { userInput } = await inquirer.prompt(questions);

      // Check for exit command
      if (userInput.toLowerCase() === 'exit') {
        chatActive = false;
        console.log(chalk.blue('\nEnding chat session. Goodbye!'));

        // Save session if specified
        if (options.session) {
          fs.writeFileSync(sessionPath, JSON.stringify(history, null, 2));
          console.log(chalk.gray(`Session saved as "${sessionName}"`));
        }

        break;
      }

      // Add user message to history
      history.push({
        role: 'user',
        content: userInput
      });

      // Show spinner while waiting for AI response
      const spinner = ora('Perkins is thinking...').start();

      try {
        const response = await ai.responses.create({
          model: modelName,
          input: [
            { role: "user", content: userInput },
          ],
          // stream: true,
        });

        // for await (const event of stream) {
        //   console.log(event);
        // }

        spinner.stop();

        // Add assistant response to history
        history.push({
          role: 'assistant',
          content: response.output_text
        });

        // Display response
        console.log(chalk.green('Perkins:'));
        console.log(response.output_text);
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
