import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../api/services';
import { useEffect } from 'react';
import { Key, CheckCircle, AlertCircle } from 'lucide-react';

export default function Register() {
  const [appName, setAppName] = useState('');
  const [description, setDescription] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captchaProvider, setCaptchaProvider] = useState<string | null>(null);
  const [captchaVerifiedToken, setCaptchaVerifiedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{
    apiKey?: string;
    apiSecret?: string;
  } | null>(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await userService.getFeatures();
        if (!mounted) return;
        setCaptchaEnabled(!!resp?.features?.captchaEnabled);
        setCaptchaProvider(resp?.features?.captchaProvider || null);
      } catch (err) {
        // ignore feature discovery errors — treat as captcha disabled
        setCaptchaEnabled(false);
        setCaptchaProvider(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!appName.trim()) {
      setError('App name is required');
      return;
    }

    if (!acceptedTerms) {
      setError('You must accept the Terms & Privacy policy to continue');
      return;
    }

    if (captchaEnabled && !captchaVerifiedToken) {
      setError('Please complete the CAPTCHA verification to continue');
      return;
    }

    setLoading(true);

    try {
      const res = await register(appName.trim(), description || null, webhookUrl || null, captchaVerifiedToken || null);
      // show credentials to the user (apiSecret only once)
      setCredentials(res);
      // redirect after a short delay to settings so the user can finish setup
      setTimeout(() => {
        navigate('/onboarding');
      }, 1400);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(e.response?.data?.error?.message || e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text?: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text);
  }

  function downloadCredentials() {
    if (!credentials) return;
    const payload = `API Key: ${credentials.apiKey}\nAPI Secret: ${credentials.apiSecret}\n`;
    const blob = new Blob([payload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appName || 'credentials'}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleCaptchaClick() {
    setError('');
    try {
      setLoading(true);
      // For now we generate a short-lived demo token; in production integrate reCAPTCHA/hCaptcha
      const demoToken = `demo-${Math.random().toString(36).slice(2, 10)}`;
      const resp = await userService.verifyCaptcha(demoToken);
      if (resp?.verified) {
        setCaptchaVerifiedToken(demoToken);
      } else {
        setError('Captcha verification failed — try again');
      }
    } catch (err: unknown) {
      setError('Captcha verification failed — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-full">
              <Key className="h-10 w-10 text-blue-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Create a new API app</h1>
          <p className="text-gray-600 text-center mb-8">Sign up to create an API key for your integration. You will see the API secret only once — save it securely.</p>

          {!credentials ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="appName" className="block text-sm font-medium text-gray-700 mb-2">Application name</label>
                <input id="appName" value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" placeholder="My Cool App" disabled={loading} />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" placeholder="Short description for your app" disabled={loading} />
              </div>

              <div>
                <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 mb-2">Webhook URL (optional)</label>
                <input id="webhookUrl" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" placeholder="https://example.com/webhook" disabled={loading} />
              </div>

              <div className="flex items-start gap-3">
                <input id="terms" type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} disabled={loading} />
                <label htmlFor="terms" className="text-sm text-gray-700">
                  I accept the <a href="https://docs.example.com/terms" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Terms</a> and <a href="https://docs.example.com/privacy" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a>
                </label>
              </div>

              {captchaEnabled && (
                <div className="p-3 border border-gray-200 rounded-lg bg-white mt-2">
                  <div className="text-sm text-gray-700 mb-2">CAPTCHA verification required</div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-600">Provider: <strong className="text-gray-800">{captchaProvider || 'unknown'}</strong></div>
                    {!captchaVerifiedToken ? (
                      <button type="button" onClick={handleCaptchaClick} disabled={loading} className="ml-auto bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700">Complete CAPTCHA</button>
                    ) : (
                      <div className="ml-auto text-sm text-green-700 bg-green-50 px-3 py-2 rounded">Verified</div>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl">{loading ? 'Creating...' : 'Create App & API key'}</button>
                <button type="button" onClick={() => { setAppName(''); setDescription(''); setWebhookUrl(''); setAcceptedTerms(false); }} className="px-4 py-3 rounded-lg border border-gray-200 text-sm">Reset</button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border border-green-100 rounded-lg bg-green-50 flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-700" />
                <div>
                  <div className="text-sm text-green-800 font-medium">App created successfully</div>
                  <div className="text-xs text-gray-700">You were automatically signed in and will be redirected to settings shortly.</div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <div className="text-xs text-gray-600 mb-2">API Key (stored)</div>
                <div className="flex items-center justify-between gap-3 font-mono text-sm bg-white p-3 border border-gray-200 rounded">
                  <div className="truncate">{credentials.apiKey}</div>
                  <div className="flex gap-2">
                    <button onClick={() => copyToClipboard(credentials.apiKey)} className="text-xs text-blue-600 hover:underline">Copy</button>
                  </div>
                </div>

                <div className="text-xs text-gray-600 mt-4 mb-2">API Secret — save this now (shown only once)</div>
                <div className="flex items-center justify-between gap-3 font-mono text-sm bg-white p-3 border border-gray-200 rounded">
                  <div className="truncate">{credentials.apiSecret}</div>
                  <div className="flex gap-2">
                    <button onClick={() => copyToClipboard(credentials.apiSecret)} className="text-xs text-blue-600 hover:underline">Copy</button>
                    <button onClick={downloadCredentials} className="text-xs text-gray-700 hover:underline">Download</button>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 text-center">Tip: store your API secret somewhere safe — we won’t keep showing it.</div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">Powered by TON Blockchain • Decentralized P2P</p>
      </div>
    </div>
  );
}
