'use client';

import { useEffect } from 'react';
import { trackEventView } from '../../lib/analytics';

export function EventViewTracker({ eventSlug }) {
  useEffect(() => {
    trackEventView(eventSlug);
  }, [eventSlug]);

  return null;
}
