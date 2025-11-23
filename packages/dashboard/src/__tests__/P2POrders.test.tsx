import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import P2POrders from '../pages/P2POrders';
import * as services from '../api/services';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('P2POrders cancel flow', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    queryClient.clear();
  });

  it('shows confirm dialog and calls cancelOrder', async () => {
    const mockOrder = {
      id: 'order1',
      type: 'sell',
      userId: 'user1',
      starsAmount: 100,
      tonAmount: '0.1',
      rate: '100',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const getOrders = vi.spyOn(services.p2pService, 'getOrders').mockResolvedValue({ items: [mockOrder], meta: { total: 1 } } as any);
    const cancelOrder = vi.spyOn(services.p2pService, 'cancelOrder').mockResolvedValue(undefined as any);

    render(
      <QueryClientProvider client={queryClient}>
        <P2POrders />
      </QueryClientProvider>
    );

    // wait for table row
    await waitFor(() => expect(screen.getByText('order1')).toBeInTheDocument());

    // click cancel
    userEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    // confirm dialog should appear
    await waitFor(() => expect(screen.getByText(/Cancel Order/)).toBeInTheDocument());

    userEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith('order1'));
  });
});
