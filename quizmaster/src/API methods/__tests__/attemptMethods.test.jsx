import {
  startAttempt,
  finishAttempt,
  getAttemptById,
  getAttemptAnswers,
  getUserAttempts,
  getLeaderboard,
  getLeaderboardSimple,
  getBestAttemptsPerUser,
  parseTime
} from '../attemptMethods';
import apiClient from '../.APIclient';
import Cookies from 'js-cookie';

// Мокаем только внешние зависимости
jest.mock('../.APIclient');
jest.mock('js-cookie');

describe('attemptMethods API', () => {
  // Моковые данные для тестов
  const mockToken = 'test-jwt-token';
  const mockUserId = 123;
  const mockQuizId = 456;
  const mockAttemptId = 789;
  const mockGuestSessionId = 'guest-session-123';

  // Сброс всех моков перед каждым тестом
  beforeEach(() => {
    jest.clearAllMocks();
    // Сбрасываем моковые значения куки
    Cookies.get.mockReset();
    Cookies.set.mockReset();
  });

  describe('startAttempt', () => {
    test('успешно начинает попытку без accessKey', async () => {
      const mockResponse = {
        data: {
          id: mockAttemptId,
          quizId: mockQuizId,
          startedAt: '2024-01-01T10:00:00Z',
          guestSessionId: null
        }
      };
      
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await startAttempt(mockToken, mockQuizId);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith(
        `/attempt/${mockQuizId}/start`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${mockToken}`
          }
        }
      );
    });

    test('успешно начинает попытку с accessKey', async () => {
      const mockResponse = {
        data: {
          id: mockAttemptId,
          quizId: mockQuizId,
          startedAt: '2024-01-01T10:00:00Z',
          guestSessionId: 'guest-session-456'
        }
      };
      
      apiClient.post.mockResolvedValue(mockResponse);
      const accessKey = 'ABCDE';

      const result = await startAttempt(mockToken, mockQuizId, accessKey);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith(
        `/attempt/${mockQuizId}/start?accessKey=${accessKey}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${mockToken}`
          }
        }
      );
    });

    test('обрабатывает ошибку при начале попытки', async () => {
      const error = new Error('Failed to start attempt');
      apiClient.post.mockRejectedValue(error);

      await expect(startAttempt(mockToken, mockQuizId)).rejects.toThrow('Failed to start attempt');
    });
  });

  describe('finishAttempt', () => {
    const mockAnswers = [
      {
        questionId: 1,
        selectedOptionIds: [101, 102]
      },
      {
        questionId: 2,
        selectedOptionIds: [201]
      }
    ];

    test('успешно завершает попытку с токеном', async () => {
      const mockResponse = {
        data: {
          id: mockAttemptId,
          score: 8,
          completedAt: '2024-01-01T10:30:00Z',
          timeSpent: '00:30:00'
        }
      };
      
      apiClient.post.mockResolvedValue(mockResponse);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await finishAttempt(mockToken, mockAttemptId, mockAnswers);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith(
        `/Attempt/${mockAttemptId}/stop`,
        {
          answers: mockAnswers // Форматированные ответы не меняются для этих данных
        },
        {
          headers: { Authorization: `Bearer ${mockToken}` }
        }
      );

      // Проверяем логирование
      expect(consoleSpy).toHaveBeenCalledWith('Отправка данных на сервер:');
      expect(consoleSpy).toHaveBeenCalledWith('- attemptId:', mockAttemptId);
      expect(consoleSpy).toHaveBeenCalledWith('- answers:', JSON.stringify(mockAnswers, null, 2));
      
      consoleSpy.mockRestore();
    });

    test('форматирует ответы для вопросов с одиночным выбором', async () => {
      const singleChoiceAnswers = [
        {
          questionId: 1,
          selectedOptionIds: [101] // Один элемент
        },
        {
          questionId: 2,
          selectedOptionIds: [] // Пустой массив
        }
      ];
      
      const mockResponse = { data: { id: mockAttemptId, score: 1 } };
      apiClient.post.mockResolvedValue(mockResponse);

      jest.spyOn(console, 'log').mockImplementation();

      await finishAttempt(mockToken, mockAttemptId, singleChoiceAnswers);

      // Проверяем, что форматирование работает правильно
      expect(apiClient.post).toHaveBeenCalledWith(
        `/Attempt/${mockAttemptId}/stop`,
        {
          answers: singleChoiceAnswers // Для одиночного выбора массив не меняется
        },
        expect.any(Object)
      );
    });

    test('завершает попытку без токена', async () => {
      const mockResponse = { data: { id: mockAttemptId, score: 5 } };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await finishAttempt(null, mockAttemptId, mockAnswers);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith(
        `/Attempt/${mockAttemptId}/stop`,
        { answers: mockAnswers },
        { headers: {} } // Без заголовка авторизации
      );
    });

    test('обрабатывает ошибку при завершении попытки', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: 'Invalid attempt data'
        }
      };
      
      apiClient.post.mockRejectedValue(errorResponse);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(finishAttempt(mockToken, mockAttemptId, mockAnswers)).rejects.toEqual(errorResponse);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`Ошибка при завершении попытки ${mockAttemptId}:`, errorResponse);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Статус:', 400);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Данные ошибки:', 'Invalid attempt data');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAttemptById', () => {
    test('успешно получает попытку по ID с токеном', async () => {
      const mockAttempt = {
        id: mockAttemptId,
        quizId: mockQuizId,
        userId: mockUserId,
        startedAt: '2024-01-01T10:00:00Z',
        completedAt: '2024-01-01T10:30:00Z',
        timeSpent: '00:30:00'
      };
      
      apiClient.get.mockResolvedValue({ data: mockAttempt });

      const result = await getAttemptById(mockAttemptId, mockToken);

      expect(result).toEqual(mockAttempt);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Attempt/${mockAttemptId}`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
    });

    test('получает попытку без токена', async () => {
      const mockAttempt = {
        id: mockAttemptId,
        quizId: mockQuizId,
        guestSessionId: mockGuestSessionId,
        startedAt: '2024-01-01T10:00:00Z'
      };
      
      apiClient.get.mockResolvedValue({ data: mockAttempt });

      const result = await getAttemptById(mockAttemptId, null);

      expect(result).toEqual(mockAttempt);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/Attempt/${mockAttemptId}`,
        { headers: {} }
      );
    });

    test('обрабатывает ошибку при получении попытки', async () => {
      const error = new Error('Attempt not found');
      apiClient.get.mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(getAttemptById(mockAttemptId, mockToken)).rejects.toThrow('Attempt not found');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Ошибка при получении попытки ${mockAttemptId}:`, error);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAttemptAnswers', () => {
    const mockAttemptData = {
      id: mockAttemptId,
      guestSessionId: mockGuestSessionId
    };

    const mockAnswersResponse = [
      { id: 1, questionId: 101, chosenOptionId: 1001, isCorrect: true },
      { id: 2, questionId: 101, chosenOptionId: 1002, isCorrect: false },
      { id: 3, questionId: 102, chosenOptionId: 2001, isCorrect: true }
    ];

    test('получает ответы с токеном', async () => {
      apiClient.get.mockResolvedValue({ data: mockAnswersResponse });

      const result = await getAttemptAnswers(mockAttemptId, mockAttemptData, mockToken, null);

      expect(result.grouped).toHaveLength(2); // 2 вопроса
      expect(result.raw).toEqual(mockAnswersResponse);
      
      // Проверяем группировку
      const question101 = result.grouped.find(g => g.questionId === 101);
      expect(question101.selectedOptionIds).toEqual([1001, 1002]);
      expect(question101.isCorrect).toBe(false); // Один неправильный ответ

      const question102 = result.grouped.find(g => g.questionId === 102);
      expect(question102.selectedOptionIds).toEqual([2001]);
      expect(question102.isCorrect).toBe(true); // Все ответы правильные

      expect(apiClient.get).toHaveBeenCalledWith(
        `/attempt/${mockAttemptId}/answers`,
        {
          headers: { Authorization: `Bearer ${mockToken}` }
        }
      );
    });

    test('получает ответы без токена, но с guestSessionId из attemptData', async () => {
      apiClient.get.mockResolvedValue({ data: mockAnswersResponse });

      const result = await getAttemptAnswers(mockAttemptId, mockAttemptData, null, null);

      expect(result.grouped).toBeDefined();
      expect(apiClient.get).toHaveBeenCalledWith(
        `/attempt/${mockAttemptId}/answers`,
        {
          params: { guestSessionId: mockGuestSessionId }
        }
      );
    });

    test('получает ответы без токена, с guestSessionId из параметров', async () => {
      apiClient.get.mockResolvedValue({ data: mockAnswersResponse });

      const result = await getAttemptAnswers(mockAttemptId, null, null, mockGuestSessionId);

      expect(result.grouped).toBeDefined();
      expect(apiClient.get).toHaveBeenCalledWith(
        `/attempt/${mockAttemptId}/answers`,
        {
          params: { guestSessionId: mockGuestSessionId }
        }
      );
    });

    test('обрабатывает 403 ошибку и пробует с guestSessionId', async () => {
      // Первый вызов возвращает 403
      const error403 = {
        response: { status: 403 }
      };
      apiClient.get.mockRejectedValueOnce(error403);
      
      // Второй вызов успешный
      apiClient.get.mockResolvedValueOnce({ data: mockAnswersResponse });

      const result = await getAttemptAnswers(mockAttemptId, mockAttemptData, mockToken, null);

      expect(result.grouped).toBeDefined();
      // Проверяем, что было 2 вызова
      expect(apiClient.get).toHaveBeenCalledTimes(2);
      expect(apiClient.get).toHaveBeenLastCalledWith(
        `/attempt/${mockAttemptId}/answers`,
        {
          params: { guestSessionId: mockGuestSessionId }
        }
      );
    });

    test('пропускает группировку при пустом ответе', async () => {
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getAttemptAnswers(mockAttemptId, mockAttemptData, mockToken, null);

      expect(result.grouped).toHaveLength(0);
      expect(result.raw).toEqual([]);
    });

    test('бросает ошибку если не удалось получить ответы', async () => {
      const error = new Error('Failed to get answers');
      apiClient.get.mockRejectedValue(error);

      await expect(getAttemptAnswers(mockAttemptId, mockAttemptData, mockToken, null))
        .rejects.toThrow('Failed to get answers');
    });
  });

  describe('getUserAttempts', () => {
    const mockAttempts = [
      { id: 1, quizId: 1, score: 8, timeSpent: '00:25:00', completedAt: '2024-01-01T10:00:00Z' },
      { id: 2, quizId: 2, score: 6, timeSpent: '00:30:00', completedAt: '2024-01-02T10:00:00Z' }
    ];

    test('успешно получает попытки пользователя', async () => {
      apiClient.get.mockResolvedValue({ data: mockAttempts });

      const result = await getUserAttempts(mockToken, mockUserId);

      expect(result).toEqual(mockAttempts);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/User/${mockUserId}/attempts`,
        {
          headers: { 'Authorization': `Bearer ${mockToken}` }
        }
      );
    });

    test('бросает ошибку при отсутствии токена', async () => {
      await expect(getUserAttempts(null, mockUserId))
        .rejects.toThrow('Токен авторизации обязателен');
    });

    test('обрабатывает ошибку при получении попыток', async () => {
      const error = new Error('Failed to get attempts');
      apiClient.get.mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(getUserAttempts(mockToken, mockUserId))
        .rejects.toThrow('Failed to get attempts');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка при получении попыток пользователя:', error);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getLeaderboard', () => {
    const mockLeaderboardData = [
      { id: 1, userId: 101, userName: 'User1', score: 10, timeSpent: '00:20:00', completedAt: '2024-01-01T10:00:00Z' },
      { id: 2, userId: 102, userName: 'User2', score: 8, timeSpent: '00:25:00', completedAt: '2024-01-01T11:00:00Z' },
      { id: 3, userId: 103, userName: 'Guest', score: 5, timeSpent: '00:30:00', completedAt: '2024-01-01T12:00:00Z' },
      { id: 4, userId: 104, userName: 'User4', score: 0, timeSpent: '00:00:00', completedAt: null }
    ];

    test('успешно получает лидерборд с токеном', async () => {
      apiClient.get.mockResolvedValue({ data: mockLeaderboardData });

      const result = await getLeaderboard(mockQuizId, mockToken);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2); // Фильтруются Guest и запись с нулевым временем
      
      // Проверяем форматирование
      expect(result[0]).toEqual({
        id: 1,
        userId: 101,
        userName: 'User1',
        score: 10,
        timeSpent: '00:20:00',
        completedAt: '2024-01-01T10:00:00Z'
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        `/Attempt/quiz/${mockQuizId}/leaderboard`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
    });

    test('добавляет guestSessionId из параметров', async () => {
      apiClient.get.mockResolvedValue({ data: mockLeaderboardData });

      await getLeaderboard(mockQuizId, mockToken, mockGuestSessionId);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/Attempt/quiz/${mockQuizId}/leaderboard?guestSessionId=${mockGuestSessionId}`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
    });

    test('обрабатывает ошибку 401/403 и пробует через guestSessionId', async () => {
      const error401 = { response: { status: 401 } };
      
      // Первый вызов с токеном падает
      apiClient.get.mockRejectedValueOnce(error401);
      // Второй вызов без токена успешен
      apiClient.get.mockResolvedValueOnce({ data: mockLeaderboardData });

      Cookies.get.mockReturnValue(mockGuestSessionId);

      const result = await getLeaderboard(mockQuizId, mockToken);

      expect(Array.isArray(result)).toBe(true);
      expect(apiClient.get).toHaveBeenCalledTimes(2);
      expect(apiClient.get).toHaveBeenLastCalledWith(
        `/Attempt/quiz/${mockQuizId}/leaderboard`,
        { params: { guestSessionId: mockGuestSessionId } }
      );
    });

    test('возвращает пустой массив при ошибке', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getLeaderboard(mockQuizId, mockToken);

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Ошибка при получении лидерборда для квиза ${mockQuizId}:`, error);
      
      consoleErrorSpy.mockRestore();
    });

    test('обрабатывает не-массивный ответ', async () => {
      apiClient.get.mockResolvedValue({ data: { error: 'Invalid data' } });

      const result = await getLeaderboard(mockQuizId, mockToken);

      expect(result).toEqual([]);
    });
  });

  describe('getLeaderboardSimple', () => {
    const mockLeaderboardData = [
      { id: 1, userId: 101, userName: 'User1', score: 10, timeSpent: '00:20:00', completedAt: '2024-01-01T10:00:00Z' },
      { id: 2, userId: 102, userName: 'User2', score: 8, timeSpent: '00:00:00', completedAt: null },
      { id: 3, userId: 103, userName: 'User3', score: 6, timeSpent: '00:25:00', completedAt: '2024-01-01T11:00:00Z' }
    ];

    test('фильтрует записи с нулевым временем или null completedAt', async () => {
      const dataWithInvalidEntries = [
        { id: 1, timeSpent: '00:00:00', completedAt: '2024-01-01T10:00:00Z' },
        { id: 2, timeSpent: '00:10:00', completedAt: null },
        { id: 3, timeSpent: '00:20:00', completedAt: '2024-01-01T10:00:00Z' }
      ];
      
      apiClient.get.mockResolvedValue({ data: dataWithInvalidEntries });

      const result = await getLeaderboardSimple(mockQuizId, mockToken);

      expect(result).toHaveLength(1); // Только третья запись валидна
      expect(result[0].id).toBe(3);
    });

    test('форматирует данные при ошибке авторизации', async () => {
      const error401 = { response: { status: 401 } };
      
      apiClient.get.mockRejectedValueOnce(error401);
      apiClient.get.mockResolvedValueOnce({ 
        data: [
          { 
            userId: 101, 
            username: 'User1',
            score: 8,
            timeTaken: '00:25:00',
            finishedAt: '2024-01-01T10:00:00Z'
          }
        ] 
      });

      Cookies.get.mockReturnValue(mockGuestSessionId);

      const result = await getLeaderboardSimple(mockQuizId, mockToken, mockGuestSessionId);

      expect(result[0]).toEqual({
        id: 0,
        position: 1,
        userId: 101,
        userName: 'User1',
        score: 8,
        timeSpent: '00:25:00',
        completedAt: '2024-01-01T10:00:00Z'
      });
    });
  });

  describe('getBestAttemptsPerUser', () => {
    const mockAttempts = [
      { userName: 'User1', score: 8, timeSpent: '00:30:00', completedAt: '2024-01-01T10:00:00Z' },
      { userName: 'User1', score: 9, timeSpent: '00:25:00', completedAt: '2024-01-02T10:00:00Z' }, // Лучший score
      { userName: 'User2', score: 7, timeSpent: '00:20:00', completedAt: '2024-01-01T10:00:00Z' },
      { userName: 'User2', score: 7, timeSpent: '00:15:00', completedAt: '2024-01-02T10:00:00Z' }, // Лучшее время
      { userName: 'User3', score: 10, timeSpent: '00:30:00', completedAt: '2024-01-01T10:00:00Z' },
      { userName: 'User3', score: 10, timeSpent: '00:30:00', completedAt: '2024-01-01T09:00:00Z' } // Более ранний
    ];

    test('выбирает лучшие попытки по score', () => {
      const result = getBestAttemptsPerUser(mockAttempts);

      expect(result).toHaveLength(3); // По одному на пользователя
      
      // Проверяем User1 - лучший score
      const user1Best = result.find(a => a.userName === 'User1');
      expect(user1Best.score).toBe(9);
      expect(user1Best.timeSpent).toBe('00:25:00');

      // Проверяем User2 - одинаковый score, лучшее время
      const user2Best = result.find(a => a.userName === 'User2');
      expect(user2Best.score).toBe(7);
      expect(user2Best.timeSpent).toBe('00:15:00');

      // Проверяем User3 - одинаковый score и время, более ранняя
      const user3Best = result.find(a => a.userName === 'User3');
      expect(user3Best.completedAt).toBe('2024-01-01T09:00:00Z');
    });

    test('работает с пустым массивом', () => {
      const result = getBestAttemptsPerUser([]);

      expect(result).toEqual([]);
    });

    test('обрабатывает null значения', () => {
      const attemptsWithNulls = [
        { userName: null, score: 5, timeSpent: '00:10:00', completedAt: '2024-01-01T10:00:00Z' },
        { userName: 'User1', score: null, timeSpent: '00:20:00', completedAt: null }
      ];

      const result = getBestAttemptsPerUser(attemptsWithNulls);

      expect(result).toHaveLength(2); // Оба обрабатываются
    });
  });
});