import { renderHook, act, waitFor } from '@testing-library/react';
import { useCategories } from '../useCategories';
import * as api from '../../API methods/categoryMethods';

// Мокаем API методы
jest.mock('../../API methods/categoryMethods');

describe('useCategories Hook', () => {
  // Моковые данные
  const mockCategories = [
    { categoryType: 0, name: 'Общее' },
    { categoryType: 1, name: 'Наука' },
    { categoryType: 7, name: 'Технологии' }
  ];

  const mockCategory = { 
    id: 1, 
    categoryType: 1, 
    name: 'Наука' 
  };

  const mockQuizzes = [
    { id: 1, title: 'Квиз по физике', categoryId: 1 },
    { id: 2, title: 'Квиз по биологии', categoryId: 1 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Сбрасываем моки перед каждым тестом
    api.getAllCategories.mockReset();
    api.getCategoryById.mockReset();
    api.getQuizzesByCategory.mockReset();
  });

  describe('Начальное состояние', () => {
    test('возвращает начальные значения', () => {
      const { result } = renderHook(() => useCategories());

      expect(result.current.categories).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.loadCategories).toBe('function');
      expect(typeof result.current.getCategory).toBe('function');
      expect(typeof result.current.getCategoryQuizzes).toBe('function');
    });
  });

  describe('loadCategories', () => {
    test('успешно загружает категории', async () => {
      api.getAllCategories.mockResolvedValue(mockCategories);

      const { result } = renderHook(() => useCategories());

      // Проверяем начальное состояние
      expect(result.current.loading).toBe(false);
      expect(result.current.categories).toEqual([]);

      let loadResult;
      await act(async () => {
        loadResult = await result.current.loadCategories();
      });

      // Проверяем результат
      expect(loadResult).toEqual(mockCategories);
      expect(result.current.categories).toEqual(mockCategories);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(api.getAllCategories).toHaveBeenCalledTimes(1);
    });

    test('меняет состояние loading во время загрузки', async () => {
      // Создаем promise который мы можем контролировать
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = () => resolve(mockCategories);
      });
      
      api.getAllCategories.mockReturnValue(promise);

      const { result } = renderHook(() => useCategories());

      // Запускаем загрузку
      let loadPromise;
      act(() => {
        loadPromise = result.current.loadCategories();
      });

      // Проверяем, что loading стал true
      expect(result.current.loading).toBe(true);

      // Завершаем promise
      await act(async () => {
        resolvePromise();
        await loadPromise;
      });

      // Проверяем, что loading снова false
      expect(result.current.loading).toBe(false);
    });

    test('сбрасывает предыдущую ошибку при успешной загрузке', async () => {
      // Сначала эмулируем ошибку
      const mockError = new Error('First error');
      api.getAllCategories.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useCategories());

      // Пытаемся загрузить с ошибкой
      await act(async () => {
        try {
          await result.current.loadCategories();
        } catch (error) {
          // Ожидаемая ошибка
        }
      });

      // Проверяем, что ошибка установлена
      expect(result.current.error).toEqual(mockError);

      // Теперь эмулируем успешную загрузку
      api.getAllCategories.mockResolvedValueOnce(mockCategories);

      // Загружаем снова
      await act(async () => {
        await result.current.loadCategories();
      });

      // Проверяем, что ошибка сброшена
      expect(result.current.error).toBe(null);
      expect(result.current.categories).toEqual(mockCategories);
    });

    test('возвращает данные при успешной загрузке', async () => {
      api.getAllCategories.mockResolvedValue(mockCategories);

      const { result } = renderHook(() => useCategories());

      let returnedData;
      await act(async () => {
        returnedData = await result.current.loadCategories();
      });

      expect(returnedData).toEqual(mockCategories);
    });
  });

  describe('getCategory', () => {
    test('успешно получает категорию по ID', async () => {
      api.getCategoryById.mockResolvedValue(mockCategory);

      const { result } = renderHook(() => useCategories());

      let categoryResult;
      await act(async () => {
        categoryResult = await result.current.getCategory(1);
      });

      expect(categoryResult).toEqual(mockCategory);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(api.getCategoryById).toHaveBeenCalledWith(1);
      expect(api.getCategoryById).toHaveBeenCalledTimes(1);
    });

    test('не изменяет состояние categories при getCategory', async () => {
      api.getCategoryById.mockResolvedValue(mockCategory);

      const { result } = renderHook(() => useCategories());

      // Сначала загружаем категории
      api.getAllCategories.mockResolvedValue(mockCategories);
      await act(async () => {
        await result.current.loadCategories();
      });

      const categoriesBefore = result.current.categories;

      // Получаем одну категорию
      await act(async () => {
        await result.current.getCategory(1);
      });

      // categories не должен измениться
      expect(result.current.categories).toEqual(categoriesBefore);
      expect(result.current.categories).toEqual(mockCategories);
    });
  });

  describe('getCategoryQuizzes', () => {
    test('успешно получает квизы по категории', async () => {
      api.getQuizzesByCategory.mockResolvedValue(mockQuizzes);

      const { result } = renderHook(() => useCategories());

      let quizzesResult;
      await act(async () => {
        quizzesResult = await result.current.getCategoryQuizzes('Наука');
      });

      expect(quizzesResult).toEqual(mockQuizzes);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(api.getQuizzesByCategory).toHaveBeenCalledWith('Наука');
      expect(api.getQuizzesByCategory).toHaveBeenCalledTimes(1);
    });

    test('не изменяет состояние categories при getCategoryQuizzes', async () => {
      api.getQuizzesByCategory.mockResolvedValue(mockQuizzes);

      const { result } = renderHook(() => useCategories());

      // Сначала загружаем категории
      api.getAllCategories.mockResolvedValue(mockCategories);
      await act(async () => {
        await result.current.loadCategories();
      });

      const categoriesBefore = result.current.categories;

      // Получаем квизы
      await act(async () => {
        await result.current.getCategoryQuizzes('Наука');
      });

      // categories не должен измениться
      expect(result.current.categories).toEqual(categoriesBefore);
    });
  });

  describe('Взаимодействие методов', () => {
    test('независимые вызовы не мешают друг другу', async () => {
      api.getAllCategories.mockResolvedValue(mockCategories);
      api.getCategoryById.mockResolvedValue(mockCategory);
      api.getQuizzesByCategory.mockResolvedValue(mockQuizzes);

      const { result } = renderHook(() => useCategories());

      // Запускаем все три метода одновременно
      await act(async () => {
        const [categories, category, quizzes] = await Promise.all([
          result.current.loadCategories(),
          result.current.getCategory(1),
          result.current.getCategoryQuizzes('Наука')
        ]);

        expect(categories).toEqual(mockCategories);
        expect(category).toEqual(mockCategory);
        expect(quizzes).toEqual(mockQuizzes);
      });

      // Проверяем финальное состояние
      expect(result.current.categories).toEqual(mockCategories);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);

      expect(api.getAllCategories).toHaveBeenCalledTimes(1);
      expect(api.getCategoryById).toHaveBeenCalledTimes(1);
      expect(api.getQuizzesByCategory).toHaveBeenCalledTimes(1);
    });

    test('последняя ошибка перезаписывает предыдущую', async () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      
      api.getAllCategories.mockRejectedValueOnce(error1);
      api.getCategoryById.mockRejectedValueOnce(error2);

      const { result } = renderHook(() => useCategories());

      // Первый вызов с ошибкой
      await act(async () => {
        try {
          await result.current.loadCategories();
        } catch (error) {
          // Ожидаемая ошибка
        }
      });

      expect(result.current.error).toEqual(error1);

      // Второй вызов с другой ошибкой
      await act(async () => {
        try {
          await result.current.getCategory(1);
        } catch (error) {
          // Ожидаемая ошибка
        }
      });

      // Ошибка должна обновиться
      expect(result.current.error).toEqual(error2);
    });
  });

  describe('Специальные случаи', () => {
    test('работает с пустым массивом категорий', async () => {
      api.getAllCategories.mockResolvedValue([]);

      const { result } = renderHook(() => useCategories());

      await act(async () => {
        await result.current.loadCategories();
      });

      expect(result.current.categories).toEqual([]);
      expect(Array.isArray(result.current.categories)).toBe(true);
    });

    test('обрабатывает нестандартные ID категорий', async () => {
      const nonStandardCategory = { id: 'special-id', name: 'Специальная' };
      api.getCategoryById.mockResolvedValue(nonStandardCategory);

      const { result } = renderHook(() => useCategories());

      await act(async () => {
        await result.current.getCategory('special-id');
      });

      expect(api.getCategoryById).toHaveBeenCalledWith('special-id');
    });

    test('работает с категориями с пробелами в названии', async () => {
      const quizzes = [{ id: 1, title: 'Квиз' }];
      api.getQuizzesByCategory.mockResolvedValue(quizzes);

      const { result } = renderHook(() => useCategories());

      await act(async () => {
        await result.current.getCategoryQuizzes('Искусство и культура');
      });

      expect(api.getQuizzesByCategory).toHaveBeenCalledWith('Искусство и культура');
    });

    test('обрабатывает null/undefined ответы от API', async () => {
      api.getAllCategories.mockResolvedValue(null);

      const { result } = renderHook(() => useCategories());

      await act(async () => {
        await result.current.loadCategories();
      });

      expect(result.current.categories).toBe(null);
    });

    test('работает с большим количеством категорий', async () => {
      const manyCategories = Array.from({ length: 100 }, (_, i) => ({
        categoryType: i,
        name: `Категория ${i}`
      }));
      
      api.getAllCategories.mockResolvedValue(manyCategories);

      const { result } = renderHook(() => useCategories());

      await act(async () => {
        await result.current.loadCategories();
      });

      expect(result.current.categories).toHaveLength(100);
      expect(result.current.categories[99].name).toBe('Категория 99');
    });
  });

  describe('Мемоизация функций', () => {
    test('функции стабильны между рендерами', () => {
      const { result, rerender } = renderHook(() => useCategories());

      const firstLoadCategories = result.current.loadCategories;
      const firstGetCategory = result.current.getCategory;
      const firstGetCategoryQuizzes = result.current.getCategoryQuizzes;

      // Перерендериваем
      rerender();

      expect(result.current.loadCategories).toBe(firstLoadCategories);
      expect(result.current.getCategory).toBe(firstGetCategory);
      expect(result.current.getCategoryQuizzes).toBe(firstGetCategoryQuizzes);
    });

    test('функции стабильны после вызова', async () => {
      api.getAllCategories.mockResolvedValue(mockCategories);

      const { result, rerender } = renderHook(() => useCategories());

      const initialLoadCategories = result.current.loadCategories;

      // Вызываем функцию
      await act(async () => {
        await result.current.loadCategories();
      });

      // Перерендериваем
      rerender();

      // Функция должна остаться той же
      expect(result.current.loadCategories).toBe(initialLoadCategories);
    });
  });
});