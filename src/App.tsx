import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, BrainCircuit, BriefcaseBusiness,
  CircleHelp, Compass, Eye, Gem, Globe2, LayoutDashboard,
  Menu, Plus, RefreshCw, Search, Settings, ShieldCheck, Sparkles, Star, Trash2, X,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Coin, fetchHistory, fetchMarkets, money, number, shortTime } from './lib/market'

type Page = 'Overview' | 'Markets' | 'Portfolio' | 'Watchlist' | 'AI Insights' | 'Settings'
type Holding = { id: string; amount: number; buyPrice?: number }
const NAV: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'Markets', icon: BarChart3 },
  { label: 'Portfolio', icon: BriefcaseBusiness }, { label: 'Watchlist', icon: Star },
  { label: 'AI Insights', icon: BrainCircuit }, { label: 'Settings', icon: Settings },
]
const initialWatch = ['bitcoin', 'ethereum', 'solana']
const readStore = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
function App() {
  const [page, setPage] = useState<Page>('Overview')
  const [coins, setCoins] = useState<Coin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState<Date | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('market_cap_rank')
  const [selectedId, setSelectedId] = useState('bitcoin')
  const [days, setDays] = useState(7)
  const [history, setHistory] = useState<[number, number][]>([])
  const [historyError, setHistoryError] = useState('')
  const [watchlist, setWatchlist] = useState<string[]>(() => readStore('nexora-watchlist', initialWatch))
  const [holdings, setHoldings] = useState<Holding[]>(() => readStore('nexora-holdings', []))
  const [mobileNav, setMobileNav] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addCoin, setAddCoin] = useState('bitcoin')
  const [amount, setAmount] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [toast, setToast] = useState('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [compact, setCompact] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try { const data = await fetchMarkets(); setCoins(data); setUpdated(new Date()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load market data.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh(); const timer = window.setInterval(() => { void refresh() }, 120_000); return () => window.clearInterval(timer) }, [refresh])
  useEffect(() => { localStorage.setItem('nexora-watchlist', JSON.stringify(watchlist)) }, [watchlist])
  useEffect(() => { localStorage.setItem('nexora-holdings', JSON.stringify(holdings)) }, [holdings])
  useEffect(() => { localStorage.setItem('nexora-currency', currency); localStorage.setItem('nexora-compact', String(compact)) }, [currency, compact])

  const selected = coins.find(c => c.id === selectedId) ?? coins[0]
  useEffect(() => {
    if (!selected) return
    let cancelled = false
    setHistoryError('')
    fetchHistory(selected.id, days).then(data => { if (!cancelled) setHistory(data) })
      .catch(e => { if (!cancelled) { setHistory([]); setHistoryError(e instanceof Error ? e.message : 'Historical data unavailable.') } })
    return () => { cancelled = true }
  }, [selected?.id, days])
  const byId = useMemo(() => new Map(coins.map(c => [c.id, c])), [coins])
  const filtered = useMemo(() => coins.filter(c => `${c.name} ${c.symbol}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'price' ? b.current_price - a.current_price : sort === 'change' ? (b.price_change_percentage_24h ?? -999) - (a.price_change_percentage_24h ?? -999) : sort === 'volume' ? b.total_volume - a.total_volume : a.market_cap_rank - b.market_cap_rank), [coins, query, sort])
  const totalMarketCap = coins.reduce((sum, c) => sum + c.market_cap, 0)
  const totalVolume = coins.reduce((sum, c) => sum + c.total_volume, 0)
  const portfolioValue = holdings.reduce((sum, h) => sum + (byId.get(h.id)?.current_price ?? 0) * h.amount, 0)
  const portfolioCost = holdings.reduce((sum, h) => sum + (h.buyPrice ?? 0) * h.amount, 0)
  const portfolioHasCost = holdings.length > 0 && holdings.every(h => typeof h.buyPrice === 'number' && h.buyPrice > 0)
  const pct = (n: number | null) => n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(''), 2600) }
  const toggleWatch = (id: string) => {
    setWatchlist(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id])
    notify(watchlist.includes(id) ? 'Removed from watchlist' : 'Added to watchlist')
  }
  const addHolding = () => {
    const parsed = Number(amount), buy = buyPrice.trim() ? Number(buyPrice) : undefined
    if (!Number.isFinite(parsed) || parsed <= 0 || (buy !== undefined && (!Number.isFinite(buy) || buy <= 0))) { notify('Enter a valid amount and optional buy price.'); return }
    setHoldings(old => [...old, { id: addCoin, amount: parsed, buyPrice: buy }])
    setShowAdd(false); setAmount(''); setBuyPrice(''); notify('Asset added to portfolio')
  }
  const askAI = async () => {
    if (!aiQuestion.trim()) return
    const endpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined
    if (!endpoint) { setAiAnswer('AI is not connected yet. This workspace does not generate fake AI responses. To enable explanations, configure VITE_AI_ENDPOINT to point to your own secure backend. Keep provider API keys on the server, never in frontend code.'); return }
    setAiAnswer('Connecting to your configured AI service…')
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: aiQuestion, market: coins.slice(0, 20).map(c => ({ name: c.name, price: c.current_price, change24h: c.price_change_percentage_24h })) }) })
      if (!res.ok) throw new Error(`AI service returned ${res.status}`)
      const data = await res.json() as { answer?: string }
      setAiAnswer(data.answer || 'The AI service returned no explanation.')
    } catch { setAiAnswer('Could not reach the AI backend. Check the endpoint and server logs, then try again.') }
  }
  const chartData = history.map(([time, price]) => ({ time, price, label: new Date(time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: days <= 1 ? 'numeric' : undefined }) }))
  const change = selected?.price_change_percentage_24h ?? 0
  const renderCoinRows = (list: Coin[]) => list.map((coin) => {
    const positive = (coin.price_change_percentage_24h ?? 0) >= 0
    const points = coin.sparkline_in_7d?.price ?? []
    const mini = points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 24)) === 0).slice(-24)
    return <tr key={coin.id} onClick={() => { setSelectedId(coin.id); setPage('Overview') }} className="coin-row">
      <td><div className="asset-cell"><img src={coin.image} alt="" /><span className="rank">{coin.market_cap_rank}</span><div><b>{coin.name}</b><small>{coin.symbol.toUpperCase()}</small></div></div></td>
      <td className="right strong">{money(coin.current_price)}</td>
      <td className={`right ${positive ? 'positive' : 'negative'}`}>{positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {pct(coin.price_change_percentage_24h)}</td>
      <td className="right muted">${number(coin.market_cap)}</td>
      <td className="right muted">${number(coin.total_volume)}</td>
      <td><div className="sparkline">{mini.map((p, i) => <i key={i} style={{ height: `${Math.max(4, (p / Math.max(...mini)) * 34)}px` }} className={positive ? 'up' : 'down'}/>)}</div></td>
      <td><button aria-label={`${watchlist.includes(coin.id) ? 'Remove' : 'Add'} ${coin.name} ${watchlist.includes(coin.id) ? 'from' : 'to'} watchlist`} className={`icon-button ${watchlist.includes(coin.id) ? 'starred' : ''}`} onClick={e => { e.stopPropagation(); toggleWatch(coin.id) }}><Star size={16} fill={watchlist.includes(coin.id) ? 'currentColor' : 'none'}/></button></td>
    </tr>
  })
  const marketTable = (list: Coin[] | null, title = 'Market watch') => <section className="panel market-panel">
    <div className="panel-heading"><div><h2>{title}</h2><p>Live assets ranked by market capitalization</p></div><button className="text-button" onClick={() => setPage('Markets')}>View markets <span>↗</span></button></div>
    <div className="table-tools"><label className="searchbox"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search assets..." /></label><select aria-label="Sort assets" value={sort} onChange={e => setSort(e.target.value)}><option value="market_cap_rank">Market cap rank</option><option value="price">Price: high to low</option><option value="change">24h change</option><option value="volume">Trading volume</option></select></div>
    {error && <div className="inline-error"><CircleHelp size={17}/><span>{error}</span><button onClick={() => void refresh()}>Retry</button></div>}
    <div className="table-wrap"><table><thead><tr><th>Asset</th><th className="right">Price</th><th className="right">24h change</th><th className="right">Market cap</th><th className="right">Volume (24h)</th><th>Last 7 days</th><th></th></tr></thead><tbody>{loading && coins.length === 0 ? <tr><td colSpan={7}><div className="loading-state"><span className="spinner"/> Loading live market data…</div></td></tr> : filtered.filter(c => list === null || list.some(item => item.id === c.id)).length ? renderCoinRows(filtered.filter(c => list === null || list.some(item => item.id === c.id))) : <tr><td colSpan={7}><div className="empty-state"><Search size={24}/><b>No assets found</b><span>Try another search term.</span></div></td></tr>}</tbody></table></div>
    <div className="table-foot"><span>Source: CoinGecko public API · USD</span><span>{updated ? `Updated ${shortTime(updated)}` : 'Waiting for data'} · {coins.length} assets loaded</span></div>
  </section>
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Gem size={23}/></div><div><b>NEXORA<span> AI</span></b><small>INTELLIGENCE TERMINAL</small></div><button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{NAV.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${page === label ? 'active' : ''}`} onClick={() => { setPage(label); setMobileNav(false) }}><Icon size={18}/><span>{label}</span>{label === 'Watchlist' && <em>{watchlist.length}</em>}{label === 'AI Insights' && <span className="nav-new">BETA</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="pro-card"><div className="pro-icon"><Sparkles size={17}/></div><b>Clarity in every candle.</b><p>Your crypto market, one intelligent workspace.</p><button onClick={() => setPage('AI Insights')}>Explore AI insights <span>↗</span></button></div><div className="user-profile"><div className="avatar">A</div><div><b>ARIO WEB3</b><small>Independent builder</small></div><ShieldCheck size={16} className="verified"/></div><div className="copyright">BUILT BY ARIO WEB3 · 2026</div></div>
    </aside>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation overlay"/>}
    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu/></button><span>Workspace</span><b>/</b><strong>{page}</strong></div><div className="top-actions"><div className="market-status"><span/> Market data {loading ? 'syncing' : 'connected'}</div><button className="icon-button notification" aria-label="Market data source information" title="Market data supplied by CoinGecko"><Bell size={17}/></button><button className="refresh-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/><span>Refresh</span></button></div></header>
      <div className="content">
        <div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> NEXORA INTELLIGENCE / 01</div><h1>{page === 'Overview' ? 'Market overview' : page === 'AI Insights' ? 'AI market explainer' : page === 'Settings' ? 'Workspace settings' : page}</h1><p>{page === 'Overview' ? 'A clearer view of the digital asset landscape.' : page === 'Markets' ? 'Explore digital assets, price movements and market activity.' : page === 'Portfolio' ? 'Track your holdings and understand your exposure.' : page === 'Watchlist' ? 'Your personally curated market radar.' : page === 'AI Insights' ? 'Understand the numbers. Separate signal from noise.' : 'Make NEXORA feel like your workspace.'}</p></div><div className="intro-right"><span className="live-badge"><i/> LIVE MARKET FEED</span><span className="updated-label">{updated ? `Last synced ${shortTime(updated)}` : 'Connecting to data source'}</span></div></div>
        {page === 'Overview' && <>
          <div className="hero-banner"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-copy"><div className="hero-kicker"><Sparkles size={14}/> YOUR MARKET, DECODED</div><h2>Intelligence.<br/><span>Insights. Innovation.</span></h2><p>Real-time market context to help you explore crypto with greater clarity.</p><button onClick={() => setPage('Markets')} className="hero-cta">Explore markets <span>↗</span></button></div><div className="hero-graphic"><div className="graphic-ring ring-a"/><div className="graphic-ring ring-b"/><div className="graphic-core"><Gem size={42}/></div><div className="float-chip chip-top"><Activity size={14}/> Market signals</div><div className="float-chip chip-bottom"><span className="dot-cyan"/> Data in motion</div><div className="graphic-line line-one"/><div className="graphic-line line-two"/></div><div className="hero-index">NX / 001</div></div>
          <div className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Tracked market cap</span><span className="stat-icon violet"><Globe2 size={17}/></span></div><strong>{loading && !coins.length ? '—' : `$${number(totalMarketCap)}`}</strong><div className="stat-bottom"><span className="stat-note">Sum of loaded top 100 assets</span><span className="micro-tag">USD</span></div></article><article className="stat-card"><div className="stat-top"><span>24h trading volume</span><span className="stat-icon cyan"><BarChart3 size={17}/></span></div><strong>{loading && !coins.length ? '—' : `$${number(totalVolume)}`}</strong><div className="stat-bottom"><span className="stat-note">Across loaded assets</span><span className="micro-tag">24H</span></div></article><article className="stat-card"><div className="stat-top"><span>Assets monitored</span><span className="stat-icon blue"><Compass size={17}/></span></div><strong>{coins.length || '—'}<small className="unit-label"> assets</small></strong><div className="stat-bottom"><span className="stat-note">CoinGecko market listing</span><span className="tiny-live"><i/> LIVE</span></div></article><article className="stat-card"><div className="stat-top"><span>Your portfolio</span><span className="stat-icon pink"><BriefcaseBusiness size={17}/></span></div><strong>{money(portfolioValue, true)}</strong><div className="stat-bottom"><span className="stat-note">{holdings.length} holding entries tracked</span><button className="mini-link" onClick={() => setPage('Portfolio')}>Details ↗</button></div></article></div>
          <div className="analysis-grid"><section className="panel chart-panel"><div className="panel-heading chart-heading"><div><div className="heading-overline">PRICE PERFORMANCE</div><h2>{selected?.name ?? 'Bitcoin'} <span className="ticker">{selected?.symbol.toUpperCase() ?? 'BTC'}/USD</span></h2><div className="chart-price">{selected ? money(selected.current_price) : '—'} {selected && <span className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>}</div></div><div className="chart-controls"><select aria-label="Select chart asset" value={selected?.id ?? selectedId} onChange={e => setSelectedId(e.target.value)}>{coins.slice(0, 100).map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</option>)}</select><div className="periods">{[{d:1,t:'1D'},{d:7,t:'7D'},{d:30,t:'1M'},{d:90,t:'3M'}].map(p => <button key={p.d} className={days === p.d ? 'selected' : ''} onClick={() => setDays(p.d)}>{p.t}</button>)}</div></div></div>
            {historyError ? <div className="chart-message"><CircleHelp size={22}/><b>Historical data unavailable</b><span>{historyError}</span><button onClick={() => selected && fetchHistory(selected.id, days).then(setHistory).catch(() => setHistoryError('Please try again later.'))}>Try again</button></div> : chartData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}><defs><linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.28}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#20243b" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="label" tick={{ fill: '#777f9d', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={34}/><YAxis orientation="right" tick={{ fill: '#777f9d', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => money(v, true)} width={64} domain={['auto','auto']}/><Tooltip contentStyle={{ background: '#11162a', border: '1px solid #303752', borderRadius: 10, color: '#f5f6ff', fontSize: 12 }} labelStyle={{ color: '#8d96b5' }} formatter={(v) => [money(Number(v)), 'Price']} labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}/><Area type="monotone" dataKey="price" stroke="#a78bfa" strokeWidth={2} fill="url(#priceFill)" activeDot={{ r: 4, fill: '#c4b5fd', stroke: '#11162a', strokeWidth: 2 }} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div> : <div className="chart-message"><span className="spinner"/><b>{loading ? 'Waiting for market data' : 'Loading historical prices…'}</b><span>Price history is provided by CoinGecko.</span></div>}
            <div className="chart-foot"><span><i className="legend-dot"/> Historical price · USD</span><span>Source: CoinGecko</span></div></section>
            <section className="panel watch-panel"><div className="panel-heading"><div><h2>Watchlist</h2><p>Your market radar</p></div><button className="icon-button" onClick={() => setPage('Watchlist')} aria-label="View full watchlist"><Eye size={17}/></button></div><div className="watch-items">{watchlist.length ? watchlist.slice(0,5).map(id => { const c = byId.get(id); return <div className="watch-item" key={id} onClick={() => { if(c) setSelectedId(c.id); setPage('Overview') }}><img src={c?.image} alt=""/><div className="watch-name"><b>{c?.symbol.toUpperCase() ?? id}</b><small>{c?.name ?? 'Loading asset…'}</small></div><div className="watch-price"><b>{c ? money(c.current_price) : '—'}</b><small className={(c?.price_change_percentage_24h ?? 0) >= 0 ? 'positive' : 'negative'}>{c ? pct(c.price_change_percentage_24h) : '—'}</small></div><button className="icon-button remove-watch" aria-label={`Remove ${c?.name ?? id} from watchlist`} onClick={e => { e.stopPropagation(); toggleWatch(id) }}><X size={14}/></button></div> }) : <div className="empty-state"><Star size={22}/><b>Your watchlist is empty</b><span>Add assets from Markets.</span></div>}</div><button className="watch-footer" onClick={() => setPage('Watchlist')}>Manage watchlist <span>→</span></button></section></div>
          {marketTable(coins.slice(0, 10), 'Top market assets')}
          <div className="disclaimer"><ShieldCheck size={16}/><span>Market data is provided by CoinGecko. NEXORA AI is an informational tool, not financial advice. Cryptocurrency markets are volatile.</span></div>
        </>}
        {page === 'Markets' && <>{marketTable(null, 'All market assets')}<div className="disclaimer"><ShieldCheck size={16}/><span>Prices and metrics are sourced from CoinGecko public API and may be delayed or rate-limited.</span></div></>}
        {page === 'Portfolio' && <><div className="portfolio-summary"><div className="portfolio-total"><span>TOTAL PORTFOLIO VALUE</span><strong>{money(portfolioValue)}</strong><small>{holdings.length} holding entries · Stored locally on this device</small></div><div className="portfolio-gain"><span>ESTIMATED P/L</span><strong className={portfolioHasCost ? (portfolioValue - portfolioCost >= 0 ? 'positive' : 'negative') : ''}>{portfolioHasCost ? `${portfolioValue - portfolioCost >= 0 ? '+' : ''}${money(portfolioValue - portfolioCost)}` : '—'}</strong><small>{portfolioHasCost ? 'Based on entered buy prices' : 'Add buy prices to calculate P/L'}</small></div><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={16}/> Add asset</button></div><section className="panel market-panel"><div className="panel-heading"><div><h2>Your holdings</h2><p>Personal portfolio · No wallet connection required</p></div><span className="local-badge"><ShieldCheck size={13}/> Local only</span></div>{holdings.length ? <div className="table-wrap"><table><thead><tr><th>Asset</th><th className="right">Quantity</th><th className="right">Buy price</th><th className="right">Current price</th><th className="right">Current value</th><th className="right">P/L</th><th/></tr></thead><tbody>{holdings.map((h, i) => { const c = byId.get(h.id); const value = (c?.current_price ?? 0) * h.amount; const pl = h.buyPrice ? (c?.current_price ?? 0) * h.amount - h.buyPrice * h.amount : null; return <tr key={`${h.id}-${i}`}><td><div className="asset-cell">{c && <img src={c.image} alt=""/>}<div><b>{c?.name ?? h.id}</b><small>{c?.symbol.toUpperCase() ?? 'Asset'}</small></div></div></td><td className="right">{h.amount.toLocaleString('en-US', { maximumFractionDigits: 8 })}</td><td className="right">{h.buyPrice ? money(h.buyPrice) : '—'}</td><td className="right">{c ? money(c.current_price) : '—'}</td><td className="right strong">{money(value)}</td><td className={`right ${pl === null ? 'muted' : pl >= 0 ? 'positive' : 'negative'}`}>{pl === null ? '—' : `${pl >= 0 ? '+' : ''}${money(pl)}`}</td><td><button className="icon-button danger-icon" aria-label="Delete holding" onClick={() => setHoldings(old => old.filter((_, j) => j !== i))}><Trash2 size={15}/></button></td></tr> })}</tbody></table></div> : <div className="empty-state large-empty"><BriefcaseBusiness size={28}/><b>Your portfolio starts here</b><span>Add your first asset to track its live value and optional estimated profit or loss.</span><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={15}/> Add your first asset</button></div>}<div className="table-foot"><span>Holdings saved in this browser only</span><span>Prices update with market data</span></div></section><div className="disclaimer"><ShieldCheck size={16}/><span>Portfolio estimates exclude fees, taxes and transaction history. P/L is only calculated when a valid buy price is provided.</span></div></>}
        {page === 'Watchlist' && <>{marketTable(coins.filter(c => watchlist.includes(c.id)), 'Your watchlist')}<div className="disclaimer"><Star size={16}/><span>Use the star icon in Markets to add or remove assets. Your watchlist stays in this browser.</span></div></>}
        {page === 'AI Insights' && <div className="ai-layout"><section className="panel ai-panel"><div className="ai-emblem"><BrainCircuit size={28}/><span/></div><div className="eyebrow">NEXORA EXPLAINER / BETA</div><h2>Make sense of the market.</h2><p className="ai-lede">Ask about crypto concepts or request a plain-language explanation of the market snapshot. AI-generated content is separate from verified market data.</p><div className="ai-prompts"><button onClick={() => setAiQuestion('Explain what market capitalization means in crypto.')}>What is market cap? <span>↗</span></button><button onClick={() => setAiQuestion('Explain the difference between 24-hour price change and trading volume.')}>Price vs. volume <span>↗</span></button><button onClick={() => setAiQuestion('Explain the risks of diversification in a crypto portfolio.')}>Portfolio diversification <span>↗</span></button></div><label className="ai-input-label" htmlFor="ai-question">YOUR QUESTION</label><textarea id="ai-question" value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} placeholder="Ask a question about crypto markets…" rows={4}/><button className="primary-button ask-button" onClick={() => void askAI()}><Sparkles size={16}/> Explain this <span>→</span></button>{aiAnswer && <div className="ai-answer"><div><Sparkles size={16}/> EXPLANATION <span className="ai-generated">AI / CONFIGURED SERVICE</span></div><p>{aiAnswer}</p></div>}<div className="ai-config"><CircleHelp size={17}/><div><b>AI service status: {import.meta.env.VITE_AI_ENDPOINT ? 'Endpoint configured' : 'Not configured'}</b><p>{import.meta.env.VITE_AI_ENDPOINT ? 'Requests are sent to your configured backend. Validate its authentication, CORS, rate limits and response schema.' : 'To enable live AI responses, deploy a backend endpoint and set VITE_AI_ENDPOINT. Never place an AI provider secret in frontend code.'}</p></div></div></section><section className="panel context-panel"><div className="panel-heading"><div><h2>Market context</h2><p>Current data snapshot</p></div><span className="live-badge"><i/> DATA</span></div>{coins.slice(0,5).map(c => <div className="context-row" key={c.id}><img src={c.image} alt=""/><div><b>{c.name}</b><small>{c.symbol.toUpperCase()}</small></div><div><strong>{money(c.current_price)}</strong><small className={(c.price_change_percentage_24h ?? 0) >= 0 ? 'positive' : 'negative'}>{pct(c.price_change_percentage_24h)} / 24h</small></div></div>)}<div className="context-note"><ShieldCheck size={16}/><span>These figures are sourced market data, not AI predictions. Nothing here guarantees future performance.</span></div></section></div>}
        {page === 'Settings' && <section className="panel settings-panel"><div className="panel-heading"><div><h2>Preferences</h2><p>Customize your NEXORA workspace</p></div><Settings size={20}/></div><div className="setting-row"><div><b>Display currency</b><p>Market API and chart data currently use USD. This setting is saved for future UI preferences.</p></div><select value={currency} onChange={e => { setCurrency(e.target.value); notify('Currency preference saved') }}><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro (display preference only)</option><option value="GBP">GBP — British Pound (display preference only)</option></select></div><div className="setting-row"><div><b>Compact number formatting</b><p>Use abbreviated values for large market metrics.</p></div><button className={`toggle ${compact ? 'on' : ''}`} onClick={() => setCompact(v => !v)} aria-pressed={compact}><span/></button></div><div className="setting-row"><div><b>Market data provider</b><p>CoinGecko public API · No API key configured. Rate limits may apply.</p></div><span className="local-badge"><Globe2 size={13}/> Public API</span></div><div className="setting-row"><div><b>Local data</b><p>Portfolio and watchlist are stored in this browser's LocalStorage.</p></div><button className="outline-button" onClick={() => { if(confirm('Clear your local portfolio and watchlist? This cannot be undone.')) { setHoldings([]); setWatchlist([]); notify('Local portfolio and watchlist cleared') } }}>Clear local data</button></div><div className="setting-row"><div><b>Built by ARIO WEB3</b><p>NEXORA AI · Intelligence. Insights. Innovation.</p></div><a className="outline-button" href="https://github.com/arioweb3" target="_blank" rel="noreferrer">GitHub profile ↗</a></div></section>}
        <footer className="footer"><div className="footer-brand"><div className="mini-brand"><Gem size={14}/></div><span>NEXORA AI</span><i/> <span>BY ARIO WEB3</span></div><span>Intelligence. Insights. Innovation.</span><span>© 2026 ARIO WEB3 · Market data by CoinGecko</span></footer>
      </div>
    </main>
    {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><h2>Add portfolio asset</h2><p>Enter a quantity and optional average buy price.</p></div><button className="icon-button" onClick={() => setShowAdd(false)} aria-label="Close dialog"><X size={18}/></button></div><label>CRYPTO ASSET<select value={addCoin} onChange={e => setAddCoin(e.target.value)}>{coins.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</option>)}</select></label><label>QUANTITY<input type="number" min="0" step="any" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 0.25"/></label><label>AVERAGE BUY PRICE (USD) · OPTIONAL<input type="number" min="0" step="any" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="e.g. 62000"/></label><div className="modal-note"><ShieldCheck size={15}/> Saved locally. No wallet or private key required.</div><div className="modal-actions"><button className="outline-button" onClick={() => setShowAdd(false)}>Cancel</button><button className="primary-button" onClick={addHolding}><Plus size={15}/> Add holding</button></div></div></div>}
    {toast && <div className="toast"><ShieldCheck size={16}/>{toast}</div>}
  </div>
}
export default App
