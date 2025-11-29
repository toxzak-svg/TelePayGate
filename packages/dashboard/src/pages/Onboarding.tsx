import React from 'react';
import { Link } from 'react-router-dom';

export default function Onboarding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-4">Welcome — Let's get you set up</h1>

        <ol className="list-decimal pl-6 space-y-4 text-sm text-gray-700">
          <li>
            <strong className="block text-sm">Copy your credentials</strong>
            <div className="mt-1 text-xs text-gray-500">Make sure you copied the API Secret shown during signup, and keep it in a secure vault.
            </div>
          </li>

          <li>
            <strong className="block text-sm">Add a webhook URL</strong>
            <div className="mt-1 text-xs text-gray-500">Configure a webhook URL so we notify your app about payments. You can add it now in <Link to="/settings" className="text-blue-600 hover:underline">Settings</Link>.</div>
          </li>

          <li>
            <strong className="block text-sm">Try an example request</strong>
            <div className="mt-1 text-xs text-gray-500">Use the API key in a request header to access the API. Example:</div>
            <pre className="mt-2 bg-gray-100 p-3 rounded text-xs font-mono">curl -H "X-API-Key: pk_ABC123..." https://api.example.com/api/v1/payments</pre>
          </li>

          <li>
            <strong className="block text-sm">Read the docs</strong>
            <div className="mt-1 text-xs text-gray-500">Full API documentation and guides are in the repository <a href="/docs/API.md" className="text-blue-600 hover:underline">API docs</a>.</div>
          </li>
        </ol>

        <div className="mt-8 flex justify-end gap-3">
          <Link to="/settings" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">Go to Settings</Link>
          <Link to="/dashboard" className="px-4 py-2 rounded border border-gray-200 text-sm">Go to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
