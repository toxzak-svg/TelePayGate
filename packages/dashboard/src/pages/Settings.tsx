import React, { useState } from 'react';

function generateApiKey() {
  return 'pk_' + Math.random().toString(36).slice(2, 18);
}

export default function Settings() {
  const [apiKey, setApiKey] = useState(generateApiKey());
  const [copied, setCopied] = useState(false);

  function handleRegenerate() {
    setApiKey(generateApiKey());
    setCopied(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="bg-white rounded-lg shadow p-6 max-w-lg mb-8">
        <h2 className="text-lg font-semibold mb-4">API Key</h2>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-lg font-mono text-blue-700 bg-gray-50"
            value={apiKey}
            readOnly
          />
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            onClick={handleCopy}
          >{copied ? 'Copied!' : 'Copy'}</button>
        </div>
        <button
          className="px-3 py-2 border border-blue-600 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50"
          onClick={handleRegenerate}
        >Regenerate API Key</button>
      </div>

      {/* TOTP Provisioning UI */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Two-Factor Authentication (TOTP)</h2>
        {/* Replace with actual user email context if available */}
        <div className="max-w-lg">
          {/* @ts-ignore-next-line */}
          <import('../components/auth/TotpProvision').then(({ default: TotpProvision }) => <TotpProvision email={undefined} />)}
        </div>
      </div>

      {/* Backup Codes UI */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Backup Codes</h2>
        <div className="max-w-lg">
          {/* @ts-ignore-next-line */}
          <import('../components/auth/BackupCodes').then(({ default: BackupCodes }) => <BackupCodes email={undefined} />)}
        </div>
      </div>
    </div>
  );
}
