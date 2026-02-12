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
  
  const systemInstruction = `You are an elite Hinglish copywriter specialized in NGL.link anonymous messaging.
Objective: Generate highly engaging, human-like, and culturally relevant messages in Hinglish (Hindi + English).

STRICT RULES:
1. GENDER NEUTRALITY: Never use "bhai", "bro", "behen", "didi", "girl", "guy". Use neutral terms like "yaar", "dost", or just direct address.
2. CASUAL STYLE: No formal grammar. Use all lowercase, creative spellings (e.g., 'kyu' instead of 'kyun'), and 1Relatable emoji.
3. UNIQUE HOOKS: Avoid clichés. Each message must be a distinct conversation starter.

Theme Archetypes:
- Roast: Savage but playful.
- Comedy: Relay relatable Desi struggles.
- Gen-Z: High energy brainrot slang (delulu, solulu, etc).
- Sarcasm: Sharp wit.
- Mystery: Deep or intriguing vibes.

OUTPUT: Return a JSON array of strings ONLY.`;

  const prompt = `Generate ${count} messages for the theme: ${theme}. 
Context: Hinglish casual style, lowercase, gender neutral. 
Ensure they sound like real people from Mumbai/Delhi/Bangalore sending an anonymous NGL.`;

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
        temperature: 0.9, 
      },
    });

    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error("Wave Engine Generation Error:", error);
    return ["Generation cycle failed. Retrying..."];
  }
};