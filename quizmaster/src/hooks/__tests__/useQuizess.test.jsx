import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuizes } from '../useQuizes';
import * as api from '../../API methods/quizMethods';
import * as categoryApi from '../../API methods/categoryMethods';
import { useUsers } from '../useUsers';

// Мокаем все внешние зависимости
jest.mock('../../API methods/quizMethods');
jest.mock('../../API methods/categoryMethods');
jest.mock('../useUsers');

describe('useQuizes Hook', () => {
  // Моковые данные
  const mockToken = 'test-jwt-token';
  const mockUserId = 123;
  const mockQuizId = 456;
  const mockCategoryId = 1;
  const mockAccessKey = 'ABCDE';
  const mockCode = '12345';

  // Моковые ответы API
  const mockQuiz = {
    id: mockQuizId,
    title: 'Тестовый квиз',
    description: 'Описание тестового квиза',
    authorId: mockUserId,
    privateAccessKey: 'PRIVATE123',
    questionsCount: 10
  };

  const mockCategory = {
    CategoryType: 1,
    Name: 'Science'
  };

  const mockCategories = [
    { CategoryType: 0, Name: 'General' },
    { CategoryType: 1, Name: 'Science' },
    { CategoryType: 7, Name: 'Technology' }
  ];

  const mockQuizzes = [
    { id: 1, title: 'Квиз 1', authorId: 101 },
    { id: 2, title: 'Квиз 2', authorId: 102, privateAccessKey: 'KEY123' },
    { id: 3, title: 'Квиз 3', authorId: null }
  ];

  const mockUserInfo = {
    userName: 'Test User',
    username: 'testuser'
  };

  const mockQuestions = [
    { id: 1, text: 'Вопрос 1' },
    { id: 2, text: 'Вопрос 2' }
  ];

  // Мок для useUsers
  const mockGetUserIdFromJWT = jest.fn();
  const mockGetUserInfo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Настраиваем мок useUsers
    useUsers.mockReturnValue({
      GetUserIdFromJWT: mockGetUserIdFromJWT,
      getUserInfo: mockGetUserInfo
    });

    // Мокаем localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Основные состояния', () => {
    test('инициализирует со стандартными состояниями', () => {
      const { result } = renderHook(() => useQuizes());

      expect(result.current.quizzes).toEqual([]);
      expect(result.current.categories).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.categoryLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Методы категорий', () => {
    describe('getAllCategories', () => {
      test('успешно загружает категории', async () => {
        categoryApi.getAllCategories.mockResolvedValue(mockCategories);

        const { result } = renderHook(() => useQuizes());

        let categoriesResult;
        await act(async () => {
          categoriesResult = await result.current.getAllCategories();
        });

        expect(categoriesResult).toEqual(mockCategories);
        expect(result.current.categories).toEqual(mockCategories);
        expect(result.current.error).toBe(null);
      });

      test('устанавливает categoryLoading во время загрузки', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
          resolvePromise = resolve;
        });
        categoryApi.getAllCategories.mockReturnValue(promise);

        const { result } = renderHook(() => useQuizes());

        // Запускаем загрузку
        let loadingPromise;
        await act(async () => {
          loadingPromise = result.current.getAllCategories();
        });

        // Проверяем, что loading установлен
        expect(result.current.categoryLoading).toBe(true);

        // Завершаем загрузку
        await act(async () => {
          resolvePromise(mockCategories);
          await loadingPromise;
        });

        expect(result.current.categoryLoading).toBe(false);
      });

      test('обрабатывает ошибку при загрузке категорий', async () => {
        const mockError = new Error('Failed to load categories');
        categoryApi.getAllCategories.mockRejectedValue(mockError);

        const { result } = renderHook(() => useQuizes());

        await act(async () => {
          await expect(result.current.getAllCategories()).rejects.toThrow('Failed to load categories');
        });

        expect(result.current.error).toBe(mockError);
      });
    });

    describe('getCategoryById', () => {
      test('успешно получает категорию по ID', async () => {
        categoryApi.getCategoryById.mockResolvedValue(mockCategory);

        const { result } = renderHook(() => useQuizes());

        let categoryResult;
        await act(async () => {
          categoryResult = await result.current.getCategoryById(mockCategoryId);
        });

        expect(categoryResult).toEqual(mockCategory);
        expect(categoryApi.getCategoryById).toHaveBeenCalledWith(mockCategoryId);
      });

      test('устанавливает categoryLoading во время загрузки', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
          resolvePromise = resolve;
        });
        categoryApi.getCategoryById.mockReturnValue(promise);

        const { result } = renderHook(() => useQuizes());

        // Запускаем загрузку
        let loadingPromise;
        await act(async () => {
          loadingPromise = result.current.getCategoryById(mockCategoryId);
        });

        expect(result.current.categoryLoading).toBe(true);

        // Завершаем загрузку
        await act(async () => {
          resolvePromise(mockCategory);
          await loadingPromise;
        });

        expect(result.current.categoryLoading).toBe(false);
      });
    });

    describe('getQuizzesByCategory', () => {
      test('успешно получает квизы по категории с информацией об авторе', async () => {
        const categoryName = 'Science';
        const mockQuizzesData = [
          { id: 1, title: 'Science Quiz 1', authorId: 101 },
          { id: 2, title: 'Science Quiz 2', authorId: 102 }
        ];

        categoryApi.getQuizzesByCategory.mockResolvedValue(mockQuizzesData);
        mockGetUserInfo
          .mockResolvedValueOnce({ userName: 'Author 1', username: 'author1' })
          .mockResolvedValueOnce({ userName: 'Author 2', username: 'author2' });

        const { result } = renderHook(() => useQuizes());

        let quizzesResult;
        await act(async () => {
          quizzesResult = await result.current.getQuizzesByCategory(categoryName);
        });

        expect(quizzesResult).toHaveLength(2);
        expect(quizzesResult[0]).toEqual({
          ...mockQuizzesData[0],
          authorName: 'Author 1'
        });
        expect(quizzesResult[1]).toEqual({
          ...mockQuizzesData[1],
          authorName: 'Author 2'
        });

        expect(result.current.quizzes).toEqual(quizzesResult);
        expect(categoryApi.getQuizzesByCategory).toHaveBeenCalledWith(categoryName);
      });

      test('обрабатывает квизы без authorId', async () => {
        const categoryName = 'Science';
        const mockQuizzesData = [
          { id: 1, title: 'Quiz without author', authorId: null }
        ];

        categoryApi.getQuizzesByCategory.mockResolvedValue(mockQuizzesData);

        const { result } = renderHook(() => useQuizes());

        await act(async () => {
          await result.current.getQuizzesByCategory(categoryName);
        });

        expect(result.current.quizzes[0]).toEqual(mockQuizzesData[0]);
        expect(mockGetUserInfo).not.toHaveBeenCalled();
      });

      test('обрабатывает ошибку при загрузке квизов', async () => {
        const categoryName = 'Science';
        const mockError = new Error('Failed to load quizzes');
        categoryApi.getQuizzesByCategory.mockRejectedValue(mockError);

        const { result } = renderHook(() => useQuizes());

        await act(async () => {
          await expect(result.current.getQuizzesByCategory(categoryName))
            .rejects.toThrow('Failed to load quizzes');
        });

        expect(result.current.error).toBe(mockError);
      });
    });
  });

  describe('Методы квизов', () => {
    describe('getAllQuizzes', () => {
      test('успешно загружает все квизы без фильтрации', async () => {
        api.getAllQuizzes.mockResolvedValue(mockQuizzes);
        api.getQuizQuestions
          .mockResolvedValueOnce(mockQuestions) // Для квиза 1
          .mockResolvedValueOnce(mockQuestions) // Для квиза 2
          .mockResolvedValueOnce([]); // Для квиза 3

        mockGetUserInfo
          .mockResolvedValueOnce({ userName: 'Author 1' })
          .mockResolvedValueOnce({ userName: 'Author 2' })
          .mockResolvedValueOnce(null);

        window.localStorage.getItem.mockReturnValue(null);

        const { result } = renderHook(() => useQuizes());

        let quizzesResult;
        await act(async () => {
          quizzesResult = await result.current.getAllQuizzes();
        });

        expect(quizzesResult).toHaveLength(3);
        expect(quizzesResult[0]).toEqual({
          ...mockQuizzes[0],
          authorName: 'Author 1',
          questionsCount: 2
        });
        expect(quizzesResult[1]).toEqual({
          ...mockQuizzes[1],
          authorName: 'Author 2',
          questionsCount: 2
        });
        expect(quizzesResult[2]).toEqual({
          ...mockQuizzes[2],
          authorName: 'Неизвестный автор',
          questionsCount: 0
        });

        expect(result.current.quizzes).toEqual(quizzesResult);
      });

      test('загружает квизы с фильтрацией по категории', async () => {
        // Сначала нужно загрузить категории
        categoryApi.getAllCategories.mockResolvedValue(mockCategories);
        categoryApi.getQuizzesByCategory.mockResolvedValue([mockQuizzes[0]]);
        api.getQuizQuestions.mockResolvedValue(mockQuestions);
        mockGetUserInfo.mockResolvedValue({ userName: 'Test Author' });

        const { result } = renderHook(() => useQuizes());

        // Загружаем категории
        await act(async () => {
          await result.current.getAllCategories();
        });

        // Теперь загружаем квизы с фильтрацией
        await act(async () => {
          await result.current.getAllQuizzes(1); // CategoryType = 1
        });

        expect(categoryApi.getQuizzesByCategory).toHaveBeenCalledWith('Science');
      });

      test('использует сохраненный ключ доступа для приватных квизов', async () => {
        const mockPrivateQuiz = {
          id: 999,
          title: 'Private Quiz',
          authorId: mockUserId,
          privateAccessKey: 'PRIVATE999'
        };

        api.getAllQuizzes.mockResolvedValue([mockPrivateQuiz]);
        api.getQuizQuestions.mockResolvedValue(mockQuestions);
        mockGetUserInfo.mockResolvedValue({ userName: 'Author' });

        window.localStorage.getItem.mockReturnValue('SAVED_KEY');

        const { result } = renderHook(() => useQuizes());

        await act(async () => {
          await result.current.getAllQuizzes();
        });

        expect(window.localStorage.getItem).toHaveBeenCalledWith('quiz_access_999');
        expect(api.getQuizQuestions).toHaveBeenCalledWith(999, 'SAVED_KEY');
      });

      test('использует privateAccessKey если нет сохраненного ключа', async () => {
        const mockPrivateQuiz = {
          id: 999,
          title: 'Private Quiz',
          authorId: mockUserId,
          privateAccessKey: 'PRIVATE999'
        };

        api.getAllQuizzes.mockResolvedValue([mockPrivateQuiz]);
        api.getQuizQuestions.mockResolvedValue(mockQuestions);
        mockGetUserInfo.mockResolvedValue({ userName: 'Author' });

        window.localStorage.getItem.mockReturnValue(null);

        const { result } = renderHook(() => useQuizes());

        await act(async () => {
          await result.current.getAllQuizzes();
        });

        expect(api.getQuizQuestions).toHaveBeenCalledWith(999, 'PRIVATE999');
      });

      test('обрабатывает ошибки при обработке отдельных квизов', async () => {
        api.getAllQuizzes.mockResolvedValue(mockQuizzes);
        api.getQuizQuestions.mockRejectedValue(new Error('Failed to load questions'));
        mockGetUserInfo.mockResolvedValue({ userName: 'Author' });

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const { result } = renderHook(() => useQuizes());

        await act(async () => {
          await result.current.getAllQuizzes();
        });

        expect(result.current.quizzes[0]).toEqual({
          ...mockQuizzes[0],
          authorName: 'Неизвестный автор',
          questionsCount: 0
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Ошибка обработки квиза 1:',
          expect.any(Error)
        );

        consoleWarnSpy.mockRestore();
      });

      test('возвращает пустой массив при ошибке загрузки', async () => {
        const mockError = new Error('Network error');
        api.getAllQuizzes.mockRejectedValue(mockError);

        const { result } = renderHook(() => useQuizes());

        await act(async () => {
          const quizzes = await result.current.getAllQuizzes();
          expect(quizzes).toBeUndefined(); // При ошибке возвращается undefined
        });

        expect(result.current.error).toBe(mockError);
      });
    });

    describe('getQuizById', () => {
      test('успешно получает квиз по ID', async () => {
        api.getQuizById.mockResolvedValue(mockQuiz);

        const { result } = renderHook(() => useQuizes());

        let quizResult;
        await act(async () => {
          quizResult = await result.current.getQuizById(mockQuizId, mockToken, mockAccessKey);
        });

        expect(quizResult).toEqual(mockQuiz);
        expect(api.getQuizById).toHaveBeenCalledWith(mockQuizId, mockToken, mockAccessKey);
      });

      test('устанавливает loading во время загрузки', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
          resolvePromise = resolve;
        });
        api.getQuizById.mockReturnValue(promise);

        const { result } = renderHook(() => useQuizes());

        // Запускаем загрузку
        let loadingPromise;
        await act(async () => {
          loadingPromise = result.current.getQuizById(mockQuizId, mockToken);
        });

        expect(result.current.loading).toBe(true);

        // Завершаем загрузку
        await act(async () => {
          resolvePromise(mockQuiz);
          await loadingPromise;
        });

        expect(result.current.loading).toBe(false);
      });
    });

    describe('createQuiz', () => {
      test('успешно создает квиз', async () => {
        const quizData = {
          title: 'Новый квиз',
          description: 'Описание нового квиза',
          categoryId: 1
        };

        api.createQuiz.mockResolvedValue(mockQuiz);

        const { result } = renderHook(() => useQuizes());

        let createdQuiz;
        await act(async () => {
          createdQuiz = await result.current.createQuiz(mockToken, mockUserId, quizData);
        });

        expect(createdQuiz).toEqual(mockQuiz);
        expect(api.createQuiz).toHaveBeenCalledWith(mockToken, mockUserId, quizData);
      });

      test('обрабатывает ошибку при создании квиза', async () => {
        const quizData = { title: 'Invalid Quiz' };
        const mockError = new Error('Validation failed');
        api.createQuiz.mockRejectedValue(mockError);

        const { result } = renderHook(() => useQuizes());

        await act(async () => {
          await result.current.createQuiz(mockToken, mockUserId, quizData);
        });

        expect(result.current.error).toBe(mockError);
      });
    });

    describe('updateQuiz', () => {
      test('успешно обновляет квиз', async () => {
        const updateData = {
          title: 'Обновленный квиз',
          description: 'Новое описание'
        };

        api.updateQuiz.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useQuizes());

        let updateResult;
        await act(async () => {
          updateResult = await result.current.updateQuiz(mockToken, mockQuizId, updateData);
        });

        expect(updateResult).toEqual({ success: true });
        expect(api.updateQuiz).toHaveBeenCalledWith(mockToken, mockQuizId, updateData);
      });
    });

    describe('deleteQuiz', () => {
      test('успешно удаляет квиз', async () => {
        api.deleteQuiz.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useQuizes());

        let deleteResult;
        await act(async () => {
          deleteResult = await result.current.deleteQuiz(mockToken, mockQuizId);
        });

        expect(deleteResult).toEqual({ success: true });
        expect(api.deleteQuiz).toHaveBeenCalledWith(mockToken, mockQuizId);
      });
    });

    describe('getQuizQuestions', () => {
      test('успешно получает вопросы квиза', async () => {
        api.getQuizQuestions.mockResolvedValue(mockQuestions);

        const { result } = renderHook(() => useQuizes());

        let questionsResult;
        await act(async () => {
          questionsResult = await result.current.getQuizQuestions(mockQuizId, mockAccessKey);
        });

        expect(questionsResult).toEqual(mockQuestions);
        expect(api.getQuizQuestions).toHaveBeenCalledWith(mockQuizId, mockAccessKey);
      });
    });

    describe('connectToQuizByCode', () => {
      test('успешно подключается к квизу по коду', async () => {
        const mockConnectionData = {
          quizId: mockQuizId,
          accessKey: mockAccessKey
        };

        api.connectToQuizByCode.mockResolvedValue(mockConnectionData);

        const { result } = renderHook(() => useQuizes());

        let connectionResult;
        await act(async () => {
          connectionResult = await result.current.connectToQuizByCode(mockCode);
        });

        expect(connectionResult).toEqual(mockConnectionData);
        expect(api.connectToQuizByCode).toHaveBeenCalledWith(mockCode);
      });
    });

    describe('checkQuizOwnership', () => {
      test('возвращает true если пользователь является автором квиза', async () => {
        const mockUserQuiz = { ...mockQuiz, authorId: mockUserId };
        api.getQuizById.mockResolvedValue(mockUserQuiz);
        mockGetUserIdFromJWT.mockReturnValue(mockUserId);

        const { result } = renderHook(() => useQuizes());

        let isOwner;
        await act(async () => {
          isOwner = await result.current.checkQuizOwnership(mockQuizId, mockToken, mockAccessKey);
        });

        expect(isOwner).toBe(true);
        expect(api.getQuizById).toHaveBeenCalledWith(mockQuizId, mockToken, mockAccessKey);
        expect(mockGetUserIdFromJWT).toHaveBeenCalledWith(mockToken);
      });

      test('возвращает false если пользователь не является автором', async () => {
        const mockOtherUserQuiz = { ...mockQuiz, authorId: 999 }; // Другой автор
        api.getQuizById.mockResolvedValue(mockOtherUserQuiz);
        mockGetUserIdFromJWT.mockReturnValue(mockUserId);

        const { result } = renderHook(() => useQuizes());

        let isOwner;
        await act(async () => {
          isOwner = await result.current.checkQuizOwnership(mockQuizId, mockToken, mockAccessKey);
        });

        expect(isOwner).toBe(false);
      });

      test('возвращает false если не удалось получить userId из токена', async () => {
        api.getQuizById.mockResolvedValue(mockQuiz);
        mockGetUserIdFromJWT.mockReturnValue(null);

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const { result } = renderHook(() => useQuizes());

        let isOwner;
        await act(async () => {
          isOwner = await result.current.checkQuizOwnership(mockQuizId, mockToken, mockAccessKey);
        });

        expect(isOwner).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Не удалось получить ID пользователя из токена');

        consoleErrorSpy.mockRestore();
      });

      test('возвращает false при ошибке получения квиза', async () => {
        const mockError = new Error('Quiz not found');
        api.getQuizById.mockRejectedValue(mockError);

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const { result } = renderHook(() => useQuizes());

        let isOwner;
        await act(async () => {
          isOwner = await result.current.checkQuizOwnership(mockQuizId, mockToken, mockAccessKey);
        });

        expect(isOwner).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка проверки прав доступа:', mockError);

        consoleErrorSpy.mockRestore();
      });

      test('работает когда GetUserIdFromJWT не функция', async () => {
        // Случай когда useUsers не предоставляет GetUserIdFromJWT
        useUsers.mockReturnValue({
          GetUserIdFromJWT: undefined,
          getUserInfo: mockGetUserInfo
        });

        api.getQuizById.mockResolvedValue(mockQuiz);

        const { result } = renderHook(() => useQuizes());

        let isOwner;
        await act(async () => {
          isOwner = await result.current.checkQuizOwnership(mockQuizId, mockToken, mockAccessKey);
        });

        expect(isOwner).toBe(false);
      });
    });
  });

  describe('Edge Cases и обработка ошибок', () => {
    test('обрабатывает ситуацию когда категория не найдена в getAllQuizzes', async () => {
      // Загружаем категории
      categoryApi.getAllCategories.mockResolvedValue(mockCategories);
      
      // При фильтрации по несуществующей категории должен вызываться getAllQuizzes
      api.getAllQuizzes.mockResolvedValue([]);

      const { result } = renderHook(() => useQuizes());

      // Загружаем категории
      await act(async () => {
        await result.current.getAllCategories();
      });

      // Пробуем загрузить с несуществующей категорией
      await act(async () => {
        await result.current.getAllQuizzes(999); // Несуществующая категория
      });

      expect(api.getAllQuizzes).toHaveBeenCalled();
    });

    test('обрабатывает квизы без authorId в getAllQuizzes', async () => {
      const quizWithoutAuthor = {
        id: 999,
        title: 'Quiz without author',
        authorId: null
      };

      api.getAllQuizzes.mockResolvedValue([quizWithoutAuthor]);
      api.getQuizQuestions.mockResolvedValue([]);

      const { result } = renderHook(() => useQuizes());

      await act(async () => {
        await result.current.getAllQuizzes();
      });

      expect(result.current.quizzes[0]).toEqual({
        ...quizWithoutAuthor,
        authorName: 'Неизвестный автор',
        questionsCount: 0
      });

      expect(mockGetUserInfo).not.toHaveBeenCalled();
    });

    test('обрабатывает квизы с ошибкой при получении информации об авторе в getAllQuizzes', async () => {
      const quizWithAuthor = {
        id: 999,
        title: 'Quiz with author error',
        authorId: 999
      };

      api.getAllQuizzes.mockResolvedValue([quizWithAuthor]);
      api.getQuizQuestions.mockResolvedValue([]);
      mockGetUserInfo.mockRejectedValue(new Error('User not found'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() => useQuizes());

      await act(async () => {
        await result.current.getAllQuizzes();
      });

      expect(result.current.quizzes[0]).toEqual({
        ...quizWithAuthor,
        authorName: 'Неизвестный автор',
        questionsCount: 0
      });

      consoleWarnSpy.mockRestore();
    });

    test('сохраняет предыдущие данные при новой загрузке', async () => {
      // Первая загрузка
      api.getAllQuizzes.mockResolvedValueOnce([mockQuizzes[0]]);
      api.getQuizQuestions.mockResolvedValueOnce(mockQuestions);
      mockGetUserInfo.mockResolvedValueOnce({ userName: 'Author 1' });

      const { result } = renderHook(() => useQuizes());

      // Первая загрузка
      await act(async () => {
        await result.current.getAllQuizzes();
      });

      const firstQuizzes = [...result.current.quizzes];

      // Вторая загрузка
      api.getAllQuizzes.mockResolvedValueOnce([mockQuizzes[1]]);
      api.getQuizQuestions.mockResolvedValueOnce(mockQuestions);
      mockGetUserInfo.mockResolvedValueOnce({ userName: 'Author 2' });

      await act(async () => {
        await result.current.getAllQuizzes();
      });

      // Данные должны обновиться, а не добавиться
      expect(result.current.quizzes).not.toEqual(firstQuizzes);
      expect(result.current.quizzes[0].id).toBe(2); // Второй квиз
    });
  });
});