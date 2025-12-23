// Используйте require вместо import для совместимости
require('@testing-library/jest-dom');

// Моки для глобальных объектов
beforeEach(() => {
  // Мок для matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Мок для ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Мок для IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Мок для scrollTo
  window.scrollTo = jest.fn();

  // Мок для localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  };
  global.localStorage = localStorageMock;
  global.sessionStorage = localStorageMock;
});

// Чистим моки после каждого теста
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});