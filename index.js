import React from 'react';
import { registerRootComponent } from 'expo';

import App from './App';
import { AuthProvider } from './lib/auth';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
// AuthProvider wraps the app so any component can read account state via useAuth.
function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

registerRootComponent(Root);
