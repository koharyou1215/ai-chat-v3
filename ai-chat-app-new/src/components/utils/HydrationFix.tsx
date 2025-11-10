'use client';

import { useEffect, useState } from 'react';

export default function HydrationFix() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for hydration to complete before cleaning up extension attributes
    setHydrated(true);

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      try {
        // Remove browser extension attributes that cause hydration mismatches
        const html = document.documentElement;
        const body = document.body;

        // Common browser extension attributes that cause hydration issues
        const extensionAttributes = [
          'data-search-extension',
          'data-extension-installed',
          'data-browser-extension',
          'data-grammarly-extension',
          'data-lastpass-extension',
          'cz-shortcut-listen', // Colorzilla extension
        ];

        extensionAttributes.forEach(attr => {
          if (html.hasAttribute(attr)) {
            html.removeAttribute(attr);
          }
          if (body.hasAttribute(attr)) {
            body.removeAttribute(attr);
          }
        });

        // Also handle any style attributes added by extensions
        const extensionStyles = document.querySelectorAll('[style*="extension"]');
        extensionStyles.forEach(el => {
          if (el.getAttribute('style')?.includes('extension')) {
            el.removeAttribute('style');
          }
        });
      } catch (error) {
        console.warn('HydrationFix cleanup failed:', error);
      }
    });
  }, []);

  return null;
}