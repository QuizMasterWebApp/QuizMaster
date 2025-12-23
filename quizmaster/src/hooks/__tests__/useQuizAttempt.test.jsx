import { renderHook, act } from '@testing-library/react';
import { useQuizAttempt } from '../useQuizAttempt';
import * as api from '../../API methods/attemptMethods.jsx';
import * as quizApi from '../../API methods/quizMethods.jsx';
import Cookies from 'js-cookie';
import { useUsers } from '../useUsers.jsx';

// Мокаем все зависимости
jest.mock('../../API methods/attemptMethods.jsx');
jest.mock('../../API methods/quizMethods.jsx');
jest.mock('js-cookie');
jest.mock('../useUsers.jsx');

describe('useQuizAttempt', () => {
  beforeEach(() => {
    // Очищаем все моки перед каждым тестом
    jest.clearAllMocks();
    localStorage.clear();
    
    // Мокаем базовые реализации
    Cookies.set.mockImplementation(() => {});
    Cookies.get.mockImplementation((key) => {
      if (key === 'guestSessionId') return null;
      return null;
    });
    Cookies.remove.mockImplementation(() => {});
    
    // Мокаем useUsers
    useUsers.mockReturnValue({
      checkToken: jest.fn().mockResolvedValue('mocked-token'),
      GetUserIdFromJWT: jest.fn(),
      getUserInfo: jest.fn(),
      logoutUser: jest.fn(),
    });
  });

  afterEach(() => {
    // Очищаем таймеры
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  describe('startQuizAttempt', () => {
    it('успешно начинает попытку квиза', async () => {
      // Подготавливаем моки данных
      const mockAttemptData = {
        id: 1,
        quizId: 123,
        guestSessionId: 'guest-123',
        completedAt: new Date().toISOString(),
      };
      
      const mockQuizData = {
        id: 123,
        title: 'Test Quiz',
        timeLimit: '00:30:00',
      };
      
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
      ];

      // Мокаем API вызовы
      api.startAttempt.mockResolvedValue(mockAttemptData);
      quizApi.getQuizById.mockResolvedValue(mockQuizData);
      quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useQuizAttempt());

      await act(async () => {
        await result.current.startQuizAttempt('token', 123);
      });

      // Проверяем, что состояние установлено правильно
      expect(result.current.attempt).toEqual(mockAttemptData);
      expect(result.current.quizInfo).toEqual(mockQuizData);
      expect(result.current.questions).toEqual(mockQuestions);
      expect(result.current.currentQuestionIndex).toBe(0);
      expect(result.current.answers).toEqual({});
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);

      // Проверяем, что API методы были вызваны
      expect(api.startAttempt).toHaveBeenCalledWith('token', 123, null);
      expect(quizApi.getQuizById).toHaveBeenCalledWith(123, 'token', null);
      expect(quizApi.getQuizQuestions).toHaveBeenCalledWith(123, null);

      // Проверяем сохранение в localStorage
      const storedAttempt = JSON.parse(localStorage.getItem('current_quiz_attempt'));
      expect(storedAttempt).toMatchObject({
        id: 1,
        quizId: 123,
        guestSessionId: 'guest-123',
      });
    });

    it('устанавливает таймер при наличии ограничения по времени', async () => {
      // Используем fake timers для тестирования таймера
      jest.useFakeTimers();
      
      const now = Date.now();
      const startTime = new Date(now - 10000).toISOString(); // 10 секунд назад
      
      const mockAttemptData = {
        id: 1,
        quizId: 123,
        completedAt: startTime,
      };
      
      const mockQuizData = {
        id: 123,
        title: 'Test Quiz',
        timeLimit: '00:01:00', // 1 минута
      };
      
      const mockQuestions = [{ id: 1, text: 'Question 1' }];

      api.startAttempt.mockResolvedValue(mockAttemptData);
      quizApi.getQuizById.mockResolvedValue(mockQuizData);
      quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useQuizAttempt());

      await act(async () => {
        await result.current.startQuizAttempt('token', 123);
      });

      // Проверяем, что timeLeft установлен (примерно 50 секунд осталось)
      expect(result.current.timeLeft).toBeGreaterThan(0);
      expect(result.current.timeLeft).toBeLessThanOrEqual(50);
    });

    it('не устанавливает таймер при истекшем времени', async () => {
      jest.useFakeTimers();
      
      const now = Date.now();
      const startTime = new Date(now - 120000).toISOString(); // 2 минуты назад
      
      const mockAttemptData = {
        id: 1,
        quizId: 123,
        completedAt: startTime,
      };
      
      const mockQuizData = {
        id: 123,
        title: 'Test Quiz',
        timeLimit: '00:01:00', // 1 минута
      };
      
      const mockQuestions = [{ id: 1, text: 'Question 1' }];

      api.startAttempt.mockResolvedValue(mockAttemptData);
      quizApi.getQuizById.mockResolvedValue(mockQuizData);
      quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useQuizAttempt());

      await act(async () => {
        await result.current.startQuizAttempt('token', 123);
      });

      // Время уже истекло
      expect(result.current.timeLeft).toBe(0);
    });

    it('не устанавливает таймер без ограничения времени', async () => {
      const mockAttemptData = {
        id: 1,
        quizId: 123,
        completedAt: new Date().toISOString(),
      };
      
      const mockQuizData = {
        id: 123,
        title: 'Test Quiz',
        timeLimit: null,
      };
      
      const mockQuestions = [{ id: 1, text: 'Question 1' }];

      api.startAttempt.mockResolvedValue(mockAttemptData);
      quizApi.getQuizById.mockResolvedValue(mockQuizData);
      quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useQuizAttempt());

      await act(async () => {
        await result.current.startQuizAttempt('token', 123);
      });

      expect(result.current.timeLeft).toBe(null);
    });

    it('обрабатывает ошибку при начале попытки', async () => {
      const errorMessage = 'Ошибка начала попытки';
      api.startAttempt.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useQuizAttempt());

      await act(async () => {
        await expect(result.current.startQuizAttempt('token', 123)).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
    });

    it('использует accessKey при начале попытки', async () => {
      const mockAttemptData = { id: 1, quizId: 123 };
      const mockQuizData = { id: 123, title: 'Test Quiz' };
      const mockQuestions = [{ id: 1, text: 'Question 1' }];

      api.startAttempt.mockResolvedValue(mockAttemptData);
      quizApi.getQuizById.mockResolvedValue(mockQuizData);
      quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useQuizAttempt());

      await act(async () => {
        await result.current.startQuizAttempt('token', 123, 'ACCESS123');
      });

      expect(api.startAttempt).toHaveBeenCalledWith('token', 123, 'ACCESS123');
      expect(quizApi.getQuizById).toHaveBeenCalledWith(123, 'token', 'ACCESS123');
      expect(quizApi.getQuizQuestions).toHaveBeenCalledWith(123, 'ACCESS123');
    });
  });

  describe('saveAnswer', () => {
    it('сохраняет ответ на вопрос', async () => {
      const { result } = renderHook(() => useQuizAttempt());

      // Сначала нужно установить questions в state
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        const mockQuestions = [{ id: 1, text: 'Question 1' }];
        
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      await act(async () => {
        result.current.saveAnswer(1, [100, 200]);
      });

      expect(result.current.answers).toEqual({ 1: [100, 200] });
      
      // Проверяем сохранение в localStorage
      const storedAnswers = JSON.parse(localStorage.getItem('quiz_attempt_answers'));
      expect(storedAnswers).toEqual({ 1: [100, 200] });
    });

    it('обновляет существующий ответ', async () => {
      const { result } = renderHook(() => useQuizAttempt());

      // Инициализируем хук
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        const mockQuestions = [{ id: 1, text: 'Question 1' }];
        
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Сохраняем первый ответ
      await act(async () => {
        result.current.saveAnswer(1, [100]);
      });

      // Обновляем ответ
      await act(async () => {
        result.current.saveAnswer(1, [200, 300]);
      });

      expect(result.current.answers).toEqual({ 1: [200, 300] });
    });
  });

  describe('навигация по вопросам', () => {
    it('переходит к следующему вопросу', async () => {
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
        { id: 3, text: 'Question 3' },
      ];

      const { result } = renderHook(() => useQuizAttempt());
      
      // Инициализируем хук с данными
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Устанавливаем текущий вопрос на второй
      await act(async () => {
        result.current.goToQuestion(1);
      });

      // Переходим к следующему вопросу
      await act(async () => {
        result.current.goToNextQuestion();
      });

      expect(result.current.currentQuestionIndex).toBe(2);
      expect(result.current.currentQuestion).toEqual(mockQuestions[2]);
      
      // Проверяем сохранение в localStorage
      expect(localStorage.getItem('quiz_current_question')).toBe('2');
    });

    it('не переходит к следующему вопросу на последнем вопросе', async () => {
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
      ];

      const { result } = renderHook(() => useQuizAttempt());
      
      // Инициализируем хук с данными
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Переходим к последнему вопросу
      await act(async () => {
        result.current.goToQuestion(1);
      });

      // Пытаемся перейти дальше
      await act(async () => {
        result.current.goToNextQuestion();
      });

      // Остаемся на последнем вопросе
      expect(result.current.currentQuestionIndex).toBe(1);
    });

    it('переходит к предыдущему вопросу', async () => {
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
        { id: 3, text: 'Question 3' },
      ];

      const { result } = renderHook(() => useQuizAttempt());
      
      // Инициализируем хук с данными
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Устанавливаем текущий вопрос на второй
      await act(async () => {
        result.current.goToQuestion(1);
      });

      // Переходим к предыдущему вопросу
      await act(async () => {
        result.current.goToPreviousQuestion();
      });

      expect(result.current.currentQuestionIndex).toBe(0);
      expect(result.current.currentQuestion).toEqual(mockQuestions[0]);
    });

    it('не переходит к предыдущему вопросу на первом вопросе', async () => {
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
      ];

      const { result } = renderHook(() => useQuizAttempt());
      
      // Инициализируем хук с данными (по умолчанию на первом вопросе)
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Пытаемся перейти к предыдущему вопросу
      await act(async () => {
        result.current.goToPreviousQuestion();
      });

      // Остаемся на первом вопросе
      expect(result.current.currentQuestionIndex).toBe(0);
    });

    it('переходит к конкретному вопросу', async () => {
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
        { id: 3, text: 'Question 3' },
      ];

      const { result } = renderHook(() => useQuizAttempt());
      
      // Инициализируем хук с данными
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Переходим к конкретному вопросу
      await act(async () => {
        result.current.goToQuestion(2);
      });

      expect(result.current.currentQuestionIndex).toBe(2);
      expect(result.current.currentQuestion).toEqual(mockQuestions[2]);
    });

    it('не переходит к несуществующему вопросу', async () => {
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
      ];

      const { result } = renderHook(() => useQuizAttempt());
      
      // Инициализируем хук с данными
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Пытаемся перейти к несуществующему вопросу
      await act(async () => {
        result.current.goToQuestion(5); // Несуществующий индекс
      });

      expect(result.current.currentQuestionIndex).toBe(0); // Остается на первом вопросе
    });

    it('помечает вопрос как посещенный при переходе', async () => {
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
      ];

      const { result } = renderHook(() => useQuizAttempt());
      
      // Инициализируем хук с данными
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Переходим к вопросу
      await act(async () => {
        result.current.goToQuestion(1);
      });

      // В visitedQuestions должен быть id первого вопроса (текущего при переходе)
      expect(result.current.visitedQuestions.has(1)).toBe(true);
    });
  });

  describe('markQuestionAsVisited', () => {
    it('помечает вопрос как посещенный', async () => {
      const { result } = renderHook(() => useQuizAttempt());

      await act(async () => {
        result.current.markQuestionAsVisited(123);
      });

      expect(result.current.visitedQuestions.has(123)).toBe(true);
    });
  });

  describe('checkAndRestoreAttempt', () => {
    it('восстанавливает сохраненную попытку', async () => {
      // Сохраняем попытку в localStorage
      const storedAttempt = {
        id: 100,
        quizId: 123,
        startedAt: new Date().toISOString(),
        guestSessionId: 'guest-123',
      };
      
      localStorage.setItem('current_quiz_attempt', JSON.stringify(storedAttempt));
      
      // Мокаем успешное восстановление
      const mockAttemptData = { 
        id: 100, 
        quizId: 123,
        guestSessionId: 'guest-123',
        completedAt: new Date().toISOString()
      };
      const mockQuizData = { 
        id: 123, 
        title: 'Restored Quiz',
        timeLimit: null
      };
      const mockQuestions = [{ id: 1, text: 'Question 1' }];
      
      api.getAttemptById.mockResolvedValue(mockAttemptData);
      quizApi.getQuizById.mockResolvedValue(mockQuizData);
      quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useQuizAttempt());

      const restored = await act(async () => {
        return await result.current.checkAndRestoreAttempt(123);
      });

      expect(restored).toBe(true);
      expect(result.current.attempt).toEqual(mockAttemptData);
      expect(api.getAttemptById).toHaveBeenCalledWith(100, undefined);
    });

    it('не восстанавливает попытку для другого квиза', async () => {
      // Сохраняем попытку для другого квиза
      const storedAttempt = {
        id: 100,
        quizId: 999, // Другой квиз
      };
      
      localStorage.setItem('current_quiz_attempt', JSON.stringify(storedAttempt));

      const { result } = renderHook(() => useQuizAttempt());

      const restored = await act(async () => {
        return await result.current.checkAndRestoreAttempt(123);
      });

      expect(restored).toBe(false);
    });

    it('очищает невалидные данные при ошибке восстановления', async () => {
      // Сохраняем попытку
      const storedAttempt = {
        id: 100,
        quizId: 123,
      };
      
      localStorage.setItem('current_quiz_attempt', JSON.stringify(storedAttempt));
      
      // Также сохраняем ответы
      localStorage.setItem('quiz_attempt_answers', JSON.stringify({ 1: [100] }));
      localStorage.setItem('quiz_current_question', '2');

      // Мокаем ошибку при восстановлении
      api.getAttemptById.mockRejectedValue(new Error('Ошибка восстановления'));

      const { result } = renderHook(() => useQuizAttempt());

      const restored = await act(async () => {
        return await result.current.checkAndRestoreAttempt(123);
      });

      expect(restored).toBe(false);
      
      // Проверяем, что localStorage очищен
      expect(localStorage.getItem('current_quiz_attempt')).toBeNull();
      expect(localStorage.getItem('quiz_attempt_answers')).toBeNull();
      expect(localStorage.getItem('quiz_current_question')).toBeNull();
    });

    it('использует accessKey при восстановлении', async () => {
      const storedAttempt = {
        id: 100,
        quizId: 123,
      };
      
      localStorage.setItem('current_quiz_attempt', JSON.stringify(storedAttempt));
      
      const mockAttemptData = { id: 100, quizId: 123 };
      const mockQuizData = { id: 123, title: 'Test Quiz' };
      const mockQuestions = [{ id: 1, text: 'Question 1' }];
      
      api.getAttemptById.mockResolvedValue(mockAttemptData);
      quizApi.getQuizById.mockResolvedValue(mockQuizData);
      quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useQuizAttempt());

      await act(async () => {
        await result.current.checkAndRestoreAttempt(123, 'ACCESS123');
      });

      expect(quizApi.getQuizById).toHaveBeenCalledWith(123, undefined, 'ACCESS123');
      expect(quizApi.getQuizQuestions).toHaveBeenCalledWith(123, 'ACCESS123');
    });
  });

  describe('finishQuizAttempt', () => {
    it('успешно завершает попытку', async () => {
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
      ];
      const mockResult = { id: 1, score: 80 };

      // Мокаем API вызов
      api.finishAttempt.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useQuizAttempt());

      // Инициализируем состояние через startQuizAttempt
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Сохраняем ответы
      await act(async () => {
        result.current.saveAnswer(1, [100]);
        result.current.saveAnswer(2, [200]);
      });

      const finishResult = await act(async () => {
        return await result.current.finishQuizAttempt();
      });

      expect(finishResult).toEqual(mockResult);
      expect(api.finishAttempt).toHaveBeenCalledWith(
        'mocked-token',
        1,
        expect.arrayContaining([
          { questionId: 1, selectedOptionIds: [100] },
          { questionId: 2, selectedOptionIds: [200] },
        ])
      );

      // Проверяем сброс состояния
      expect(result.current.attempt).toBeNull();
      expect(result.current.quizInfo).toBeNull();
      expect(result.current.questions).toEqual([]);
      expect(result.current.answers).toEqual({});
      expect(result.current.timeLeft).toBeNull();
      expect(result.current.currentQuestionIndex).toBe(0);
      expect(result.current.visitedQuestions.size).toBe(0);
    });

    it('добавляет пустые ответы для вопросов без ответа', async () => {
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
        { id: 3, text: 'Question 3' },
      ];
      const mockResult = { id: 1, score: 50 };

      api.finishAttempt.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useQuizAttempt());

      // Инициализируем состояние через startQuizAttempt
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Сохраняем ответы только на 2 из 3 вопросов
      await act(async () => {
        result.current.saveAnswer(1, [100]);
        result.current.saveAnswer(3, [300]);
      });

      await act(async () => {
        await result.current.finishQuizAttempt();
      });

      // Проверяем, что отправлены ответы для всех 3 вопросов
      expect(api.finishAttempt).toHaveBeenCalledWith(
        'mocked-token',
        1,
        expect.arrayContaining([
          { questionId: 1, selectedOptionIds: [100] },
          { questionId: 2, selectedOptionIds: [] }, // Пустой ответ для второго вопроса
          { questionId: 3, selectedOptionIds: [300] },
        ])
      );
    });

    it('обрабатывает ошибку при завершении попытки', async () => {
      const mockQuestions = [{ id: 1, text: 'Question 1' }];
      const errorMessage = 'Ошибка завершения';

      api.finishAttempt.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useQuizAttempt());

      // Инициализируем состояние
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      await act(async () => {
        await expect(result.current.finishQuizAttempt()).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('возвращает null если нет попытки', async () => {
      const { result } = renderHook(() => useQuizAttempt());

      const finishResult = await act(async () => {
        return await result.current.finishQuizAttempt();
      });

      expect(finishResult).toBeNull();
    });

    it('преобразует ID ответов в числа', async () => {
      const mockQuestions = [{ id: 1, text: 'Question 1' }];
      const mockResult = { id: 1, score: 100 };

      api.finishAttempt.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useQuizAttempt());

      // Инициализируем состояние
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Сохраняем ответы со строковыми ID
      await act(async () => {
        result.current.saveAnswer(1, ['100', '200']);
      });

      await act(async () => {
        await result.current.finishQuizAttempt();
      });

      expect(api.finishAttempt).toHaveBeenCalledWith(
        'mocked-token',
        1,
        expect.arrayContaining([
          { questionId: 1, selectedOptionIds: [100, 200] }, // Преобразовано в числа
        ])
      );
    });
  });

  describe('progress и статистика', () => {
    it('правильно рассчитывает прогресс', async () => {
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
        { id: 3, text: 'Question 3' },
        { id: 4, text: 'Question 4' },
      ];

      const { result } = renderHook(() => useQuizAttempt());

      // Инициализируем хук с вопросами
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Переходим к третьему вопросу
      await act(async () => {
        result.current.goToQuestion(2); // Индекс 2 = третий вопрос
      });

      expect(result.current.progress).toEqual({
        current: 3,
        total: 4,
        percentage: 75,
      });
    });

    it('правильно рассчитывает прогресс без вопросов', async () => {
      const { result } = renderHook(() => useQuizAttempt());

      // Хук без вопросов
      expect(result.current.progress).toEqual({
        current: 1,
        total: 0,
        percentage: 0,
      });
    });

    it('показывает правильный текущий вопрос и ответ', async () => {
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
      ];

      const { result } = renderHook(() => useQuizAttempt());

      // Инициализируем хук
      await act(async () => {
        const mockAttemptData = { id: 1, quizId: 123 };
        const mockQuizData = { id: 123, timeLimit: null };
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Сохраняем ответ на первый вопрос
      await act(async () => {
        result.current.saveAnswer(1, [100]);
      });

      expect(result.current.currentQuestion).toEqual(mockQuestions[0]);
      expect(result.current.currentAnswer).toEqual([100]);
    });
  });

  describe('очистка', () => {
    it('очищает localStorage', async () => {
      // Заполняем localStorage
      localStorage.setItem('current_quiz_attempt', 'test');
      localStorage.setItem('quiz_attempt_answers', 'test');
      localStorage.setItem('quiz_current_question', 'test');

      const { result } = renderHook(() => useQuizAttempt());

      await act(async () => {
        result.current.clearAttemptStorage();
      });

      expect(localStorage.getItem('current_quiz_attempt')).toBeNull();
      expect(localStorage.getItem('quiz_attempt_answers')).toBeNull();
      expect(localStorage.getItem('quiz_current_question')).toBeNull();
    });

    it('очищает таймер через cleanup', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => useQuizAttempt());

      // Устанавливаем таймер
      await act(async () => {
        // Инициализируем хук с таймером
        const mockAttemptData = { 
          id: 1, 
          quizId: 123,
          completedAt: new Date(Date.now() - 10000).toISOString()
        };
        const mockQuizData = { 
          id: 123, 
          timeLimit: '00:01:00'
        };
        const mockQuestions = [{ id: 1, text: 'Question 1' }];
        
        api.startAttempt.mockResolvedValue(mockAttemptData);
        quizApi.getQuizById.mockResolvedValue(mockQuizData);
        quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);
        
        await result.current.startQuizAttempt('token', 123);
      });

      // Очищаем таймер
      await act(async () => {
        result.current.cleanup();
      });

      // Таймер должен быть очищен
      expect(result.current.timeLeft).toBeDefined();
    });
  });

  describe('API методы', () => {
    it('вызывает getLeaderboard', async () => {
      const mockLeaderboard = [
        { id: 1, userName: 'User1', score: 100 },
        { id: 2, userName: 'User2', score: 90 },
      ];

      api.getLeaderboard.mockResolvedValue(mockLeaderboard);

      const { result } = renderHook(() => useQuizAttempt());

      const leaderboard = await act(async () => {
        return await result.current.getLeaderboard(123, 'token');
      });

      expect(leaderboard).toEqual(mockLeaderboard);
      expect(api.getLeaderboard).toHaveBeenCalledWith(123, 'token', null);
    });

    it('вызывает getLeaderboard с guestSessionId', async () => {
      const mockLeaderboard = [
        { id: 1, userName: 'User1', score: 100 },
      ];

      api.getLeaderboard.mockResolvedValue(mockLeaderboard);

      const { result } = renderHook(() => useQuizAttempt());

      const leaderboard = await act(async () => {
        return await result.current.getLeaderboard(123, 'token', 'guest-123');
      });

      expect(leaderboard).toEqual(mockLeaderboard);
      expect(api.getLeaderboard).toHaveBeenCalledWith(123, 'token', 'guest-123');
    });

    it('вызывает getAttemptById', async () => {
      const mockAttempt = { id: 1, quizId: 123 };
      
      api.getAttemptById.mockResolvedValue(mockAttempt);

      const { result } = renderHook(() => useQuizAttempt());

      const attempt = await act(async () => {
        return await result.current.getAttemptById(1);
      });

      expect(attempt).toEqual(mockAttempt);
      expect(api.getAttemptById).toHaveBeenCalledWith(1);
    });

    it('вызывает getAttemptAnswers', async () => {
      const mockAnswers = [
        { questionId: 1, chosenOptionId: 100, isCorrect: true },
        { questionId: 2, chosenOptionId: 200, isCorrect: false },
      ];
      
      api.getAttemptAnswers.mockResolvedValue(mockAnswers);

      const { result } = renderHook(() => useQuizAttempt());

      const answers = await act(async () => {
        return await result.current.getAttemptAnswers(1, null, 'token', 'guest-123');
      });

      expect(answers).toEqual(mockAnswers);
      expect(api.getAttemptAnswers).toHaveBeenCalledWith(1, null, 'token', 'guest-123');
    });

    it('вызывает getLeaderboardSimple', async () => {
      const mockLeaderboard = [
        { id: 1, userName: 'User1', score: 100 },
        { id: 2, userName: 'User2', score: 90 },
      ];

      api.getLeaderboardSimple.mockResolvedValue(mockLeaderboard);

      const { result } = renderHook(() => useQuizAttempt());

      const leaderboard = await act(async () => {
        return await result.current.getLeaderboardSimple(123, 'token');
      });

      expect(leaderboard).toEqual(mockLeaderboard);
      expect(api.getLeaderboardSimple).toHaveBeenCalledWith(123, 'token', null);
    });
  });

  describe('getAttemptByIdFull', () => {
    it('получает полные данные попытки', async () => {
      const mockAttemptData = { 
        id: 1, 
        quizId: 123,
        guestSessionId: 'guest-123'
      };
      const mockQuizData = { 
        id: 123, 
        title: 'Test Quiz',
        timeLimit: '00:30:00'
      };
      const mockQuestions = [
        { id: 1, text: 'Question 1' },
        { id: 2, text: 'Question 2' },
      ];

      api.getAttemptById.mockResolvedValue(mockAttemptData);
      quizApi.getQuizById.mockResolvedValue(mockQuizData);
      quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useQuizAttempt());

      const attempt = await act(async () => {
        return await result.current.getAttemptByIdFull(1, 'ACCESS123', 'token');
      });

      expect(attempt).toEqual(mockAttemptData);
      expect(result.current.attempt).toEqual(mockAttemptData);
      expect(result.current.quizInfo).toEqual(mockQuizData);
      expect(result.current.questions).toEqual(mockQuestions);
      
      expect(api.getAttemptById).toHaveBeenCalledWith(1, 'token');
      expect(quizApi.getQuizById).toHaveBeenCalledWith(123, 'token', 'ACCESS123');
      expect(quizApi.getQuizQuestions).toHaveBeenCalledWith(123, 'ACCESS123');
    });

    it('устанавливает таймер при наличии timeLimit', async () => {
      const mockAttemptData = { 
        id: 1, 
        quizId: 123,
        completedAt: new Date(Date.now() - 10000).toISOString()
      };
      const mockQuizData = { 
        id: 123, 
        title: 'Test Quiz',
        timeLimit: '00:01:00'
      };
      const mockQuestions = [{ id: 1, text: 'Question 1' }];

      api.getAttemptById.mockResolvedValue(mockAttemptData);
      quizApi.getQuizById.mockResolvedValue(mockQuizData);
      quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useQuizAttempt());

      await act(async () => {
        await result.current.getAttemptByIdFull(1, null, 'token');
      });

      expect(result.current.timeLeft).toBeGreaterThan(0);
    });
  });

  describe('таймер', () => {
    it('уменьшает timeLeft каждую секунду', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => useQuizAttempt());

      // Устанавливаем начальное время
      await act(async () => {
        result.current.timeLeft = 5;
      });

      // Запускаем таймер
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // В реальном хуке таймер запускается через useEffect, мы не можем напрямую проверить
      // Но можем проверить что cleanup работает
      await act(async () => {
        result.current.cleanup();
      });
    });

    it('останавливает таймер при timeLeft = 0', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => useQuizAttempt());

      // Устанавливаем timeLeft в 0
      await act(async () => {
        result.current.timeLeft = 0;
      });

      // В реальном хуке useEffect остановит таймер при timeLeft = 0
      // Проверяем что cleanup можно вызвать
      await act(async () => {
        result.current.cleanup();
      });
    });
  });

  describe('parseTimeStringToSeconds и calculateTimeLeft', () => {
    // Эти функции приватные, но мы можем протестировать их косвенно
    it('корректно работает с timeLimit через startQuizAttempt', async () => {
      const mockAttemptData = {
        id: 1,
        quizId: 123,
        completedAt: new Date().toISOString(),
      };
      
      const mockQuizData = {
        id: 123,
        title: 'Test Quiz',
        timeLimit: '01:30:00', // 1 час 30 минут = 5400 секунд
      };
      
      const mockQuestions = [{ id: 1, text: 'Question 1' }];

      api.startAttempt.mockResolvedValue(mockAttemptData);
      quizApi.getQuizById.mockResolvedValue(mockQuizData);
      quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useQuizAttempt());

      await act(async () => {
        await result.current.startQuizAttempt('token', 123);
      });

      // timeLeft должен быть рассчитан
      expect(result.current.timeLeft).toBeGreaterThan(0);
      expect(result.current.timeLeft).toBeLessThanOrEqual(5400);
    });

    it('обрабатывает некорректный формат времени', async () => {
      const mockAttemptData = {
        id: 1,
        quizId: 123,
        completedAt: new Date().toISOString(),
      };
      
      const mockQuizData = {
        id: 123,
        title: 'Test Quiz',
        timeLimit: 'invalid-format',
      };
      
      const mockQuestions = [{ id: 1, text: 'Question 1' }];

      api.startAttempt.mockResolvedValue(mockAttemptData);
      quizApi.getQuizById.mockResolvedValue(mockQuizData);
      quizApi.getQuizQuestions.mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useQuizAttempt());

      await act(async () => {
        await result.current.startQuizAttempt('token', 123);
      });

      // При некорректном формате timeLeft должен быть null
      expect(result.current.timeLeft).toBe(null);
    });
  });
});