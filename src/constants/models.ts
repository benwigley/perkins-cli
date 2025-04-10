interface ModelInfo {
  name: string;
  modelName: string;
}

const AVAILABLE_MODELS: Record<string, ModelInfo[]> = {
  openai: [
    { name: 'GPT-4 Turbo', modelName: 'gpt-4-turbo' },
    { name: 'GPT-4', modelName: 'gpt-4' },
    { name: 'GPT-3.5 Turbo', modelName: 'gpt-3.5-turbo' }
  ],
  anthropic: [
    { name: 'Claude 3.7 Sonnet', modelName: 'claude-3-7-sonnet-latest' },
    { name: 'Claude 3.5 Sonnet', modelName: 'claude-3-5-sonnet-latest' },
    { name: 'Claude 3 Opus', modelName: 'claude-3-opus-latest' },
    { name: 'Claude 3.5 Haiku', modelName: 'claude-3-5-haiku-latest' }
  ]
};

export { AVAILABLE_MODELS, ModelInfo };
