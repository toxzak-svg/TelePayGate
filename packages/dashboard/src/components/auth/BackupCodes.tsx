import React, { useState } from 'react';

export default function BackupCodes({ email }: { email?: string }) {
  const [codes, setCodes] = useState<string[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCodes, setShowCodes] = useState(false);

  async function generateCodes() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/auth/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.codes)) {
        setCodes(data.data.codes);
        setShowCodes(true);
      } else {
        setError(data.error?.message || 'Failed to generate backup codes');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function useCode(code: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/auth/backup-codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email }),
      });
      const data = await res.json();
      if (data.success) {
        setUsed([...used, code]);
      } else {
        setError(data.error?.message || 'Invalid or used backup code');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="font-semibold mb-2">Backup Codes</h3>
      <p className="text-sm text-gray-600 mb-2">Generate backup codes for account recovery. Each code can be used once.</p>
      <button className="bg-blue-600 text-white px-4 py-2 rounded mb-2" onClick={generateCodes} disabled={loading}>Generate Codes</button>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {showCodes && (
        <div className="mt-2">
          <ul className="space-y-1">
            {codes.map((code) => (
              <li key={code} className={`font-mono text-sm p-2 rounded ${used.includes(code) ? 'bg-gray-200 text-gray-400 line-through' : 'bg-gray-50 text-gray-800'}`}>
                {code}
                {!used.includes(code) && (
                  <button className="ml-2 px-2 py-1 text-xs bg-green-600 text-white rounded" onClick={() => useCode(code)} disabled={loading}>Use</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
