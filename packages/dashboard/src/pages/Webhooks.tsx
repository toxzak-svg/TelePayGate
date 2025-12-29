import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { webhookService, userService } from '../api/services';
import { CheckCircle, XCircle, Loader2, Send, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Webhooks() {
  const queryClient = useQueryClient();
  
  const { data: events, isLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: () => webhookService.getWebhookEvents({ limit: 20 }),
  });

  const { data: user } = useQuery({
    queryKey: ['user-profile'],
    queryFn: userService.getProfile,
  });

  const [webhookUrl, setWebhookUrl] = useState('');

  // Sync webhook URL when user data loads
  useEffect(() => {
    if (user?.webhookUrl) {
      setWebhookUrl(user.webhookUrl);
    }
  }, [user?.webhookUrl]);

  const updateWebhook = useMutation({
    mutationFn: (url: string) => userService.updateWebhookUrl(url),
    onSuccess: () => {
      toast.success('Webhook URL updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update webhook URL');
      }
    },
  });

  const testWebhook = useMutation({
    mutationFn: () => userService.testWebhook(),
    onSuccess: (data) => {
      toast.success(data?.message || 'Test webhook sent successfully');
      // Refetch events after a short delay to show the test event
      setTimeout(() => refetchEvents(), 1000);
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to send test webhook');
      }
    },
  });

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith('https://') || url.startsWith('http://');
    } catch {
      return false;
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Webhook Configuration</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl mb-6">
        <p className="text-gray-600 text-sm mb-4">
          Configure where payment and conversion events should be sent. 
          We recommend using HTTPS endpoints for security.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://your-domain.com/webhooks"
            className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              webhookUrl && !isValidUrl(webhookUrl) ? 'border-red-300' : 'border-gray-300'
            }`}
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <button
            onClick={() => updateWebhook.mutate(webhookUrl)}
            disabled={updateWebhook.isPending || !webhookUrl || !isValidUrl(webhookUrl)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {updateWebhook.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save
          </button>
          <button
            onClick={() => testWebhook.mutate()}
            disabled={testWebhook.isPending || !user?.webhookUrl}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title={!user?.webhookUrl ? 'Save a webhook URL first' : 'Send test webhook'}
          >
            {testWebhook.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Test
          </button>
        </div>
        {webhookUrl && !isValidUrl(webhookUrl) && (
          <p className="text-red-500 text-xs mt-2">Please enter a valid URL starting with http:// or https://</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Webhook Deliveries</h2>
          <button
            onClick={() => refetchEvents()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading events...</span>
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-2">
            {events?.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  {e.status === 'delivered' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{e.event}</p>
                    <p className="text-xs text-gray-500">{new Date(e.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    e.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {e.statusCode || e.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No webhook events yet</p>
            <p className="text-sm mt-1">Events will appear here once webhooks are triggered</p>
          </div>
        )}
      </div>
    </div>
  );
}
