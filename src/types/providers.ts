import { ChatMessage } from "./messages";

// Abstract AI Provider interface
interface AIProvider {
  name: string;
  generateResponse(messages: ChatMessage[]): Promise<string>;
}

export { AIProvider };
