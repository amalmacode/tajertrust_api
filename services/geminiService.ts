
import { GoogleGenAI } from "@google/genai";

const REPO_CONTEXT = `
Repository: https://github.com/amalmacode/tajertrust.git
Architecture: Node.js, Express, PostgreSQL, EJS, Passport (Session-based).
Goal: Create a Service Layer and parallel /api routes without breaking existing EJS routes.
Response Format: { success: true, data: {}, error: null }
`;

export class GeminiService {
  constructor() {
    // Note: GoogleGenAI instance is created right before each API call to ensure latest API key
  }

  async generateRefactoredCode(filePath: string, currentContent: string, layer: 'Service' | 'API_Route') {
    const prompt = `
      ${REPO_CONTEXT}
      Refactor the following code into a ${layer}. 
      If it is a Service, extract ONLY business logic (no req/res).
      If it is an API route, use the standard JSON response format.
      File Path: ${filePath}
      Current Content:
      \`\`\`javascript
      ${currentContent}
      \`\`\`
      Only return the refactored code block.
    `;

    try {
      // Re-instantiate to catch any new API key from aistudio dialog
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          temperature: 0.2,
          thinkingConfig: { thinkingBudget: 2000 }
        }
      });
      return response.text;
    } catch (error: any) {
      console.error("Gemini Error:", error);
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        return "QUOTA_EXCEEDED";
      }
      // Check for specific error message to prompt key re-selection
      if (error?.message?.includes('Requested entity was not found')) {
        return "KEY_NOT_FOUND";
      }
      return "// Error generating code refactor suggestions: " + (error?.message || "Unknown error");
    }
  }

  async askArchitectureQuestion(question: string) {
    const prompt = `
      ${REPO_CONTEXT}
      Developer Question: ${question}
      Provide a concise, expert response regarding the TajerTrust V1 API refactoring strategy.
    `;

    try {
      // Re-instantiate to catch any new API key from aistudio dialog
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Using gemini-3-pro-preview for complex reasoning tasks like architecture advice
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      return response.text;
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        return "QUOTA_EXCEEDED";
      }
      // Check for specific error message to prompt key re-selection
      if (error?.message?.includes('Requested entity was not found')) {
        return "KEY_NOT_FOUND";
      }
      return "Unable to get architectural advice right now.";
    }
  }
}
