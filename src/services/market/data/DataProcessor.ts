// services/market/data/DataProcessor.ts
import { HeliusService } from '../../blockchain/heliusIntegration.js';
import { JupiterPriceV2Service, JupiterService } from '../../blockchain/defi/JupiterPriceV2Service.js';
import { JupiterPriceV2 } from '../../blockchain/defi/jupiterPriceV2.js';
import Redis from 'ioredis';
import { elizaLogger } from "@ai16z/eliza";
import * as zlib from 'zlib';
import { promisify } from 'util';
import { PriceData } from '../../../types/market.js';
import { TokenProvider } from '../../../providers/token.js';
import { WalletProvider } from '../../../providers/wallet.js';
import { RedisService } from './RedisCache.js';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface MarketData {
  onChainActivity: { transactions: number; swaps: number; uniqueTraders: number; };
  topHolders: never[];
  price: number;
  volume24h: number;
  priceChange24h: number;
  volatility: number;
  marketCap?: number;
  holders?: {
    total: number;
    top: Array<{
      address: string;
      balance: number;
      percentage: number;
    }>;
  };
  lastUpdate: number;
}

export interface TokenMetrics {
  price: number;
  volume24h: number;
  priceChange24h: number;
  volatility: number;
}

export class MarketDataProcessor {
  private readonly redis: Redis;
  private readonly heliusService: HeliusService;
  private readonly jupiterService: JupiterPriceV2Service;
  private readonly jupiterV2: JupiterPriceV2;
  
  private readonly CACHE_PREFIX = 'market:';
  private readonly DEFAULT_CACHE_TTL = 60; // 1 minute
  private readonly ERROR_THRESHOLD = 5;
  private readonly CIRCUIT_TIMEOUT = 60000; // 1 minute

  private errorCount: number = 0;
  private circuitOpen: boolean = false;
  private lastError: number = 0;

  constructor(
    heliusApiKey: string,
    _jupiterPriceUrl: string,
    _defaultPublicKey: string = process.env.SOLANA_PUBLIC_KEY?.trim() || 'C7DjuqwXZ2kZ2D9RMDXv5HjiR7PVkLFJgnX7PKraPDaM' // Default public key parameter
  ) {
    this.redis = this.configureRedis();
    this.heliusService = new HeliusService(heliusApiKey);
    this.jupiterService = this.configureJupiterService();
    this.jupiterV2 = new JupiterPriceV2();

    console.log('SOLANA_PUBLIC_KEY:', process.env.SOLANA_PUBLIC_KEY);

    const publicKeyString = _defaultPublicKey;
    elizaLogger.info(`Using provided SOLANA_PUBLIC_KEY in MarketDataProcessor: ${publicKeyString}`);
    
    if (!publicKeyString) {
      elizaLogger.error('SOLANA_PUBLIC_KEY is not defined');
      throw new Error('SOLANA_PUBLIC_KEY is not defined');
    }

    this.validatePublicKey(publicKeyString);
    this.setupRedisHandlers();
  }

