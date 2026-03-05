
import { GoogleGenAI, Type } from "@google/genai";
import { Opportunity, MarketCategory } from "../types";

export class GeminiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
  }
}

const OPPORTUNITY_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Direct name of the listing, ticker, or Arbitrage Pair.' },
      category: { type: Type.STRING },
      predictedProfitPercent: { type: Type.NUMBER },
      riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
      profitPer1000: { type: Type.NUMBER },
      minInvestment: { type: Type.NUMBER },
      confidenceScore: { type: Type.NUMBER },
      sourceUrl: { type: Type.STRING, description: 'DIRECT URL to the buy-in side.' },
      sourceName: { type: Type.STRING },
      sentiment: { type: Type.STRING, enum: ['Bullish', 'Neutral', 'Bearish'] },
      trendReasoning: { type: Type.STRING, description: 'Explain the market logic in plain English. No jargon. Do not truncate.' },
      marketDataPoint: { type: Type.STRING },
      buyPrice: { type: Type.STRING, description: 'The suggested offer price to buy the item at. e.g. "$50"' },
      sellPrice: { type: Type.STRING, description: 'The suggested price to sell the item at. e.g. "$150"' },
      type: { type: Type.STRING, enum: ['IMMEDIATE_FLIP', 'STRATEGIC_ASSET', 'LOCAL_GEM'] },
      timeToProfit: { type: Type.STRING },
      strategyType: { type: Type.STRING, enum: ['Kit Builder', 'Repair/Restore', 'Niche Arbitrage', 'Volume Play', 'Asset Breakout', 'Cross-Exchange Arb', 'Inter-Asset Arb', 'Local Arbitrage'] },
      secretSauce: { type: Type.STRING, description: 'A clear, simple explanation of the "trick" or arbitrage gap. Complete sentences only.' },
      instructions: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: 'Complete, unabridged step-by-step actions. Do not use "..." or cut off text.'
      }
    },
    required: ['name', 'category', 'predictedProfitPercent', 'riskLevel', 'sourceUrl', 'instructions', 'strategyType', 'secretSauce', 'type', 'timeToProfit', 'trendReasoning', 'buyPrice', 'sellPrice']
  }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.code;
      
      if (status === 429 && i < maxRetries - 1) {
        // Aggressive backoff for free tier: 10s, 20s, 40s
        const backoffTime = Math.pow(2, i + 1) * 5000; 
        console.warn(`Rate limit hit (429). Retrying in ${backoffTime}ms...`);
        await sleep(backoffTime);
        continue;
      }
      throw new GeminiError(error?.message || "Unknown API Error", status);
    }
  }
  throw new GeminiError(lastError?.message || "Max retries exceeded", lastError?.status);
}

export async function findOpportunities(category: MarketCategory, locationContext: string | undefined, apiKey: string): Promise<Opportunity[]> {
  const effectiveKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!effectiveKey) {
    throw new GeminiError("API Key not provided.", 401);
  }
  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  // Gemini 2.5 Flash with Tools does not support JSON mode directly.
  // We must ask for JSON in the prompt and parse it manually.
  const prompt = `
    Act as a hyper-intelligent Arbitrage Hunter. Your job is to find UNCONVENTIONAL ways to make money right now in the ${category} sector.
    
    ${locationContext ? `USER LOCATION CONTEXT: The user is currently in or near ${locationContext}. FOCUS ON LOCAL LISTINGS WITHIN 50 MILES.` : ''}

    CRITICAL QUALITY RULE: 
    1. Do NOT use technical jargon.
    2. Do NOT abridge sentences. 
    3. Do NOT use ellipses (...). 
    4. Provide FULL, complete descriptions.
    5. Ensure the 'secretSauce' explains exactly why this is a "good deal" compared to normal market prices.
    6. You MUST provide a specific 'buyPrice' (what to pay) and 'sellPrice' (what to sell for).
    
    FOCUS AREAS:
    ${category === 'Local Listings' ? `
    - Target: Facebook Marketplace, Craigslist (Free Section), OfferUp, Freecycle, and Local Auction houses.
    - Look for: Curb alerts, "Moving out - everything must go", Estate sales, and mispriced collectibles.
    - Radius: Search within 50 miles of ${locationContext || 'major cities'}.
    - Instructions MUST include pick-up advice.
    ` : `
    - Crypto: Specific spreads between exchanges.
    - Precious Metals: Dealer price gaps or physical-to-digital arbitrage.
    - Creative Schemes: "Kit building" (pairing separate items) or "Dirty flips" (items needing simple cleaning).
    `}
    
    Every opportunity MUST have a direct URL to a real listing. Use Google Search to verify current prices from the last 12 hours.

    OUTPUT FORMAT:
    You must return a valid JSON array of objects. Do not wrap the JSON in markdown code blocks. Just return the raw JSON string.
    The JSON structure must match this schema:
    [
      {
        "name": "string",
        "category": "string",
        "predictedProfitPercent": number,
        "riskLevel": "Low" | "Medium" | "High",
        "profitPer1000": number,
        "minInvestment": number,
        "confidenceScore": number,
        "sourceUrl": "string",
        "sourceName": "string",
        "sentiment": "Bullish" | "Neutral" | "Bearish",
        "trendReasoning": "string",
        "marketDataPoint": "string",
        "buyPrice": "string",
        "sellPrice": "string",
        "type": "IMMEDIATE_FLIP" | "STRATEGIC_ASSET" | "LOCAL_GEM",
        "timeToProfit": "string",
        "strategyType": "string",
        "secretSauce": "string",
        "instructions": ["string"]
      }
    ]
  `;

  const response = await callWithRetry(() => ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      // responseMimeType and responseSchema are NOT supported with tools in this model version
    },
  }));

  try {
    let text = response.text || "[]";
    // Clean up markdown if the model adds it despite instructions
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const results = JSON.parse(text);
    return results.map((item: any, index: number) => ({
      ...item,
      id: `${category}-${index}-${Date.now()}`,
      lastUpdated: new Date().toISOString()
    }));
  } catch (error) {
    console.error(`Error parsing ${category} results:`, error);
    throw new GeminiError("Failed to parse AI response into valid arbitrage data.", 500);
  }
}
