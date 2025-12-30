import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: {}, isLoading: false, error: undefined }),
}));

describe('Dashboard charts lazy load', () => {
  test('shows loading fallback for charts', async () => {
    // mock dynamic import to delay module resolution
    vi.doMock('../components/analytics/AnalyticsCharts', async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { default: () => <div>Charts Loaded</div> };
    });
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    const loading = await screen.findByText(/Loading charts/i);
    expect(loading).toBeInTheDocument();
  });
});

