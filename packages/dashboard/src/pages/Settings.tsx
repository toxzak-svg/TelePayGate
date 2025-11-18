import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { userService } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { queryClient } from '../api/queryClient';
import toast from 'react-hot-toast';
import { Key, Webhook, Copy, RefreshCw, Check } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

export default function Settings() {
  const { user, login } = useAuth();
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(user?.webhookUrl || '');

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['user-profile'],
    queryFn: userService.getProfile,
  });

  const regenerateMutation = useMutation({
    mutationFn: userService.regenerateApiKey,
    onSuccess: async (data) => {
      await login(data.apiKey);
      toast.success('API key regenerated successfully');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to regenerate API key');
    },
  });

  const updateWebhookMutation = useMutation({
    mutationFn: userService.updateWebhookUrl,
    onSuccess: () => {
      toast.success('Webhook URL updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update webhook URL');
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

  function handleRegenerateConfirm() {
    if (
      window.confirm(
        'Are you sure? This will invalidate your current API key and you will need to update it in your applications.'
      )
    ) {
      regenerateMutation.mutate();
    }
  }

  function handleWebhookUpdate() {
    if (!webhookUrl.trim()) {
      toast.error('Please enter a valid webhook URL');
      return;
    }

    if (!webhookUrl.startsWith('http://') && !webhookUrl.startsWith('https://')) {
      toast.error('Webhook URL must start with http:// or https://');
      return;
    }

    updateWebhookMutation.mutate(webhookUrl);
  }

  if (error) {
    return <ErrorMessage error={error} title="Failed to load settings" retry={refetch} />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6 max-w-2xl">
        {/* API Key Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">API Key</h2>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Use this API key to authenticate requests to the payment gateway
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50 text-gray-700"
                value={user?.apiKey || ''}
                readOnly
              />
              <button
                onClick={handleCopy}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium"
              >
                {copied ? (
                  <>
                    <Check className="h-5 w-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    Copy
                  </>
                )}
              </button>
            </div>

            <button
              onClick={handleRegenerateConfirm}
              disabled={regenerateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-5 w-5 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
              {regenerateMutation.isPending ? 'Regenerating...' : 'Regenerate API Key'}
            </button>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Regenerating your API key will invalidate the current key
                and require you to update it in all your applications.
              </p>
            </div>
          </div>
        </div>

        {/* Webhook Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Webhook className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Webhook Configuration</h2>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Configure where payment and conversion events should be sent
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <input
                id="webhookUrl"
                type="url"
                placeholder="https://your-domain.com/webhooks"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>

            <button
              onClick={handleWebhookUpdate}
              disabled={updateWebhookMutation.isPending || webhookUrl === user?.webhookUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateWebhookMutation.isPending ? 'Saving...' : 'Save Webhook URL'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Webhook Events</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <span className="text-gray-700">payment.received</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <span className="text-gray-700">conversion.completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <span className="text-gray-700">settlement.processed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{profile?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform Fee:</span>
              <span className="font-medium text-gray-900">
                {profile?.platformFeePercentage
                  ? `${(profile.platformFeePercentage * 100).toFixed(2)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Account Created:</span>
              <span className="font-medium text-gray-900">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
