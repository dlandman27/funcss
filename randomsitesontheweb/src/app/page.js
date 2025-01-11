'use client';

import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    window.location.href = '/index.html';
  }, []);

  return null; // No need to render anything as we're redirecting
}
