import CONFIG from "../../src/config/settings";
import { MarketAnalysis, MarketMetrics } from "../../src/services/blockchain/types.js";
import { elizaLogger } from "@ai16z/eliza";
import Groq from "groq-sdk";

interface AIServiceConfig {
  groqApiKey: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
}

interface GenerateResponseParams {
  content: string;
  author: string;
  platform: string;
  messageId: string;
}

interface MarketContext {
  tokens: any[];
  timestamp: number;
  isAlert?: boolean;
}

interface MarketData extends MarketMetrics {
  priceChange24h: number;
  momentum: number; // Add missing properties
  strength: number; // Add missing properties
}

export class AIService {
  private groq: Groq;

  constructor(config: AIServiceConfig) {
    this.groq = new Groq({
      apiKey: config.groqApiKey
    });   
  }

  getMarketMetrics() {
    throw new Error('Method not implemented.');
  }


  async generateName(): Promise<string> {
    try {
      const prompt = `
        Generate a creative and memorable name for a new cryptocurrency token.
        The name should be:
        - Unique and catchy
        - Easy to remember
        - Not similar to existing major tokens
        - Maximum 15 characters
        
        Provide just the name, no explanation.
      `;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'mixtral-8x7b-32768',
        temperature: 0.9,
      });

      return completion.choices[0]?.message?.content?.trim() || "TokenName";
    } catch (error) {
      elizaLogger.error('Error generating name:', error);
      return "TokenName";
    }
  }

  async generateNarrative(template: any): Promise<string> {
    try {
      const prompt = `
        Create a compelling narrative for a cryptocurrency token with the following attributes:
        Name: ${template.name}
        Type: ${template.type}
        Key Features: ${template.features?.join(', ')}
        
        Generate a concise, engaging description that highlights unique value propositions
        and use cases. Keep it under 280 characters for Twitter compatibility.
      `;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'mixtral-8x7b-32768',
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content?.trim() || "";
    } catch (error) {
      elizaLogger.error('Error generating narrative:', error);
      return "";
    }
  }

  async analyzeMarket(tokenAddress: string): Promise<MarketAnalysis> {
    try {
      const marketData = await this.fetchMarketData(tokenAddress);
      
      const prompt = `
        Analyze the following market data and provide a detailed assessment:
        Price: ${marketData.price}
        24h Change: ${marketData.priceChange24h}%
        Volume: ${marketData.volume24h}
        Market Cap: ${marketData.marketCap}

        Consider:
        1. Price action and volatility
        2. Volume patterns
        3. Risk factors

        Format the response as JSON with the following structure:
        {
          "confidence": 0-1,
          "shouldTrade": boolean,
          "action": "BUY/SELL/HOLD",
          "reasons": ["reason1", "reason2"],
          "riskLevel": "LOW/MEDIUM/HIGH",
          "metrics": {
            "volatility": number,
            "momentum": number,
            "strength": number
          }
        }
      `;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'mixtral-8x7b-32768',
        temperature: 0.3,
      });

      const analysis = JSON.parse(completion.choices[0]?.message?.content || "{}");
      
      return {
        summary: "Market analysis summary",
        keyPoints: [],
        recommendation: null,
        confidence: analysis.confidence || 0.5,
        shouldTrade: analysis.shouldTrade || false,
        action: analysis.action || "HOLD",
        reasons: analysis.reasons || [],
        riskLevel: analysis.riskLevel || "MEDIUM",
        metrics: {
          price: marketData.price,
          volume24h: marketData.volume24h,
          marketCap: marketData.marketCap,
          volatility: analysis.metrics?.volatility || 0,
          momentum: analysis.metrics?.momentum || 0,
          strength: analysis.metrics?.strength || 0,
          confidence: analysis.metrics?.confidence || 0,
          onChainData: analysis.metrics?.onChainData || {}
        }
      };
    } catch (error) {
      elizaLogger.error('Error analyzing market:', error);
      return {
        summary: "Error analyzing market",
        keyPoints: [],
        recommendation: null,
        confidence: 0,
        shouldTrade: false,
        action: "HOLD",
        reasons: ["Error analyzing market"],
        riskLevel: "HIGH",
        metrics: {
          price: 0,
          volume24h: 0,
          marketCap: 0,
          volatility: 0,
          momentum: 0,
          strength: 0,
          confidence: 0,
          onChainData: {}
        }
      };
    }
  }

  async generateResponse(params: GenerateResponseParams): Promise<string> {
    try {
      const prompt = `
        Generate a response for the following content on ${params.platform}:
        "${params.content}"

        Author: ${params.author}
        Context: Cryptocurrency and trading discussion
        
        Requirements:
        - Professional and knowledgeable tone
        - Include relevant market insights if applicable
        - Keep it concise and engaging
        - Avoid sensitive topics
        - Match the platform's style (${params.platform})
      `;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'mixtral-8x7b-32768',
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content?.trim() || "Generated Response";
    } catch (error) {
      elizaLogger.error('Error generating response:', error);
      return "";
    }
  }


  private generateFallbackUpdate(tokens: any[]): string {
    const updates = tokens.map(token => 
      `${token.symbol}: $${token.price.toFixed(3)} (${token.priceChange24h.toFixed(2)}%)`
    ).join('\n');
    
    return `Market Update 📊\n${updates}`;
  }

  shouldEngageWithContent(content: string): boolean {
    // Check for engagement criteria
    const engagementTriggers = [
      'token',
      'crypto',
      'blockchain',
      'defi',
      'market',
      'trading'
    ];

    return engagementTriggers.some(trigger => 
      content.toLowerCase().includes(trigger)
    );
  }


  private async fetchMarketData(tokenAddress: string): Promise<MarketData> {
    // Implement market data fetching logic
    // This should be replaced with actual market data API calls
    return {
      price: 0,
      priceChange24h: 0,
      volume24h: 0,
      marketCap: 0,
      volatility: 0,
      momentum: 0, // Ensure these properties are included
      strength: 0, // Ensure these properties are included
      confidence: 0,
      onChainData: {}
    };
  }
}

// Export singleton instance
export const aiService = new AIService({
  groqApiKey: CONFIG.AI.GROQ.API_KEY,
  defaultModel: CONFIG.AI.GROQ.MODEL,
  maxTokens: CONFIG.AI.GROQ.MAX_TOKENS,
  temperature: CONFIG.AI.GROQ.DEFAULT_TEMPERATURE
});

export default aiService;