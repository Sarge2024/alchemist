import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Estende os matchers do Vitest com os do Jest-DOM (toBeInTheDocument, etc)
expect.extend(matchers);

// Limpa o DOM após cada teste para evitar poluição entre suites
afterEach(() => {
  cleanup();
});
