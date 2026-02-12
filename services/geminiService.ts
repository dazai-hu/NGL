
import { GoogleGenAI, Type } from "@google/genai";
import { MessageTheme } from "../types";

/**
 * Safely retrieves the API key. 
 * In production bundles, process.env might not be available directly in the browser 
 * unless explicitly injected, so we check multiple locations.
 */
const getApiKey = () => {
  try {
    // @ts-ignore
    return process.env.API_KEY || (window as any).API_KEY || '';
  } catch {
    return '';
  }
};

export const generateNGLMessages = async (theme: MessageTheme, count: number = 5): Promise<string[]> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn("Gemini API Key not found. Ensure API_KEY is set in environment variables.");
    return ["Configuration error: API Key missing."];
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `You are a creative Hinglish content creator focusing on anonymous messages for NGL.link. 
Your goal is to write messages that are unique, human-like, and fit specific archetypes.

GENDER NEUTRALITY RULE:
- NEVER use "bhai", "bro", "behen", "dude", "girl", "guy".
- Use: "yaar", "dost", "partner", "someone", "koi".

VARIETY RULE:
- These messages are for DIFFERENT people. They should not sound like a conversation thread.
- Each must be an independent "hook" or "thought".
- Vary sentence structure: some short, some slightly longer, some questions, some statements.

Style: Mostly lowercase, casual Hinglish (Hindi in English script), 1-2 emojis max.

Theme Guidelines:
- Hinglish Roast: Playful trolling. "itna confidence kahan se laate ho? 😂"
- Sweet Flirt: Low-key charm. "tumhari vibe kaafi alag h sabse ✨"
- Hinglish Comedy: Relatable Desi humor. "nashte me kya khaya jo itne chill ho? 💀"
- Pure Love: Wholesome. "hamesha khush raha karo yaar 🫂"
- Dark Flirt: Edgy/Smooth. "tumhe dekh ke focus hi nahi hota 🚩"
- Dry Sarcasm: Witty. "waah, kya logic h tumhara 💯"
- Mysterious/Deep: Intriguing. "kuch toh baat h jo tum batate nahi ho 🌑"
- Gen-Z Slang: Peak brainrot/current trends. "ye vibe toh ekdum rizzler level h fr fr 💀🔥"
- Desi Motivation: Wholesome push. "keep going, tum sahi kar rahe ho everything 🚀"

Return a JSON array of strings.`;

  const prompt = `Theme: ${theme}. Generate ${count} DISTINCT, non-repetitive anonymous messages. 
Ensure they are gender-neutral and sound like completely different people sent them. 
No "bro/bhai/behen". Mix up the length and tone within the theme.`;

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
    console.error("Gemini Generation Error:", error);
    return [];
  }
};
