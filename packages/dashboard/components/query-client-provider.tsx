'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query';

// Create QueryClient lazily to avoid SSR issues
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          if (failureCount < 3) return true;
          return false;
        },
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

function QueryClientProviderInner({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return <TanStackQueryClientProvider client={queryClient}>{children}</TanStackQueryClientProvider>;
}

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR, just render children without provider
  if (!mounted) {
    return <>{children}</>;
  }

  return <QueryClientProviderInner>{children}</QueryClientProviderInner>;
}
