import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Moon, Sun, Key, RefreshCw, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { userService } from '../api/services';
import useTheme from '../hooks/useTheme';

export default function Settings() {
  const queryClient = useQueryClient();
  const { theme, toggle: toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: userService.getProfile,
  });

  const regenerateKey = useMutation({
    mutationFn: userService.regenerateApiKey,
    onSuccess: () => {
      toast.success('API key regenerated successfully');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to regenerate API key');
      }
    },
  });

  function handleCopy() {
    if (user?.apiKey) {
      navigator.clipboard.writeText(user.apiKey);
      setCopied(true);
      toast.success('API key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
      
      {/* Theme Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          {theme === 'dark' ? (
            <Moon className="h-5 w-5 text-blue-600" />
          ) : (
            <Sun className="h-5 w-5 text-yellow-500" />
          )}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Choose your preferred color theme for the dashboard.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">
            {theme === 'dark' ? 'Dark mode' : 'Light mode'}
          </span>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={theme === 'dark'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* API Key Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          <Key className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Key</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Use this key to authenticate API requests. Keep it secret!
        </p>
        
        {userLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-gray-500">Loading...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg font-mono text-blue-700 dark:text-blue-400 bg-gray-50 dark:bg-gray-700"
                value={user?.apiKey || ''}
                readOnly
              />
              <button
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button
              className="flex items-center gap-2 px-3 py-2 border border-blue-600 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-50"
              onClick={() => regenerateKey.mutate()}
              disabled={regenerateKey.isPending}
            >
              {regenerateKey.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerate API Key
            </button>
          </>
        )}
      </div>

      {/* Account Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-lg">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Email</span>
            <span className="text-gray-900 dark:text-white font-medium">{user?.email || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Platform Fee</span>
            <span className="text-gray-900 dark:text-white font-medium">{user?.platformFeePercentage || 0}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Member Since</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
