// =============================================================================
// Moonview Frontend — Application Shell
// Phase 8: Frontend Foundation
// =============================================================================

import { BrowserRouter } from 'react-router';
import { AuthProvider } from './contexts/AuthContext.js';
import { AppRoutes } from './routes/index.js';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
