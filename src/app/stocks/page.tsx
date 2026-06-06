import { getTopStocks } from '@/lib/data'
import Link from 'next/link'
import { TrendingUp, TrendingDown } from 'lucide-react'

export const revalidate = 300

export default async function StocksPage() {
  const stocks = await getTopStocks(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Most Traded Stocks</h1>
        <p className="text-gray-400 text-sm mt-1">Stocks most frequently bought and sold by Congress members</p>
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[80px_1fr_100px_80px_80px] gap-4 px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wider border-b border-white/10">
          <div>Ticker</div>
          <div>Company</div>
          <div className="text-center">Total Trades</div>
          <div className="text-center text-emerald-400">Buys</div>
          <div className="text-center text-red-400">Sells</div>
        </div>

        {stocks.length === 0 ? (
          <div className="py-16 text-center text-gray-500">No stock data yet.</div>
        ) : (
          stocks.map((stock, i) => (
            <Link
              key={stock.ticker}
              href={`/stocks/${stock.ticker}`}
              className="grid grid-cols-[80px_1fr_100px_80px_80px] gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] transition-colors text-sm items-center group"
            >
              <div className="font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">
                {stock.ticker}
              </div>
              <div className="text-gray-400 truncate">{stock.company_name}</div>
              <div className="text-center text-white font-medium">{stock.trade_count}</div>
              <div className="text-center text-emerald-400 flex items-center justify-center gap-1">
                <TrendingUp size={12} /> {stock.buy_count}
              </div>
              <div className="text-center text-red-400 flex items-center justify-center gap-1">
                <TrendingDown size={12} /> {stock.sell_count}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
