import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import * as services from '../api/services';
import P2POrders from '../pages/P2POrders';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ApiResponse, P2POrder } from '../types';

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Provide a mutable mocked return for useQuery so we don't need a QueryClientProvider in tests
let mockedQueryReturn: { data: unknown; isLoading: boolean } = { data: null, isLoading: false };
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => mockedQueryReturn,
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

describe('P2POrders confirm/cancel flow', () => {
  beforeEach(() => {
    mockedQueryReturn = { data: null, isLoading: false };
  });

  it('shows confirm dialog and calls cancelOrder on confirm', async () => {
    const mockOrder = {
      id: 'order_1',
      type: 'sell',
      userId: 'user_1',
      starsAmount: 100,
      tonAmount: '0.1',
      rate: '1000',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(services.p2pService, 'getOrders').mockResolvedValue({
      success: true,
      data: [mockOrder],
      meta: { total: 1 },
    } as ApiResponse<P2POrder[]>);

    // feed the mockedQueryReturn so the component receives data without react-query provider
    mockedQueryReturn = { data: { success: true, data: [mockOrder], meta: { total: 1 } }, isLoading: false };
    const cancelSpy = vi.spyOn(services.p2pService, 'cancelOrder').mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <P2POrders />
      </BrowserRouter>
    );
    // wait for the row to appear
    await screen.findByText(/order_1/i);

    const user = userEvent.setup();
    const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
    const cancelButton = cancelButtons.find(b => (b.textContent || '').trim().toLowerCase() === 'cancel') || cancelButtons[0];
    await user.click(cancelButton as HTMLElement);

    // confirm dialog appears (heading)
    await screen.findByRole('heading', { name: /Cancel Order/i });

    const confirmButton = await screen.findByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    await waitFor(() => expect(cancelSpy).toHaveBeenCalledWith('order_1'), { timeout: 5000 });
  }, 20000);
});
