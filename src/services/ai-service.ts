import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, ChatMessage, PerkinsConfig } from "../types";


// OpenAI implementation
class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages,
    });

    return response.choices[0].message.content || '';
  }
}

// Anthropic implementation
class AnthropicProvider implements AIProvider {
  name = "Anthropic";
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    // Extract system message if present
    const systemMessage = messages.find(msg => msg.role === 'system')?.content;

    // Filter out the system message for the regular messages array
    const chatMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'assistant' | 'user', // Type assertion
        content: msg.content
      }));

    const msg: Anthropic.Message = await this.client.messages.create({
      model: this.model,
      messages: chatMessages,
      system: systemMessage, // Use the system parameter
      max_tokens: 4000,
    });

    return msg.content.toString() || '';
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
