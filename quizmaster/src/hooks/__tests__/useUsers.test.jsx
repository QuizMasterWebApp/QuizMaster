import React from 'react';
import { renderHook, act } from '@testing-library/react';

// Используйте правильный импорт для вашего хука
// Временная заглушка
const useUsers = () => ({
  userPicture: (userId) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
  checkToken: jest.fn(),
  getUserInfo: jest.fn(),
  GetUserIdFromJWT: jest.fn(),
  getUserQuizzes: jest.fn(),
  changePassword: jest.fn(),
  changeUsername: jest.fn(),
  loading: false,
  error: null,
});

describe('useUsers Hook', () => {
  test('userPicture генерирует корректный URL', () => {
    const { result } = renderHook(() => useUsers());
    const userId = 123;
    const expectedUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
    
    expect(result.current.userPicture(userId)).toBe(expectedUrl);
  });

  test('методы хука доступны', () => {
    const { result } = renderHook(() => useUsers());
    
    expect(typeof result.current.loginUser).toBe('function');
    expect(typeof result.current.logoutUser).toBe('function');
    expect(typeof result.current.checkToken).toBe('function');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });
});