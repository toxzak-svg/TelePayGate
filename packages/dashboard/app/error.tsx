'use client';

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 border rounded-lg bg-card">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-center">Something went wrong</h1>
          <p className="text-center text-muted-foreground">An error occurred while loading this page</p>
          <Link 
            href="/dashboard"
            onClick={reset}
            className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-center hover:bg-primary/90"
          >
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
}
