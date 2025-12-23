import { renderHook, act, waitFor } from '@testing-library/react';
import { usePrivateQuizAccess } from '../usePrivateQuizAccess.jsx';
import * as quizApi from '../../API methods/quizMethods.jsx';

// Мокаем модули
jest.mock('../../API methods/quizMethods.jsx');
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn()
}));

describe('usePrivateQuizAccess', () => {
  beforeEach(() => {
    // Очищаем localStorage перед каждым тестом
    localStorage.clear();
    // Очищаем все моки
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('должен иметь начальное состояние', () => {
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      expect(result.current.hasAccess).toBe(false);
      expect(result.current.accessKey).toBe('');
      expect(result.current.loading).toBe(true);
    });
  });

  describe('setSavedAccessKey', () => {
    it('должен сохранять ключ в localStorage', () => {
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      act(() => {
        result.current.setSavedAccessKey(123, 'ABC12');
      });
      
      expect(localStorage.getItem('quiz_access_123')).toBe('ABC12');
    });

    it('должен сохранять ключ в верхнем регистре', () => {
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      act(() => {
        result.current.setSavedAccessKey(123, 'abc12');
      });
      
      expect(localStorage.getItem('quiz_access_123')).toBe('ABC12');
    });
  });

  describe('getSavedAccessKey', () => {
    it('должен возвращать сохраненный ключ', () => {
      localStorage.setItem('quiz_access_123', 'ABC12');
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      const key = result.current.getSavedAccessKey(123);
      expect(key).toBe('ABC12');
    });

    it('должен возвращать null если ключ не найден', () => {
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      const key = result.current.getSavedAccessKey(999);
      expect(key).toBeNull();
    });
  });

  describe('grantAccess', () => {
    it('должен предоставлять доступ при валидном ключе', async () => {
      const mockResponse = { quizId: 123 };
      quizApi.connectToQuizByCode.mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      await act(async () => {
        const response = await result.current.grantAccess(123, 'ABC12');
        
        expect(response).toEqual({
          success: true,
          quizInfo: mockResponse
        });
      });
      
      expect(result.current.hasAccess).toBe(true);
      expect(result.current.accessKey).toBe('ABC12');
      expect(localStorage.getItem('quiz_access_123')).toBe('ABC12');
    });

    it('должен выбрасывать ошибку если ключ не подходит для квиза', async () => {
      const mockResponse = { quizId: 456 }; // Другой quizId
      quizApi.connectToQuizByCode.mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      await expect(
        act(async () => {
          await result.current.grantAccess(123, 'ABC12');
        })
      ).rejects.toThrow('Ключ не подходит для этого квиза');
    });

    it('должен сохранять ключ при 403 ошибке', async () => {
      const error = {
        response: { status: 403 }
      };
      quizApi.connectToQuizByCode.mockRejectedValue(error);
      
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      await act(async () => {
        const response = await result.current.grantAccess(123, 'ABC12');
        
        expect(response).toEqual({
          success: true,
          quizInfo: { quizId: 123 }
        });
      });
      
      expect(result.current.hasAccess).toBe(true);
      expect(result.current.accessKey).toBe('ABC12');
      expect(localStorage.getItem('quiz_access_123')).toBe('ABC12');
    });

    it('должен выбрасывать другие ошибки', async () => {
      const error = new Error('Network error');
      quizApi.connectToQuizByCode.mockRejectedValue(error);
      
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      await expect(
        act(async () => {
          await result.current.grantAccess(123, 'ABC12');
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('checkAccess', () => {
    it('должен проверять доступ и устанавливать его при валидном ключе', async () => {
      const mockResponse = { quizId: 123 };
      localStorage.setItem('quiz_access_123', 'ABC12');
      quizApi.connectToQuizByCode.mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      await act(async () => {
        await result.current.checkAccess(123);
      });
      
      expect(result.current.hasAccess).toBe(true);
      expect(result.current.accessKey).toBe('ABC12');
      expect(result.current.loading).toBe(false);
    });

    it('должен удалять невалидный ключ', async () => {
      const error = new Error('Invalid key');
      localStorage.setItem('quiz_access_123', 'INVALID');
      quizApi.connectToQuizByCode.mockRejectedValue(error);
      
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      await act(async () => {
        await result.current.checkAccess(123);
      });
      
      expect(result.current.hasAccess).toBe(false);
      expect(result.current.accessKey).toBe('');
      expect(localStorage.getItem('quiz_access_123')).toBeNull();
    });

    it('должен сохранять доступ при 403 ошибке', async () => {
      const error = {
        response: { status: 403 }
      };
      localStorage.setItem('quiz_access_123', 'ABC12');
      quizApi.connectToQuizByCode.mockRejectedValue(error);
      
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      await act(async () => {
        const key = await result.current.checkAccess(123);
        expect(key).toBe('ABC12');
      });
      
      expect(result.current.hasAccess).toBe(true);
      expect(result.current.accessKey).toBe('ABC12');
    });

    it('должен удалять ключ если он не подходит для квиза', async () => {
      const mockResponse = { quizId: 456 }; // Другой quizId
      localStorage.setItem('quiz_access_123', 'ABC12');
      quizApi.connectToQuizByCode.mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      await act(async () => {
        await result.current.checkAccess(123);
      });
      
      expect(result.current.hasAccess).toBe(false);
      expect(result.current.accessKey).toBe('');
      expect(localStorage.getItem('quiz_access_123')).toBeNull();
    });

    it('должен обрабатывать отсутствие ключа', async () => {
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      await act(async () => {
        await result.current.checkAccess(123);
      });
      
      expect(result.current.hasAccess).toBe(false);
      expect(result.current.accessKey).toBe('');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('revokeAccess', () => {
    it('должен отзывать доступ', () => {
      localStorage.setItem('quiz_access_123', 'ABC12');
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      // Сначала устанавливаем доступ
      act(() => {
        result.current.setHasAccess(true);
        result.current.setAccessKey('ABC12');
      });
      
      // Затем отзываем
      act(() => {
        result.current.revokeAccess(123);
      });
      
      expect(result.current.hasAccess).toBe(false);
      expect(result.current.accessKey).toBe('');
      expect(localStorage.getItem('quiz_access_123')).toBeNull();
    });
  });

  describe('copyAccessKey', () => {
    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined)
        }
      });
    });

    it('должен копировать ключ в буфер обмена', async () => {
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      act(() => {
        result.current.setAccessKey('ABC12');
      });
      
      const success = await act(async () => {
        return result.current.copyAccessKey();
      });
      
      expect(success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABC12');
    });

    it('должен возвращать false если ключа нет', async () => {
      const { result } = renderHook(() => usePrivateQuizAccess());
      
      const success = await act(async () => {
        return result.current.copyAccessKey();
      });
      
      expect(success).toBe(false);
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
  });
});