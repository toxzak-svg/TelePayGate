import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function NitroSwaps() {
  const { token } = useAuth();
  const [fromToken, setFromToken] = useState('TON');
  const [toToken, setToToken] = useState('USDT');
  const [amount, setAmount] = useState(1);
  const [minReceive, setMinReceive] = useState(0.95);
  const [quote, setQuote] = useState<unknown>(null);
  const [result, setResult] = useState<unknown>(null);
  const headers = token ? { 'X-API-Key': token } : {};

  async function fetchQuote() {
    const res = await api.post('/nitro/quote', { fromToken, toToken, amount }, { headers });
    setQuote(res.data?.data);
  }

  async function executeSwap() {
    const res = await api.post('/nitro/swaps', { fromToken, toToken, amount, minReceive }, { headers });
    setResult(res.data?.data);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">NitroSwaps</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm">From Token</span>
            <input className="mt-1 w-full border rounded p-2" value={fromToken} onChange={(e) => setFromToken(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm">To Token</span>
            <input className="mt-1 w-full border rounded p-2" value={toToken} onChange={(e) => setToToken(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm">Amount</span>
            <input type="number" className="mt-1 w-full border rounded p-2" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))} />
          </label>
          <label className="block">
            <span className="text-sm">Min Receive</span>
            <input type="number" className="mt-1 w-full border rounded p-2" value={minReceive} onChange={(e) => setMinReceive(parseFloat(e.target.value))} />
          </label>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={fetchQuote}>Get Quote</button>
            <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={executeSwap}>Execute Swap</button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="border rounded p-4">
            <h2 className="font-medium mb-2">Quote</h2>
            <pre className="text-sm whitespace-pre-wrap">{quote ? JSON.stringify(quote, null, 2) : 'No quote'}</pre>
          </div>
          <div className="border rounded p-4">
            <h2 className="font-medium mb-2">Result</h2>
            <pre className="text-sm whitespace-pre-wrap">{result ? JSON.stringify(result, null, 2) : 'No result'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
