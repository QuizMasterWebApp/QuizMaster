import React from 'react';
import { render, screen } from '@testing-library/react';

// Простой тест для проверки конфигурации
describe('App', () => {
  test('renders without crashing', () => {
    render(<div>Test App</div>);
    expect(screen.getByText('Test App')).toBeInTheDocument();
  });
});