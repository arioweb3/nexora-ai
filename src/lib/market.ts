export type Coin = {
  id: string; symbol: string; name: string; image: string; current_price: number;
  market_cap: number; market_cap_rank: number; total_volume: number;
  price_change_percentage_24h: number | null; sparkline_in_7d?: { price: number[] }
}
const API = 'https://api.coingecko.com/api/v3'

export async function fetchMarkets(): Promise<Coin[]> {
  const url = `${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h`
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) {
    if (response.status === 429) throw new Error('Market data is rate-limited right now. Please wait a moment before refreshing.')
    throw new Error(`Market data request failed (${response.status}). Please try again shortly.`)
  }
  return response.json() as Promise<Coin[]>
}
export async function fetchHistory(id: string, days: number): Promise<[number, number][]> {
  const response = await fetch(`${API}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`)
  if (!response.ok) throw new Error(response.status === 429 ? 'Historical data is temporarily rate-limited.' : 'Could not load historical prices.')
  const data = await response.json() as { prices: [number, number][] }
  return data.prices
}
export const money = (n: number, compact = false) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: compact ? 'compact' : 'standard',
  maximumFractionDigits: n < 1 ? 6 : 2,
}).format(n)
export const number = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n)
export const shortTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
