export type PricingEntry = {
  inputPer1M: number;
  outputPer1M: number;
  label: string;
};

const PRICING: Record<string, PricingEntry> = {
  "gpt-4o":                       { inputPer1M: 2.50,   outputPer1M: 10.00,  label: "GPT-4o" },
  "gpt-4o-mini":                  { inputPer1M: 0.15,   outputPer1M: 0.60,   label: "GPT-4o mini" },
  "gpt-4-turbo":                  { inputPer1M: 10.00,  outputPer1M: 30.00,  label: "GPT-4 Turbo" },
  "gpt-4":                        { inputPer1M: 30.00,  outputPer1M: 60.00,  label: "GPT-4" },
  "gpt-3.5-turbo":                { inputPer1M: 0.50,   outputPer1M: 1.50,   label: "GPT-3.5" },
  "o1":                           { inputPer1M: 15.00,  outputPer1M: 60.00,  label: "o1" },
  "o1-mini":                      { inputPer1M: 3.00,   outputPer1M: 12.00,  label: "o1-mini" },
  "o3":                           { inputPer1M: 10.00,  outputPer1M: 40.00,  label: "o3" },
  "o3-mini":                      { inputPer1M: 1.10,   outputPer1M: 4.40,   label: "o3-mini" },
  "o4-mini":                      { inputPer1M: 1.10,   outputPer1M: 4.40,   label: "o4-mini" },
  "claude-opus-4-5":              { inputPer1M: 15.00,  outputPer1M: 75.00,  label: "Claude Opus 4.5" },
  "claude-sonnet-4-5":            { inputPer1M: 3.00,   outputPer1M: 15.00,  label: "Claude Sonnet 4.5" },
  "claude-3-5-sonnet-20241022":   { inputPer1M: 3.00,   outputPer1M: 15.00,  label: "Claude 3.5 Sonnet" },
  "claude-3-5-haiku-20241022":    { inputPer1M: 0.80,   outputPer1M: 4.00,   label: "Claude 3.5 Haiku" },
  "claude-3-opus-20240229":       { inputPer1M: 15.00,  outputPer1M: 75.00,  label: "Claude 3 Opus" },
  "claude-3-7-sonnet-20250219":   { inputPer1M: 3.00,   outputPer1M: 15.00,  label: "Claude 3.7 Sonnet" },
  "gemini-2.5-pro":               { inputPer1M: 1.25,   outputPer1M: 5.00,   label: "Gemini 2.5 Pro" },
  "gemini-2.5-flash":             { inputPer1M: 0.075,  outputPer1M: 0.30,   label: "Gemini 2.5 Flash" },
  "gemini-2.0-flash":             { inputPer1M: 0.10,   outputPer1M: 0.40,   label: "Gemini 2.0 Flash" },
  "gemini-1.5-pro":               { inputPer1M: 1.25,   outputPer1M: 5.00,   label: "Gemini 1.5 Pro" },
  "llama-3.3-70b-instruct":       { inputPer1M: 0.59,   outputPer1M: 0.79,   label: "Llama 3.3 70B" },
  "llama-3.1-8b-instant":         { inputPer1M: 0.05,   outputPer1M: 0.08,   label: "Llama 3.1 8B" },
  "mixtral-8x7b-instruct":        { inputPer1M: 0.24,   outputPer1M: 0.24,   label: "Mixtral 8x7B" },
  "deepseek-r1":                  { inputPer1M: 0.55,   outputPer1M: 2.19,   label: "DeepSeek R1" },
  "deepseek-v3":                  { inputPer1M: 0.27,   outputPer1M: 1.10,   label: "DeepSeek V3" },
  "deepseek-chat":                { inputPer1M: 0.27,   outputPer1M: 1.10,   label: "DeepSeek Chat" },
  "mistral-large-latest":         { inputPer1M: 3.00,   outputPer1M: 9.00,   label: "Mistral Large" },
  "mistral-small-latest":         { inputPer1M: 0.20,   outputPer1M: 0.60,   label: "Mistral Small" },
  "codestral-latest":             { inputPer1M: 0.20,   outputPer1M: 0.60,   label: "Codestral" },
  "command-r-plus":               { inputPer1M: 2.50,   outputPer1M: 10.00,  label: "Command R+" },
  "command-r":                    { inputPer1M: 0.15,   outputPer1M: 0.60,   label: "Command R" },
};

const MODEL_NAME_MAP: Record<string, string> = {
  "CHAT-GPT Fast":       "gpt-4o-mini",
  "CHAT-GPT Thinking":   "gpt-4o",
  "CHAT-GPT Coder":      "gpt-4o",
  "CHAT-GPT Writer":     "gpt-4o",
  "CHAT-GPT Creative":   "gpt-4o",
  "CHAT-GPT Researcher": "gpt-4o",
  "CHAT-GPT Translator": "gpt-4o-mini",
  "CHAT-GPT Tutor":      "gpt-4o-mini",
  "CHAT-GPT Analyst":    "gpt-4o",
  "CHAT-GPT Marketer":   "gpt-4o-mini",
  "CHAT-GPT Strategist": "gpt-4o",
  "CHAT-GPT Math":       "gpt-4o",
  "CHAT-GPT Productivity":"gpt-4o-mini",
  "CHAT-GPT Storyteller":"gpt-4o",
  "CHAT-GPT Vision":     "gpt-4o",
};

export function getPricing(modelId: string, providerModel?: string): PricingEntry | null {
  const canonical = providerModel?.trim() || MODEL_NAME_MAP[modelId] || modelId.toLowerCase().trim();
  return PRICING[canonical] ?? null;
}

export function calcCost(inputTokens: number, outputTokens: number, pricing: PricingEntry): number {
  return (inputTokens / 1_000_000) * pricing.inputPer1M + (outputTokens / 1_000_000) * pricing.outputPer1M;
}

export function fmtCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.000001) return "<$0.000001";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

export function estimateMsgCost(
  inputText: string,
  outputText: string,
  modelId: string,
  providerModel?: string,
): { inputTok: number; outputTok: number; cost: number; costStr: string; hasPrice: boolean } {
  const inputTok = Math.ceil(inputText.length / 4);
  const outputTok = Math.ceil(outputText.length / 4);
  const pricing = getPricing(modelId, providerModel);
  if (!pricing) {
    return { inputTok, outputTok, cost: 0, costStr: "?", hasPrice: false };
  }
  const cost = calcCost(inputTok, outputTok, pricing);
  return { inputTok, outputTok, cost, costStr: fmtCost(cost), hasPrice: true };
}
