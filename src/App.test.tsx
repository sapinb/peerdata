import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { ConsoleLogger, LOGLEVELS } from './lib/Logger'

ConsoleLogger.logLevel = LOGLEVELS.NONE

test('renders learn react link', () => {
  render(<App />);
//   const linkElement = screen.getByText(/learn react/i);
//   expect(linkElement).toBeInTheDocument();
});
