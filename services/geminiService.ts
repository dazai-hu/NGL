import { GoogleGenAI, Type } from "@google/genai";
import { MessageTheme } from "../types";

export const generateNGLMessages = async (theme: MessageTheme, count: number = 5): Promise<string[]> => {
  let apiKey = "";
  try {
    // @ts-ignore
    apiKey = process.env.API_KEY || "";
  } catch (e) {
    console.warn("API Key injection failed.");
  }
  
  if (!apiKey || apiKey === "$API_KEY" || apiKey.startsWith("$")) {
    console.error("CONFIGURATION ERROR: Gemini API Key is missing. Add API_KEY to your environment variables.");
    return ["System Error: API Configuration Incomplete"];
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `You are a high-level creative Hinglish copywriter specializing in "Refined Anonymous Messaging" for NGL.link.
Your objective: Generate messages that feel authentic, human, and impossible to ignore.

REFINEMENT RULES:
1. GENDER NEUTRALITY: Use neutral Hinglish. No "bhai", "behen", "bro", "didi". Use "yaar", "someone", "dost", or directly state the thought.
2. INTELLIGENT EMOJIS: Add 1-2 emojis that match the context perfectly. Do not spam them. Place them at the end or mid-sentence for natural flow.
3. CASUAL VIBE: Use modern Hinglish (e.g., 'pata nahi', 'kuch toh', 'sahi hai'). Use lowercase for a more "genuinely anonymous" look.
4. VARIETY: Each message must be a completely different thought. No repetitive patterns.

Theme Contexts:
- Roast: 🤡 Savage trolling but keeping it classy.
- Flirty: 🫠 Charming, low-key, sweet.
- Funny: 😂 Relatable Desi/Gen-Z observations.
- Slang: 💀 Brainrot terms like 'delulu', 'cooked', 'vibing'.
- Mystery: 🕵️‍♂️ Deep, intriguing, one-liners.

OUTPUT: Return a JSON array of strings ONLY. Each string is a single message.`;

  const prompt = `Generate ${count} refined, high-quality Hinglish messages for the archetype: ${theme}. 
Ensure they include appropriate emojis and follow the casual lowercase rule.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        temperature: 1.0, 
      },
    });

    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error("Wave Engine Generation Error:", error);
    return ["Generation cycle failed. Check system logs."];
  }
};