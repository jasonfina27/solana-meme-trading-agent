import { config as loadConfig } from 'dotenv';
import { TradingService } from './services/blockchain/trading.js';
import { CONFIG } from './config/settings.js';

loadConfig();

async function main() {
  const trading = new TradingService(
    CONFIG.SOLANA.RPC_URL,
    process.env.HELIUS_API_KEY || '',
    'https://tokens.jup.ag/tokens?tags=verified',
    {} as any
  );

  const data = await trading.getMarketData(CONFIG.SOLANA.TOKEN_SETTINGS.ADDRESS);
  console.log('Market data', data);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
