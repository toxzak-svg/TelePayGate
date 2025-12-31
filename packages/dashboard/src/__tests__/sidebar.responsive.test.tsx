import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Sidebar from '../components/layout/Sidebar';
import { AuthProvider } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

describe('Sidebar responsive', () => {
  test('closed sidebar is offscreen on mobile', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Sidebar isOpen={false} onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );
    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(nav.className).toMatch(/-translate-x-full/);
  });

  test('open sidebar is visible', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Sidebar isOpen={true} onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );
    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(nav.className).toMatch(/translate-x-0/);
  });
});
