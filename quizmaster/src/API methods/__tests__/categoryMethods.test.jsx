import { getAllCategories, getCategoryById, getQuizzesByCategory } from '../categoryMethods';
import apiClient from '../.APIclient';

// Mock the apiClient
jest.mock('../.APIclient');

describe('categoryMethods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to track calls
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAllCategories', () => {
    it('должен успешно получать категории и возвращать массив', async () => {
      // Arrange
      const mockCategories = [
        { categoryType: 0, name: 'Science' },
        { categoryType: 1, name: 'Technology' }
      ];
      
      apiClient.get.mockResolvedValue({ data: mockCategories });

      // Act
      const result = await getAllCategories();

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith('/Category');
      expect(console.log).toHaveBeenCalledWith('Запрос категорий к API...');
      expect(console.log).toHaveBeenCalledWith('Ответ от API категорий:', mockCategories);
      expect(result).toEqual(mockCategories);
    });

    it('должен возвращать пустой массив если данные некорректного формата', async () => {
      // Arrange
      apiClient.get.mockResolvedValue({ data: { notAnArray: true } });

      // Act
      const result = await getAllCategories();

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith('/Category');
      expect(console.error).toHaveBeenCalledWith('Некорректный формат данных категорий:', { notAnArray: true });
      expect(result).toEqual([]);
    });

    it('должен возвращать пустой массив если ответ пустой', async () => {
      // Arrange
      apiClient.get.mockResolvedValue({ data: null });

      // Act
      const result = await getAllCategories();

      // Assert
      expect(console.error).toHaveBeenCalledWith('Некорректный формат данных категорий:', null);
      expect(result).toEqual([]);
    });

    it('должен обрабатывать ошибку сети', async () => {
      // Arrange
      const networkError = new Error('Network Error');
      apiClient.get.mockRejectedValue(networkError);

      // Act & Assert
      await expect(getAllCategories()).rejects.toThrow('Network Error');
      expect(console.error).toHaveBeenCalledWith('Ошибка при получении категорий:', networkError);
      expect(console.error).toHaveBeenCalledWith('Ошибка настройки запроса:', 'Network Error');
    });

    it('должен обрабатывать ошибку с response', async () => {
      // Arrange
      const errorWithResponse = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
          headers: { 'content-type': 'application/json' }
        }
      };
      apiClient.get.mockRejectedValue(errorWithResponse);

      // Act & Assert
      await expect(getAllCategories()).rejects.toEqual(errorWithResponse);
      expect(console.error).toHaveBeenCalledWith('Ошибка при получении категорий:', errorWithResponse);
      expect(console.error).toHaveBeenCalledWith('Статус ошибки:', 500);
      expect(console.error).toHaveBeenCalledWith('Данные ошибки:', { message: 'Internal Server Error' });
      expect(console.error).toHaveBeenCalledWith('Заголовки ошибки:', { 'content-type': 'application/json' });
    });

    it('должен обрабатывать ошибку с request', async () => {
      // Arrange
      const errorWithRequest = {
        request: { status: 0 },
        message: 'No response received'
      };
      apiClient.get.mockRejectedValue(errorWithRequest);

      // Act & Assert
      await expect(getAllCategories()).rejects.toEqual(errorWithRequest);
      expect(console.error).toHaveBeenCalledWith('Ошибка при получении категорий:', errorWithRequest);
      expect(console.error).toHaveBeenCalledWith('Запрос был сделан, но ответ не получен:', { status: 0 });
    });
  });

  describe('getCategoryById', () => {
    it('должен успешно получать категорию по ID', async () => {
      // Arrange
      const categoryId = 1;
      const mockCategory = { categoryType: 1, name: 'Technology' };
      apiClient.get.mockResolvedValue({ data: mockCategory });

      // Act
      const result = await getCategoryById(categoryId);

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith(`/Category/${categoryId}`);
      expect(result).toEqual(mockCategory);
    });

    it('должен пробрасывать другие ошибки', async () => {
      // Arrange
      const categoryId = 1;
      const serverError = new Error('Server Error');
      apiClient.get.mockRejectedValue(serverError);

      // Act & Assert
      await expect(getCategoryById(categoryId)).rejects.toThrow('Server Error');
      expect(console.error).toHaveBeenCalledWith(`Ошибка при получении категории ${categoryId}:`, serverError);
    });
  });

  describe('getQuizzesByCategory', () => {
    it('должен успешно получать квизы по названию категории', async () => {
      // Arrange
      const categoryName = 'Science';
      const mockQuizzes = [
        { id: 1, title: 'Science Quiz 1' },
        { id: 2, title: 'Science Quiz 2' }
      ];
      apiClient.get.mockResolvedValue({ data: mockQuizzes });

      // Act
      const result = await getQuizzesByCategory(categoryName);

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith(`/Quiz/by-category/${categoryName}`);
      expect(result).toEqual(mockQuizzes);
    });

    it('должен бросать ошибку если категория не найдена (404)', async () => {
      // Arrange
      const categoryName = 'NonExistent';
      const error404 = {
        response: { status: 404 }
      };
      apiClient.get.mockRejectedValue(error404);

      // Act & Assert
      await expect(getQuizzesByCategory(categoryName)).rejects.toThrow(
        `Категория "${categoryName}" не найдена или в ней нет квизов`
      );
      expect(console.error).toHaveBeenCalledWith(
        `Ошибка при получении квизов категории ${categoryName}:`,
        error404
      );
    });

    it('должен бросать ошибку если некорректное название категории (400)', async () => {
      // Arrange
      const categoryName = 'Invalid@Category';
      const error400 = {
        response: { status: 400 }
      };
      apiClient.get.mockRejectedValue(error400);

      // Act & Assert
      await expect(getQuizzesByCategory(categoryName)).rejects.toThrow(
        `Некорректное название категории: ${categoryName}`
      );
      expect(console.error).toHaveBeenCalledWith(
        `Ошибка при получении квизов категории ${categoryName}:`,
        error400
      );
    });

    it('должен пробрасывать другие ошибки', async () => {
      // Arrange
      const categoryName = 'Science';
      const networkError = new Error('Network Error');
      apiClient.get.mockRejectedValue(networkError);

      // Act & Assert
      await expect(getQuizzesByCategory(categoryName)).rejects.toThrow('Network Error');
      expect(console.error).toHaveBeenCalledWith(
        `Ошибка при получении квизов категории ${categoryName}:`,
        networkError
      );
    });

    it('должен обрабатывать ошибки без response', async () => {
      // Arrange
      const categoryName = 'Science';
      const genericError = new Error('Generic Error');
      apiClient.get.mockRejectedValue(genericError);

      // Act & Assert
      await expect(getQuizzesByCategory(categoryName)).rejects.toThrow('Generic Error');
    });
  });
});