  private configureRedis(): Redis {
    return new Redis({
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        elizaLogger.info(`Retrying Redis connection in ${delay}ms... (attempt ${times})`);
        return delay;
      },
      enableOfflineQueue: true,
      showFriendlyErrorStack: true
    });
  }

  private configureJupiterService(): JupiterPriceV2Service {
    return new JupiterPriceV2Service({
      redis: {
        host: '127.0.0.1',
        port: 6379
      }
    }, new TokenProvider('', new WalletProvider(new Connection('https://api.mainnet-beta.solana.com'), new PublicKey('11111111111111111111111111111111')), new RedisService({
      host: '127.0.0.1',
      port: 6379
    }), { apiKey: '' }), new RedisService({
      host: '127.0.0.1',
      port: 6379
    }));
  }

  private validatePublicKey(publicKeyString: string): void {
    try {
      elizaLogger.info(`Attempting to validate PublicKey with: ${publicKeyString}`);
      // Assuming a simple validation for the public key string format
      if (!bs58.decode(publicKeyString)) {
        throw new Error('Invalid PublicKey format');
      }
      elizaLogger.info(`Successfully validated PublicKey: ${publicKeyString}`);
    } catch (error) {
      elizaLogger.error(`Error validating PublicKey: ${publicKeyString}`);
      elizaLogger.error(`Error details: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Invalid SOLANA_PUBLIC_KEY: ${publicKeyString}`);
    }
  }

  private setupRedisHandlers(): void {
    this.redis.on('error', (error: Error) => {
      elizaLogger.error('Redis error:', {
        message: error.message,
        stack: error.stack
      });
      this.handleError(error);
    });

    this.redis.on('ready', () => {
      elizaLogger.info('Redis connection established');
    });

    this.redis.on('connect', () => {
      elizaLogger.info('Redis client connected');
    });

    this.redis.on('reconnecting', () => {
      elizaLogger.info('Redis client reconnecting');
    });
  }

  private async compressData<T>(data: T): Promise<string> {
    const jsonString = JSON.stringify(data);
    const compressed = await gzip(jsonString);
    return compressed.toString('base64');
  }

  private async decompressData<T>(data: string): Promise<T> {
    const buffer = Buffer.from(data, 'base64');
    const decompressed = await gunzip(buffer);
    return JSON.parse(decompressed.toString()) as T;
  }

  private handleError(error: Error): void {
    this.errorCount++;
    this.lastError = Date.now();

    if (this.errorCount >= this.ERROR_THRESHOLD) {
      this.circuitOpen = true;
      elizaLogger.warn('Circuit breaker opened', { 
        errors: this.errorCount,
        lastError: error.message 
      });

      setTimeout(() => {
        this.circuitOpen = false;
        this.errorCount = 0;
        elizaLogger.info('Circuit breaker reset');
      }, this.CIRCUIT_TIMEOUT);
    }
  }

  public async getMarketData(tokenAddress: string): Promise<MarketData> {
    const cacheKey = `${this.CACHE_PREFIX}${tokenAddress}`;
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached && !this.circuitOpen) {
        return await this.decompressData<MarketData>(cached);
      }

      const [priceData, extraInfo] = await Promise.all([
        this.jupiterService.getTokenPrice(tokenAddress),
        this.jupiterV2.getPrices([tokenAddress])
      ]);

      const mintInfo = await this.heliusService.getMintAccountInfo(tokenAddress);
      if (mintInfo) {
        mintInfo.supply = BigInt(mintInfo.supply);
      }
      if (!mintInfo || !mintInfo.supply || !mintInfo.decimals) {
        throw new Error('Failed to fetch mint info');
      }
      const holders = await this.heliusService.getHoldersClassification(tokenAddress) as { totalHolders: number; topHolders: Array<{ owner: string; balance: number }>; totalSupply: number };
      if (!holders || !holders.topHolders) {
        throw new Error('Failed to fetch holders classification');
      }

      if (!priceData) {
        throw new Error('Failed to fetch price data');
      }
      const price = Number(priceData.price);
      const marketData: MarketData = {
        price,
        volume24h: extraInfo?.data[tokenAddress]?.volume24h || 0,
        priceChange24h: this.calculatePriceChange(priceData),
        volatility: await this.calculateVolatility(tokenAddress),
        marketCap: price * Number(mintInfo.supply) / (10 ** mintInfo.decimals),
        holders: {
          total: holders.totalHolders,
          top: holders.topHolders.map(holder => ({
            address: holder.owner,
            balance: holder.balance,
            percentage: (holder.balance / holders.totalSupply) * 100
          }))
        },
        lastUpdate: Date.now(),
        onChainActivity: {
          transactions: 0,
          swaps: 0,
          uniqueTraders: 0
        },
        topHolders: []
      };

      await this.redis.set(
        cacheKey,
        await this.compressData(marketData),
        'EX',
        this.DEFAULT_CACHE_TTL
      );

      this.errorCount = 0;
      return marketData;

    } catch (error) {
      elizaLogger.error('Error fetching market data:', error);
      this.handleError(error instanceof Error ? error : new Error(String(error)));

      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return await this.decompressData<MarketData>(cached);
      }

      throw error;
    }
  }

  public async getTokenPrice(tokenAddress: string): Promise<number> {
    const marketData = await this.getMarketData(tokenAddress);
    return marketData.price;
  }

  public async getHistoricalPrices(_token: string, _window: number): Promise<PriceData[]> {
    return [];
  }

  public async getAverageVolatility(token: string): Promise<number> {
    const window = 30; // Example window size of 30 days
    return await this.calculateAverageVolatility(token, window);
  }

  public async calculateAverageVolatility(tokenAddress: string, window: number): Promise<number> {
    const historicalPrices = await this.getHistoricalPrices(tokenAddress, window);
    if (historicalPrices.length < 2) return 0;

    let sumVolatility = 0;
    for (let i = 1; i < historicalPrices.length; i++) {
      const priceChange = Math.abs(historicalPrices[i].price - historicalPrices[i - 1].price);
      const volatility = priceChange / historicalPrices[i - 1].price;
      sumVolatility += volatility;
    }

    return sumVolatility / (historicalPrices.length - 1);
  }

  private calculatePriceChange(priceData: any): number {
    if (!priceData.extraInfo?.lastSwappedPrice) return 0;
    
    const currentPrice = Number(priceData.price);
    const lastPrice = Number(priceData.extraInfo.lastSwappedPrice.lastJupiterSellPrice);
    
    return ((currentPrice - lastPrice) / lastPrice) * 100;
  }

  private async calculateVolatility(tokenAddress: string): Promise<number> {
    const cacheKey = `${this.CACHE_PREFIX}volatility:${tokenAddress}`;
    
    try {
      const prices = await this.jupiterService.getTokenPrice(tokenAddress);
      if (!prices || !prices.extraInfo?.depth) return 0;

      const { buyPriceImpactRatio, sellPriceImpactRatio } = prices.extraInfo.depth;
      
      const avgImpact = (
        Object.values(buyPriceImpactRatio.depth).reduce((a, b) => a + b, 0) +
        Object.values(sellPriceImpactRatio.depth).reduce((a, b) => a + b, 0)
      ) / (
        Object.keys(buyPriceImpactRatio.depth).length +
        Object.keys(sellPriceImpactRatio.depth).length
      );

      await this.redis.set(
        cacheKey,
        await this.compressData({ volatility: avgImpact }),
        'EX',
        this.DEFAULT_CACHE_TTL * 5 // Cache volatility longer
      );

      return avgImpact;

    } catch (error) {
      elizaLogger.error('Error calculating volatility:', error);
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const { volatility } = await this.decompressData<{ volatility: number }>(cached);
        return volatility;
      }
      return 0;
    }
  }

  public async formatForAI(tokenAddress: string): Promise<string> {
    try {
      const marketData = await this.getMarketData(tokenAddress);
      
      return JSON.stringify({
        price: marketData.price.toFixed(6),
        volume24h: this.formatNumber(marketData.volume24h),
        priceChange24h: `${marketData.priceChange24h.toFixed(2)}%`,
        marketCap: this.formatNumber(marketData.marketCap || 0),
        holders: marketData.holders?.total || 0,
        topHolders: marketData.holders?.top.length || 0,
        volatility: marketData.volatility.toFixed(4),
        lastUpdate: new Date(marketData.lastUpdate).toISOString()
      });

    } catch (error) {
      elizaLogger.error('Error formatting data for AI:', error);
      throw error;
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  }

  public async disconnect(): Promise<void> {
    await this.redis.quit();
    elizaLogger.info('Market data processor disconnected');
  }
}

