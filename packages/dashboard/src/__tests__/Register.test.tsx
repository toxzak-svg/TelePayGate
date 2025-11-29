import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Register from '../pages/Register';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    register: vi.fn().mockResolvedValue({ apiKey: 'pk_test_123', apiSecret: 'sk_test_abc' }),
  }),
}));

describe('Register page', () => {
  it('validates required fields and shows credentials on success', async () => {
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );

    // initial create with missing app name shows validation error
    await userEvent.click(screen.getByRole('button', { name: /create app & api key/i }));
    expect(screen.getByText(/App name is required/i)).toBeInTheDocument();

    // fill form and submit
    const appField = screen.getByLabelText(/Application name/i);
    await userEvent.type(appField, 'Test App');

    const terms = screen.getByLabelText(/I accept the/i);
    await userEvent.click(terms);

    await userEvent.click(screen.getByRole('button', { name: /create app & api key/i }));

    await waitFor(() => expect(screen.getByText(/App created successfully/i)).toBeInTheDocument());
    // credentials displayed
    expect(screen.getByText(/pk_test_123/i)).toBeInTheDocument();
    expect(screen.getByText(/sk_test_abc/i)).toBeInTheDocument();
  });
});
