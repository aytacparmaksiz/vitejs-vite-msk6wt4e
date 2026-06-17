const COINGECKO = 'https://api.coingecko.com/api/v3';
const AV_KEY = 'Z3AKPSWMOJBVLQ1M';
const AV_BASE = 'https://www.alphavantage.co/query';

const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  USDT: 'tether',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  ADA: 'cardano',
  LINK: 'chainlink',
  LTC: 'litecoin',
};

// Alpha Vantage — ABD hisse + ETF
async function fetchAVStock(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${AV_KEY}`
    );
    const data = await res.json();
    const price = data?.['Global Quote']?.['05. price'];
    return price ? Number(price) : null;
  } catch {
    return null;
  }
}

// Alpha Vantage — Döviz kuru (USD/TRY gibi)
async function fetchAVForex(from: string, to: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${AV_BASE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${AV_KEY}`
    );
    const data = await res.json();
    const rate =
      data?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate'];
    return rate ? Number(rate) : null;
  } catch {
    return null;
  }
}

// CoinGecko — Kripto
export async function fetchCryptoPrice(symbol: string): Promise<number | null> {
  try {
    const id = CRYPTO_IDS[symbol.toUpperCase()];
    if (!id) return null;
    const res = await fetch(
      `${COINGECKO}/simple/price?ids=${id}&vs_currencies=try`
    );
    const data = await res.json();
    return data?.[id]?.try ?? null;
  } catch {
    return null;
  }
}

export async function fetchAllPrices(
  assets: any[]
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  // Önce USD/TRY kuru al
  const usdtry = (await fetchAVForex('USD', 'TRY')) ?? 38;

  await Promise.all(
    assets.map(async (asset) => {
      if (!asset.symbol) return;
      const sym = asset.symbol.toUpperCase();

      if (asset.type === 'hisse') {
        // BIST — Alpha Vantage BIST desteklemez, şimdilik ortalama maliyet
        // Vercel deploy sonrası Yahoo Finance backend ile çözülecek
        return;
      } else if (asset.type === 'usd_hisse') {
        const usdPrice = await fetchAVStock(sym);
        if (usdPrice) prices[sym] = usdPrice * usdtry;
      } else if (asset.type === 'etf') {
        const usdPrice = await fetchAVStock(sym);
        if (usdPrice) prices[sym] = usdPrice * usdtry;
      } else if (asset.type === 'kripto') {
        const price = await fetchCryptoPrice(sym);
        if (price) prices[sym] = price;
      } else if (asset.type === 'doviz') {
        if (sym === 'USD') {
          prices[sym] = usdtry;
        } else if (sym === 'EUR') {
          const rate = await fetchAVForex('EUR', 'TRY');
          if (rate) prices[sym] = rate;
        } else if (sym === 'GBP') {
          const rate = await fetchAVForex('GBP', 'TRY');
          if (rate) prices[sym] = rate;
        } else if (sym === 'XAU' || sym === 'ALTIN') {
          // Altın: önce XAU/USD al, sonra TRY'ye çevir
          const xauusd = await fetchAVForex('XAU', 'USD');
          if (xauusd) prices[sym] = xauusd * usdtry;
        } else if (sym === 'TRYG') {
          // Gram altın: ons fiyatı / 31.1035 * usdtry
          const xauusd = await fetchAVForex('XAU', 'USD');
          if (xauusd) prices[sym] = (xauusd / 31.1035) * usdtry;
        }
      }
    })
  );

  return prices;
}
