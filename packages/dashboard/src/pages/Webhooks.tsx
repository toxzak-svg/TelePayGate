import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { webhookService, userService } from '../api/services';
import { CheckCircle, XCircle } from 'lucide-react';

export default function Webhooks() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: () => webhookService.getWebhookEvents({ limit: 20 }),
  });

  const { data: user } = useQuery({
    queryKey: ['user-profile'],
    queryFn: userService.getProfile,
  });

  const [webhookUrl, setWebhookUrl] = useState(user?.webhookUrl || '');

  const updateWebhook = useMutation({
    mutationFn: (url: string) => userService.updateWebhookUrl(url),
    onSuccess: () => {
      // TODO: show toast
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Webhook Configuration</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl mb-6">
        <p className="text-gray-600 text-sm mb-4">Configure where payment and conversion events should be sent</p>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://your-domain.com/webhooks"
            className="flex-1 px-4 py-2 border rounded-lg"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <button
            onClick={() => updateWebhook.mutate(webhookUrl)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Save
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Webhook Deliveries</h2>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-2">
            {events?.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
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
                <span className="text-xs text-gray-600">{e.statusCode || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
