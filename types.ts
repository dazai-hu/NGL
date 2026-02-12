
export enum MessageTheme {
  AUTO = 'Auto-Pilot (Gemini Decides)',
  ROAST = 'Hinglish Roast',
  FLIRTY = 'Sweet Flirt',
  FUNNY = 'Hinglish Comedy',
  LOVING = 'Pure Love',
  DARK_FLIRT = 'Dark Flirt (Limited)',
  SARCASM = 'Dry Sarcasm',
  MYSTERY = 'Mysterious/Deep',
  GEN_Z = 'Gen-Z Slang (Peak Brainrot)',
  MOTIVATIONAL = 'Desi Motivation'
}

export interface GeneratedMessage {
  id: string;
  text: string;
  targetUser: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  timestamp: Date;
  error?: string;
}
