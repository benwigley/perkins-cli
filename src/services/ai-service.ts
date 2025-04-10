import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { AIProvider, ChatMessage, PerkinsConfig } from "../types";

// OpenAI implementation using Langchain
class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  private model: ChatOpenAI;

  constructor(apiKey: string, modelName: string) {
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: modelName,
      temperature: 0.7,
    });
  }

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    const langchainMessages = messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        default:
          throw new Error(`Unknown message role: ${msg.role}`);
      }
    });

    const response = await this.model.invoke(langchainMessages);
    return response.content.toString();
  }
}

// Anthropic implementation using Langchain
class AnthropicProvider implements AIProvider {
  name = "Anthropic";
  private model: ChatAnthropic;

  constructor(apiKey: string, modelName: string) {
    this.model = new ChatAnthropic({
      anthropicApiKey: apiKey,
      modelName: modelName,
      temperature: 0.7,
    });
  }

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    const langchainMessages = messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        default:
          throw new Error(`Unknown message role: ${msg.role}`);
      }
    });

    const response = await this.model.invoke(langchainMessages);
    return response.content.toString();
  }
}

// Factory function to create the appropriate provider
function createAIProvider(model: string, config: PerkinsConfig): AIProvider {
  if (model.startsWith('gpt-')) {
    if (!config.providers.openai) {
      throw new Error('OpenAI configuration not found. Run "perkins init" to set up.');
    }
    return new OpenAIProvider(config.providers.openai.apiKey, model);
  } else if (model.startsWith('claude-')) {
    if (!config.providers.anthropic) {
      throw new Error('Anthropic configuration not found. Run "perkins init" to set up.');
    }
    return new AnthropicProvider(config.providers.anthropic.apiKey, model);
  }

  throw new Error(`Unsupported model: ${model}`);
}

export { createAIProvider };
