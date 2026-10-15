import { GoogleGenAI } from "@google/genai";

// Initialize safe access to the API key
const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const geminiService = {
  generateText: async (topic: string = 'general knowledge'): Promise<string> => {
    if (!ai) {
      console.warn("Gemini API Key missing, returning fallback text.");
      return "The API key is missing so this is a fallback text. Typing is a skill that improves with practice.";
    }

    try {
      const model = 'gemini-2.5-flash';
      const prompt = `Generate a single paragraph of plain text (no markdown, no newlines, just sentences) for a typing test. The topic is: ${topic}. Length: approximately 40-50 words. Make it interesting and factually correct.`;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });

      const text = response.text?.trim();
      
      // Basic cleanup to ensure it's typing-friendly
      return text ? text.replace(/\n/g, ' ').replace(/\s+/g, ' ') : "Failed to generate text.";
    } catch (error) {
      console.error("Gemini generation error:", error);
      return "Error generating text. Please try again or check your connection.";
    }
  }
};