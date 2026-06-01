import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

class AIService {
  /**
   * Generates a structured list of tasks from a prompt using Gemini.
   *
   * @param {string} prompt - The high-level goal (e.g., "Build a landing page")
   * @returns {Promise<Array>} Array of parsed task objects
   */
  async generateTasks(prompt) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('placeholder')) {
      throw new Error('Gemini API key is missing or invalid. Please configure GEMINI_API_KEY in .env.');
    }

    const systemPrompt = `You are an expert product manager and technical lead.
The user will provide a high-level goal or feature description.
Your job is to break this goal down into a logical set of sub-tasks.

Return a JSON object with a single key "tasks" which is an array of objects.
Each task object MUST have the following structure:
{
  "title": "Short, actionable title",
  "description": "Detailed description of what needs to be done",
  "priority": "low", "medium", "high", or "critical"
}

Do not include any other text or explanation. Only return the JSON object.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.7,
        }
      });

      const content = response.text;
      try {
        const parsed = JSON.parse(content);
        return parsed.tasks || [];
      } catch (err) {
        console.error('Failed to parse AI response:', content);
        throw new Error('AI returned invalid format.');
      }
    } catch (error) {
      console.warn('Gemini API call failed. Returning fallback mock tasks. Error:', error.message);
      
      // Fallback response so the user can test the feature even if it fails
      return [
        {
          title: `[AI Fallback] Plan: ${prompt.substring(0, 30)}...`,
          description: `Analyze requirements and create a technical spec for: ${prompt}`,
          priority: 'high'
        },
        {
          title: '[AI Fallback] Design UI/UX',
          description: 'Create wireframes and mockups based on the technical spec.',
          priority: 'medium'
        },
        {
          title: '[AI Fallback] Implement core logic',
          description: 'Write the code for the main functionality.',
          priority: 'high'
        },
        {
          title: '[AI Fallback] Testing & QA',
          description: 'Ensure everything works correctly and fix any bugs.',
          priority: 'low'
        }
      ];
    }
  }
}

export default new AIService();
