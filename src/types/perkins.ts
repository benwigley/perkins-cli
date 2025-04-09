
// Define a history interface for chat messages
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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

// Abstract AI Provider interface
interface AIProvider {
  name: string;
  generateResponse(messages: ChatMessage[]): Promise<string>;
}

export { PerkinsConfig, ChatMessage, ProviderConfig, AIProvider };
