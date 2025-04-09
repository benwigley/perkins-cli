
// Define a history interface for chat messages
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export { ChatMessage };
