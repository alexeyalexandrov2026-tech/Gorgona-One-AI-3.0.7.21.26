'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center text-zinc-100">
      <h2 className="mb-4 font-display text-2xl font-medium tracking-wide">Something went wrong</h2>
      <p className="mb-8 max-w-md text-sm text-zinc-400">
        We encountered an unexpected error while loading this section. You can try recovering by clicking the button below.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-full bg-white px-8 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
      >
        Try again
      </button>
    </div>
  );
}
