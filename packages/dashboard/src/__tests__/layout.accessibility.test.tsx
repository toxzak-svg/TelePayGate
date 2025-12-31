import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { AuthProvider } from '../context/AuthContext';

describe('Layout accessibility', () => {
  test('renders skip to content link', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Layout />
        </AuthProvider>
      </BrowserRouter>
    );
    const skip = await screen.findByRole('link', { name: /skip to content/i });
    expect(skip).toBeInTheDocument();
    expect(skip).toHaveAttribute('href', '#main');
  });
});
