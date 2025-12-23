// statisticsMethods.test.js - дополненные тесты

import {
  getQuizStatistics,
  getAttemptAnswersForAnalysis,
  getQuestionDetails
} from '../statisticsMethods';
import apiClient from '../.APIclient';
import Cookies from 'js-cookie';

jest.mock('../.APIclient');
jest.mock('js-cookie');

describe('statisticsMethods Extended Edge Cases', () => {
  const mockToken = 'test-token';
  const mockQuizId = 123;
  const mockAttemptId = 456;
  const mockQuestionId = 789;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('Edge Cases для getQuizStatistics', () => {
    test('обрабатывает отсутствие токена (Cookies.get возвращает null)', async () => {
      Cookies.get.mockReturnValue(null);

      await expect(getQuizStatistics(mockQuizId))
        .rejects.toThrow('Требуется авторизация для получения статистики');
    });

    test('обрабатывает отсутствие токена (Cookies.get возвращает undefined)', async () => {
      Cookies.get.mockReturnValue(undefined);

      await expect(getQuizStatistics(mockQuizId))
        .rejects.toThrow('Требуется авторизация для получения статистики');
    });

    test('обрабатывает пустую строку токена', async () => {
      Cookies.get.mockReturnValue(''); // Пустая строка

      await expect(getQuizStatistics(mockQuizId))
        .rejects.toThrow('Требуется авторизация для получения статистики');
    });

    test('обрабатывает ответ сервера с undefined data', async () => {
      Cookies.get.mockReturnValue(mockToken);
      apiClient.get.mockResolvedValue({}); // Нет свойства data

      const result = await getQuizStatistics(mockQuizId);

      expect(result).toEqual([]);
    });

    test('обрабатывает ошибку 403 (нет прав)', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const error403 = {
        response: { status: 403 }
      };
      apiClient.get.mockRejectedValue(error403);

      await expect(getQuizStatistics(mockQuizId))
        .rejects.toThrow('У вас нет прав для просмотра статистики этого квиза');
    });

    test('обрабатывает ошибку 404 (квиз не найден)', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const error404 = {
        response: { status: 404 }
      };
      apiClient.get.mockRejectedValue(error404);

      await expect(getQuizStatistics(99999))
        .rejects.toThrow('Квиз с ID 99999 не найден');
    });

    test('обрабатывает сетевую ошибку без response', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const networkError = new Error('Network Error');
      apiClient.get.mockRejectedValue(networkError);

      await expect(getQuizStatistics(mockQuizId))
        .rejects.toThrow('Network Error');
    });

    test('обрабатывает дробный quizId', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const floatQuizId = 123.45;
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getQuizStatistics(floatQuizId);

      expect(result).toEqual([]);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Quiz/${floatQuizId}/attempts`,
        expect.any(Object)
      );
    });

    test('обрабатывает отрицательный quizId', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const negativeQuizId = -123;
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getQuizStatistics(negativeQuizId);

      expect(result).toEqual([]);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Quiz/${negativeQuizId}/attempts`,
        expect.any(Object)
      );
    });

    test('обрабатывает очень большой quizId', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const largeQuizId = 999999999;
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getQuizStatistics(largeQuizId);

      expect(result).toEqual([]);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Quiz/${largeQuizId}/attempts`,
        expect.any(Object)
      );
    });

    test('обрабатывает ответ сервера с не-массивом data', async () => {
      Cookies.get.mockReturnValue(mockToken);
      // Сервер вернул объект вместо массива
      apiClient.get.mockResolvedValue({ 
        data: { 
          attempts: [],
          count: 0 
        } 
      });

      const result = await getQuizStatistics(mockQuizId);

      expect(result).toEqual({
        attempts: [],
        count: 0
      });
    });

    test('обрабатывает ответ сервера с строкой в data', async () => {
      Cookies.get.mockReturnValue(mockToken);
      apiClient.get.mockResolvedValue({ data: 'error message' });

      const result = await getQuizStatistics(mockQuizId);

      expect(result).toEqual('error message');
    });

    test('логирует ошибку при неудачном запросе', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const error = new Error('API Error');
      apiClient.get.mockRejectedValue(error);

      await expect(getQuizStatistics(mockQuizId))
        .rejects.toThrow('API Error');

      expect(console.error).toHaveBeenCalledWith(
        `Ошибка при получении статистики квиза ${mockQuizId}:`,
        error
      );
    });
  });

  describe('Edge Cases для getAttemptAnswersForAnalysis', () => {
    test('обрабатывает отсутствие токена (Cookies.get возвращает null)', async () => {
      Cookies.get.mockReturnValue(null);

      await expect(getAttemptAnswersForAnalysis(mockAttemptId))
        .rejects.toThrow('Требуется авторизация');
    });

    test('обрабатывает отсутствие токена (Cookies.get возвращает undefined)', async () => {
      Cookies.get.mockReturnValue(undefined);

      await expect(getAttemptAnswersForAnalysis(mockAttemptId))
        .rejects.toThrow('Требуется авторизация');
    });

    test('обрабатывает пустую строку токена', async () => {
      Cookies.get.mockReturnValue(''); // Пустая строка

      await expect(getAttemptAnswersForAnalysis(mockAttemptId))
        .rejects.toThrow('Требуется авторизация');
    });

    test('обрабатывает ответ сервера с null data', async () => {
      Cookies.get.mockReturnValue(mockToken);
      apiClient.get.mockResolvedValue({ data: null });

      const result = await getAttemptAnswersForAnalysis(mockAttemptId);

      expect(result).toEqual([]);
    });

    test('обрабатывает ответ сервера с undefined data', async () => {
      Cookies.get.mockReturnValue(mockToken);
      apiClient.get.mockResolvedValue({}); // Нет свойства data

      const result = await getAttemptAnswersForAnalysis(mockAttemptId);

      expect(result).toEqual([]);
    });

    test('обрабатывает сетевую ошибку без response', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const networkError = new Error('Network Error');
      apiClient.get.mockRejectedValue(networkError);

      await expect(getAttemptAnswersForAnalysis(mockAttemptId))
        .rejects.toThrow('Network Error');
    });

    test('обрабатывает дробный attemptId', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const floatAttemptId = 456.78;
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getAttemptAnswersForAnalysis(floatAttemptId);

      expect(result).toEqual([]);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Attempt/${floatAttemptId}/answers`,
        expect.any(Object)
      );
    });

    test('обрабатывает отрицательный attemptId', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const negativeAttemptId = -456;
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getAttemptAnswersForAnalysis(negativeAttemptId);

      expect(result).toEqual([]);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Attempt/${negativeAttemptId}/answers`,
        expect.any(Object)
      );
    });

    test('обрабатывает очень большой attemptId', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const largeAttemptId = 999999999;
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getAttemptAnswersForAnalysis(largeAttemptId);

      expect(result).toEqual([]);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Attempt/${largeAttemptId}/answers`,
        expect.any(Object)
      );
    });

    test('обрабатывает ответ сервера с не-массивом data', async () => {
      Cookies.get.mockReturnValue(mockToken);
      // Сервер вернул объект вместо массива
      apiClient.get.mockResolvedValue({ 
        data: { 
          answers: [],
          total: 0 
        } 
      });

      const result = await getAttemptAnswersForAnalysis(mockAttemptId);

      expect(result).toEqual({
        answers: [],
        total: 0
      });
    });

    test('обрабатывает ответ сервера с строкой в data', async () => {
      Cookies.get.mockReturnValue(mockToken);
      apiClient.get.mockResolvedValue({ data: 'error message' });

      const result = await getAttemptAnswersForAnalysis(mockAttemptId);

      expect(result).toBe('error message');
    });

    test('обрабатывает ответ сервера с boolean в data', async () => {
      Cookies.get.mockReturnValue(mockToken);
      apiClient.get.mockResolvedValue({ data: true });

      const result = await getAttemptAnswersForAnalysis(mockAttemptId);

      expect(result).toBe(true);
    });

    test('логирует ошибку при неудачном запросе', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const error = new Error('API Error');
      apiClient.get.mockRejectedValue(error);

      await expect(getAttemptAnswersForAnalysis(mockAttemptId))
        .rejects.toThrow('API Error');

      expect(console.error).toHaveBeenCalledWith(
        `Ошибка при получении ответов попытки ${mockAttemptId}:`,
        error
      );
    });

    test('обрабатывает attemptId равный 0', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const zeroAttemptId = 0;
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getAttemptAnswersForAnalysis(zeroAttemptId);

      expect(result).toEqual([]);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Attempt/${zeroAttemptId}/answers`,
        expect.any(Object)
      );
    });

    test('обрабатывает attemptId как булево значение (преобразуется в строку)', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const boolAttemptId = true; // true будет преобразовано в 'true'
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getAttemptAnswersForAnalysis(boolAttemptId);

      expect(result).toEqual([]);
      expect(apiClient.get).toHaveBeenCalledWith(
        '/Attempt/true/answers',
        expect.any(Object)
      );
    });
  });

  describe('Edge Cases для getQuestionDetails', () => {
    test('успешно получает детали вопроса', async () => {
      const mockQuestion = {
        id: mockQuestionId,
        text: 'Тестовый вопрос',
        type: 0,
        options: [
          { id: 1, text: 'Опция 1', isCorrect: true },
          { id: 2, text: 'Опция 2', isCorrect: false }
        ]
      };
      
      apiClient.get.mockResolvedValue({ data: mockQuestion });

      const result = await getQuestionDetails(mockQuestionId);

      expect(result).toEqual(mockQuestion);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Question/${mockQuestionId}`
      );
    });

    test('обрабатывает дробный questionId', async () => {
      const floatQuestionId = 789.12;
      const mockQuestion = {
        id: floatQuestionId,
        text: 'Вопрос с дробным ID'
      };
      
      apiClient.get.mockResolvedValue({ data: mockQuestion });

      const result = await getQuestionDetails(floatQuestionId);

      expect(result).toEqual(mockQuestion);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Question/${floatQuestionId}`
      );
    });

    test('обрабатывает отрицательный questionId', async () => {
      const negativeQuestionId = -789;
      const mockQuestion = {
        id: negativeQuestionId,
        text: 'Вопрос с отрицательным ID'
      };
      
      apiClient.get.mockResolvedValue({ data: mockQuestion });

      const result = await getQuestionDetails(negativeQuestionId);

      expect(result).toEqual(mockQuestion);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Question/${negativeQuestionId}`
      );
    });

    test('обрабатывает очень большой questionId', async () => {
      const largeQuestionId = 999999999;
      const mockQuestion = {
        id: largeQuestionId,
        text: 'Вопрос с большим ID'
      };
      
      apiClient.get.mockResolvedValue({ data: mockQuestion });

      const result = await getQuestionDetails(largeQuestionId);

      expect(result).toEqual(mockQuestion);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Question/${largeQuestionId}`
      );
    });

    test('обрабатывает questionId равный 0', async () => {
      const zeroQuestionId = 0;
      const mockQuestion = {
        id: zeroQuestionId,
        text: 'Вопрос с нулевым ID'
      };
      
      apiClient.get.mockResolvedValue({ data: mockQuestion });

      const result = await getQuestionDetails(zeroQuestionId);

      expect(result).toEqual(mockQuestion);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Question/${zeroQuestionId}`
      );
    });

    test('обрабатывает questionId как булево значение (преобразуется в строку)', async () => {
      const boolQuestionId = false; // false будет преобразовано в 'false'
      const mockQuestion = {
        id: boolQuestionId,
        text: 'Вопрос с булевым ID'
      };
      
      apiClient.get.mockResolvedValue({ data: mockQuestion });

      const result = await getQuestionDetails(boolQuestionId);

      expect(result).toEqual(mockQuestion);
      expect(apiClient.get).toHaveBeenCalledWith(
        '/Question/false'
      );
    });

    test('обрабатывает ответ сервера с null data', async () => {
      apiClient.get.mockResolvedValue({ data: null });

      const result = await getQuestionDetails(mockQuestionId);

      expect(result).toBe(null);
    });

    test('обрабатывает ответ сервера с пустым объектом data', async () => {
      apiClient.get.mockResolvedValue({ data: {} });

      const result = await getQuestionDetails(mockQuestionId);

      expect(result).toEqual({});
    });

    test('обрабатывает ответ сервера с строкой в data', async () => {
      apiClient.get.mockResolvedValue({ data: 'error message' });

      const result = await getQuestionDetails(mockQuestionId);

      expect(result).toBe('error message');
    });

    test('обрабатывает ответ сервера с числом в data', async () => {
      apiClient.get.mockResolvedValue({ data: 123 });

      const result = await getQuestionDetails(mockQuestionId);

      expect(result).toBe(123);
    });

    test('обрабатывает ответ сервера с boolean в data', async () => {
      apiClient.get.mockResolvedValue({ data: true });

      const result = await getQuestionDetails(mockQuestionId);

      expect(result).toBe(true);
    });

    test('обрабатывает ответ сервера с массивом в data', async () => {
      const arrayData = [{ id: 1 }, { id: 2 }];
      apiClient.get.mockResolvedValue({ data: arrayData });

      const result = await getQuestionDetails(mockQuestionId);

      expect(result).toEqual(arrayData);
    });

    test('обрабатывает сетевую ошибку без response', async () => {
      const networkError = new Error('Network Error');
      apiClient.get.mockRejectedValue(networkError);

      await expect(getQuestionDetails(mockQuestionId))
        .rejects.toThrow('Network Error');

      expect(console.error).toHaveBeenCalledWith(
        `Ошибка при получении вопроса ${mockQuestionId}:`,
        networkError
      );
    });

    test('обрабатывает ошибку с response, но без status', async () => {
      const errorWithResponse = {
        response: {
          data: { message: 'Server error' }
          // Нет свойства status
        }
      };
      apiClient.get.mockRejectedValue(errorWithResponse);

      await expect(getQuestionDetails(mockQuestionId))
        .rejects.toEqual(errorWithResponse);

      expect(console.error).toHaveBeenCalledWith(
        `Ошибка при получении вопроса ${mockQuestionId}:`,
        errorWithResponse
      );
    });

    test('логирует ошибку при неудачном запросе', async () => {
      const error = new Error('API Error');
      apiClient.get.mockRejectedValue(error);

      await expect(getQuestionDetails(mockQuestionId))
        .rejects.toThrow('API Error');

      expect(console.error).toHaveBeenCalledWith(
        `Ошибка при получении вопроса ${mockQuestionId}:`,
        error
      );
    });
  });

  describe('Интеграционные сценарии', () => {
    test('полный сценарий анализа статистики: получение статистики квиза, ответов попытки и деталей вопроса', async () => {
      // Мокаем токен
      Cookies.get.mockReturnValue(mockToken);

      // 1. Получение статистики квиза
      const mockQuizStats = [
        {
          id: 1,
          attemptId: mockAttemptId,
          userId: 100,
          score: 8,
          timeSpent: '00:05:30',
          completedAt: '2024-01-15T10:30:00Z'
        },
        {
          id: 2,
          attemptId: 457,
          userId: 101,
          score: 6,
          timeSpent: '00:07:15',
          completedAt: '2024-01-15T11:30:00Z'
        }
      ];
      
      apiClient.get.mockResolvedValueOnce({ data: mockQuizStats });
      
      const quizStats = await getQuizStatistics(mockQuizId);
      expect(quizStats).toEqual(mockQuizStats);

      // 2. Получение ответов конкретной попытки
      const mockAttemptAnswers = [
        {
          id: 1,
          questionId: mockQuestionId,
          chosenOptionId: 1,
          isCorrect: true
        },
        {
          id: 2,
          questionId: 790,
          chosenOptionId: 3,
          isCorrect: false
        }
      ];
      
      apiClient.get.mockResolvedValueOnce({ data: mockAttemptAnswers });
      
      const attemptAnswers = await getAttemptAnswersForAnalysis(mockAttemptId);
      expect(attemptAnswers).toEqual(mockAttemptAnswers);

      // 3. Получение деталей вопроса для анализа
      const mockQuestionDetails = {
        id: mockQuestionId,
        text: 'Какой язык программирования используется в этом проекте?',
        type: 0,
        options: [
          { id: 1, text: 'JavaScript', isCorrect: true },
          { id: 2, text: 'Python', isCorrect: false },
          { id: 3, text: 'Java', isCorrect: false }
        ]
      };
      
      apiClient.get.mockResolvedValueOnce({ data: mockQuestionDetails });
      
      const questionDetails = await getQuestionDetails(mockQuestionId);
      expect(questionDetails).toEqual(mockQuestionDetails);
    });

    test('сценарий без авторизации: все методы бросают ошибки', async () => {
      // Мокаем отсутствие токена
      Cookies.get.mockReturnValue(null);

      // Проверяем, что все методы требуют авторизацию
      await expect(getQuizStatistics(mockQuizId))
        .rejects.toThrow('Требуется авторизация для получения статистики');

      await expect(getAttemptAnswersForAnalysis(mockAttemptId))
        .rejects.toThrow('Требуется авторизация');

      // getQuestionDetails не требует токена, должен работать
      const mockQuestion = { id: mockQuestionId, text: 'Вопрос' };
      apiClient.get.mockResolvedValue({ data: mockQuestion });
      
      const questionDetails = await getQuestionDetails(mockQuestionId);
      expect(questionDetails).toEqual(mockQuestion);
    });

    test('сценарий с ошибками на каждом этапе', async () => {
      // Мокаем токен
      Cookies.get.mockReturnValue(mockToken);

      // 1. Ошибка при получении статистики квиза
      const quizStatsError = new Error('Quiz not found');
      apiClient.get.mockRejectedValueOnce(quizStatsError);

      await expect(getQuizStatistics(99999))
        .rejects.toThrow('Quiz not found');

      // 2. Ошибка при получении ответов попытки
      const attemptAnswersError = new Error('Attempt not found');
      apiClient.get.mockRejectedValueOnce(attemptAnswersError);

      await expect(getAttemptAnswersForAnalysis(99999))
        .rejects.toThrow('Attempt not found');

      // 3. Ошибка при получении деталей вопроса
      const questionDetailsError = new Error('Question not found');
      apiClient.get.mockRejectedValueOnce(questionDetailsError);

      await expect(getQuestionDetails(99999))
        .rejects.toThrow('Question not found');
    });
  });

  describe('Граничные случаи производительности', () => {
    test('обрабатывает большое количество данных в статистике квиза', async () => {
      Cookies.get.mockReturnValue(mockToken);
      
      // Создаем 1000 записей статистики
      const largeStats = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        attemptId: mockAttemptId + i,
        userId: 100 + i,
        score: Math.floor(Math.random() * 10),
        timeSpent: `00:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        completedAt: `2024-01-${String((i % 30) + 1).padStart(2, '0')}T10:30:00Z`
      }));
      
      apiClient.get.mockResolvedValue({ data: largeStats });

      const result = await getQuizStatistics(mockQuizId);

      expect(result).toHaveLength(1000);
      expect(result[0].id).toBe(1);
      expect(result[999].id).toBe(1000);
    });

    test('обрабатывает большое количество ответов в попытке', async () => {
      Cookies.get.mockReturnValue(mockToken);
      
      // Создаем 500 ответов
      const largeAnswers = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        questionId: mockQuestionId + i,
        chosenOptionId: (i % 4) + 1,
        isCorrect: i % 2 === 0
      }));
      
      apiClient.get.mockResolvedValue({ data: largeAnswers });

      const result = await getAttemptAnswersForAnalysis(mockAttemptId);

      expect(result).toHaveLength(500);
      expect(result[0].id).toBe(1);
      expect(result[499].id).toBe(500);
    });
  });

  describe('Обработка специальных символов в ID', () => {
    test('обрабатывает ID с символами URL', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const specialId = '123-abc_456?test=1';
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getQuizStatistics(specialId);

      expect(result).toEqual([]);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Quiz/${specialId}/attempts`,
        expect.any(Object)
      );
    });

    test('обрабатывает ID с кириллицей', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const cyrillicId = 'вопрос123';
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getQuestionDetails(cyrillicId);

      expect(result).toEqual([]);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Question/${cyrillicId}`
      );
    });

    test('обрабатывает ID с эмодзи', async () => {
      Cookies.get.mockReturnValue(mockToken);
      const emojiId = '123😀456';
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getAttemptAnswersForAnalysis(emojiId);

      expect(result).toEqual([]);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Attempt/${emojiId}/answers`,
        expect.any(Object)
      );
    });
  });
});