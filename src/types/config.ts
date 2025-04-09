
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

export { PerkinsConfig, ProviderConfig };
