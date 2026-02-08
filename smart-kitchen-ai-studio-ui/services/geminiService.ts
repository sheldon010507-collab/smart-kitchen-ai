import { GoogleGenAI } from "@google/genai";

// Initialize the client
// NOTE: In a real environment, ensure process.env.API_KEY is set. 
// For this demo, we handle the case where it might be missing gracefully in the UI.
const apiKey = process.env.API_KEY || ''; 
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const generateChefResponse = async (userPrompt: string): Promise<string> => {
  if (!ai) {
    // Simulate response if no API key is present for demo purposes
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`I'm currently running in demo mode (no API key). If I were connected to Gemini, I would help you with: "${userPrompt}". I can suggest recipes, audit stock, or analyze wastage!`);
      }, 1000);
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: "You are a helpful and efficient AI Kitchen Assistant named 'Smart Kitchen AI'. You help professional chefs and kitchen managers with inventory, recipes, and cost reduction. Keep answers concise and professional.",
      }
    });
    return response.text || "I couldn't generate a response at the moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error connecting to the AI Chef service.";
  }
};
