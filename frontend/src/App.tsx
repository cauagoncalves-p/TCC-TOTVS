import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { Providers } from './app/providers';
import { router } from './app/router';
import { VLibrasWidget } from './components/accessibility/VLibrasWidget';
import { useAccessibilityPrefs } from './features/accessibility/hooks/useAccessibilityPrefs';

export const App: React.FC = () => {
  const { vlibrasEnabled } = useAccessibilityPrefs();

  return (
    <Providers>
      <RouterProvider router={router} />
      <VLibrasWidget enabled={vlibrasEnabled} />
    </Providers>
  );
};

export default App;
