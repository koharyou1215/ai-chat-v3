'use client';

import React, { useState, useEffect, ReactNode } from 'react';

interface ClientOnlyProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ClientOnlyProvider component that ensures content is only rendered on the client side
 * This prevents hydration mismatches for components that depend on browser-only APIs
 */
export const ClientOnlyProvider: React.FC<ClientOnlyProviderProps> = ({ 
  children, 
  fallback = null 
}) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ClientOnlyProvider;