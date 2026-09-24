/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GoreboxGame3D } from './components/GoreboxGame3D';

export default function App() {
  return (
    <main id="app-root" className="w-full h-full min-h-screen bg-black overflow-hidden select-none">
      <GoreboxGame3D />
    </main>
  );
}


