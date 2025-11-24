import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Mail, Lock } from 'lucide-react';

export default function Passwordless() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [totp, setTotp] = useState('');
  const [step, setStep] = useState<'email' | 'verify' | 'totp'>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function requestMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to send magic link');
      setStep('verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/magic-link/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success && data.data?.user) {
        navigate('/dashboard');
        return;
      }
      if (data.success && data.data?.two_factor_required) {
        setPendingToken(data.data.pending_token);
        setStep('totp');
        return;
      }
      throw new Error(data.error?.message || 'Invalid or expired token');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyTotp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totp, pending_token: pendingToken }),
      });
      const data = await res.json();
      if (data.success) {
        navigate('/dashboard');
        return;
      }
      throw new Error(data.error?.message || 'Invalid TOTP code');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">Sign in with Email</h1>
          {step === 'email' && (
            <form onSubmit={requestMagicLink} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input id="email" type="email" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} required />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">{loading ? 'Sending...' : 'Send Magic Link'}</button>
            </form>
          )}
          {step === 'verify' && (
            <form onSubmit={verifyMagicLink} className="space-y-4">
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">Magic Link Token</label>
                <input id="token" type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={token} onChange={e => setToken(e.target.value)} disabled={loading} required />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">{loading ? 'Verifying...' : 'Verify Magic Link'}</button>
            </form>
          )}
          {step === 'totp' && (
            <form onSubmit={verifyTotp} className="space-y-4">
              <div>
                <label htmlFor="totp" className="block text-sm font-medium text-gray-700 mb-2">TOTP Code</label>
                <input id="totp" type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={totp} onChange={e => setTotp(e.target.value)} disabled={loading} required />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">{loading ? 'Verifying...' : 'Verify TOTP'}</button>
            </form>
          )}
        </div>
        <p className="text-center text-sm text-gray-600 mt-6">Powered by TON Blockchain • Decentralized P2P</p>
      </div>
    </div>
  );
}
