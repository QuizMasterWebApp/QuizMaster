import {
  getAllQuizzes,
  createQuiz,
  getQuizById,
  deleteQuiz,
  updateQuiz,
  getQuizQuestions,
  connectToQuizByCode
} from '../quizMethods.jsx'; // Указываем явно .jsx расширение
import apiClient from '../.APIclient.jsx';

// Мокаем только axios-клиент
jest.mock('../.APIclient');

describe('quizMethods API', () => {
  // Моковые данные
  const mockToken = 'test-jwt-token';
  const mockQuizId = 123;
  const mockAccessKey = 'ABCDE';
  const mockUserId = 456;

  // Сброс моков перед каждым тестом
  beforeEach(() => {
    jest.clearAllMocks();
    // Отключаем console.log для чистоты тестов
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAllQuizzes', () => {
    test('успешно получает все квизы с количеством вопросов', async () => {
      // Моковые данные для квизов
      const mockQuizzes = [
        { id: 1, title: 'Квиз 1', privateAccessKey: null },
        { id: 2, title: 'Квиз 2', privateAccessKey: 'KEY123' }
      ];

      // Моковые вопросы для каждого квиза
      const mockQuestions1 = [
        { id: 1, text: 'Вопрос 1' },
        { id: 2, text: 'Вопрос 2' }
      ];

      const mockQuestions2 = [
        { id: 3, text: 'Вопрос 3' }
      ];

      // Настраиваем моки apiClient
      apiClient.get
        .mockResolvedValueOnce({ data: mockQuizzes }) // Первый вызов getAllQuizzes
        .mockResolvedValueOnce({ data: mockQuestions1 }) // Вопросы для квиза 1
        .mockResolvedValueOnce({ data: mockQuestions2 }); // Вопросы для квиза 2

      const result = await getAllQuizzes();

      // Проверяем структуру результата
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      
      // Проверяем первый квиз
      expect(result[0]).toEqual({
        ...mockQuizzes[0],
        questionsCount: 2
      });
      
      // Проверяем второй квиз
      expect(result[1]).toEqual({
        ...mockQuizzes[1],
        questionsCount: 1
      });

      // Проверяем вызовы API
      expect(apiClient.get).toHaveBeenCalledTimes(3);
      expect(apiClient.get).toHaveBeenCalledWith('/Quiz');
      expect(apiClient.get).toHaveBeenCalledWith('/quiz/1/questions', { params: {} });
      expect(apiClient.get).toHaveBeenCalledWith('/quiz/2/questions', { params: { accessKey: 'KEY123' } });
    });

    test('обрабатывает ошибку при получении вопросов для квиза', async () => {
      const mockQuizzes = [
        { id: 1, title: 'Квиз 1', privateAccessKey: null }
      ];

      apiClient.get
        .mockResolvedValueOnce({ data: mockQuizzes })
        .mockRejectedValueOnce(new Error('Failed to get questions'));

      const result = await getAllQuizzes();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ...mockQuizzes[0],
        questionsCount: 0 // При ошибке должно быть 0
      });
    });

    test('обрабатывает пустой массив квизов', async () => {
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getAllQuizzes();

      expect(result).toEqual([]);
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    test('прокидывает ошибку при получении квизов', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      await expect(getAllQuizzes()).rejects.toThrow('Network error');
    });
  });

  describe('createQuiz', () => {
    const validQuizData = {
      title: 'Новый квиз',
      description: 'Описание квиза',
      categoryId: 1,
      isPublic: true,
      timeLimit: 3600
    };

    test('успешно создает квиз с валидными данными', async () => {
      const mockResponse = {
        data: {
          id: mockQuizId,
          ...validQuizData
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await createQuiz(mockToken, validQuizData);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith('/Quiz', {
        title: 'Новый квиз',
        description: 'Описание квиза',
        categoryId: 1,
        isPublic: true,
        timeLimit: 3600
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        }
      });
    });

    test('создает квиз с минимальными данными', async () => {
      const minimalQuizData = {
        title: 'Минимальный квиз'
      };

      const mockResponse = {
        data: {
          id: mockQuizId,
          title: 'Минимальный квиз',
          description: '',
          categoryId: null,
          isPublic: false,
          timeLimit: null
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await createQuiz(mockToken, minimalQuizData);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith('/Quiz', {
        title: 'Минимальный квиз',
        description: '',
        categoryId: null,
        isPublic: false,
        timeLimit: null
      }, expect.any(Object));
    });

    test('бросает ошибку при отсутствии токена', async () => {
      await expect(createQuiz(null, validQuizData))
        .rejects.toThrow('Токен авторизации обязателен');
    });

    test('бросает ошибку при пустом названии', async () => {
      const invalidQuizData = {
        title: '', // Пустое название
        description: 'Описание'
      };

      await expect(createQuiz(mockToken, invalidQuizData))
        .rejects.toThrow('Название квиза обязательно');
    });

    test('бросает ошибку при названии только из пробелов', async () => {
      const invalidQuizData = {
        title: '   ', // Только пробелы
        description: 'Описание'
      };

      await expect(createQuiz(mockToken, invalidQuizData))
        .rejects.toThrow('Название квиза обязательно');
    });

    test('обрабатывает ошибку 400 от сервера', async () => {
      const error400 = {
        response: {
          status: 400,
          data: 'Invalid category ID'
        }
      };

      apiClient.post.mockRejectedValue(error400);

      await expect(createQuiz(mockToken, validQuizData))
        .rejects.toThrow('Invalid category ID');
    });

    test('обрабатывает ошибку 401 от сервера', async () => {
      const error401 = {
        response: { status: 401 }
      };

      apiClient.post.mockRejectedValue(error401);

      await expect(createQuiz(mockToken, validQuizData))
        .rejects.toThrow('Ошибка авторизации. Пожалуйста, войдите снова.');
    });

    test('прокидывает другие ошибки', async () => {
      const error = new Error('Network error');
      apiClient.post.mockRejectedValue(error);

      await expect(createQuiz(mockToken, validQuizData))
        .rejects.toThrow('Network error');
    });
  });

  describe('getQuizById', () => {
    const mockQuizData = {
      id: mockQuizId,
      title: 'Тестовый квиз',
      description: 'Описание тестового квиза',
      authorId: mockUserId
    };

    const mockQuestions = [
      { id: 1, text: 'Вопрос 1' },
      { id: 2, text: 'Вопрос 2' }
    ];

    test('успешно получает квиз по ID без accessKey', async () => {
      apiClient.get
        .mockResolvedValueOnce({ data: mockQuizData })
        .mockResolvedValueOnce({ data: mockQuestions });

      const result = await getQuizById(mockQuizId, mockToken);

      expect(result).toEqual({
        ...mockQuizData,
        questionsCount: 2
      });

      expect(apiClient.get).toHaveBeenCalledTimes(2);
      expect(apiClient.get).toHaveBeenCalledWith(`/Quiz/${mockQuizId}`, {
        headers: { 'Authorization': `Bearer ${mockToken}` }
      });
      expect(apiClient.get).toHaveBeenCalledWith(`/quiz/${mockQuizId}/questions`, { params: {} });
    });

    test('успешно получает квиз по ID с accessKey', async () => {
      apiClient.get
        .mockResolvedValueOnce({ data: mockQuizData })
        .mockResolvedValueOnce({ data: mockQuestions });

      const result = await getQuizById(mockQuizId, mockToken, mockAccessKey);

      expect(result).toEqual({
        ...mockQuizData,
        questionsCount: 2
      });

      // При наличии accessKey URL должен быть другой
      expect(apiClient.get).toHaveBeenCalledWith(`Quiz/access/${encodeURIComponent(mockAccessKey)}`, {
        headers: { 'Authorization': `Bearer ${mockToken}` }
      });
    });

    test('получает квиз без токена', async () => {
      apiClient.get
        .mockResolvedValueOnce({ data: mockQuizData })
        .mockResolvedValueOnce({ data: mockQuestions });

      const result = await getQuizById(mockQuizId, null);

      expect(result.questionsCount).toBe(2);
      expect(apiClient.get).toHaveBeenCalledWith(`/Quiz/${mockQuizId}`, {
        headers: {} // Без заголовка авторизации
      });
    });

    test('обрабатывает пустой массив вопросов', async () => {
      apiClient.get
        .mockResolvedValueOnce({ data: mockQuizData })
        .mockResolvedValueOnce({ data: [] });

      const result = await getQuizById(mockQuizId, mockToken);

      expect(result.questionsCount).toBe(0);
    });

    test('прокидывает ошибку при получении квиза', async () => {
      const error = new Error('Quiz not found');
      apiClient.get.mockRejectedValue(error);

      // Мокаем console.error чтобы проверить логирование
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(getQuizById(mockQuizId, mockToken))
        .rejects.toThrow('Quiz not found');

      // Проверяем, что ошибка была залогирована
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Ошибка при получении квиза ${mockQuizId}:`,
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    test('работает с accessKey содержащим специальные символы', async () => {
      const specialAccessKey = 'A@B#C$D';
      apiClient.get
        .mockResolvedValueOnce({ data: mockQuizData })
        .mockResolvedValueOnce({ data: mockQuestions });

      await getQuizById(mockQuizId, mockToken, specialAccessKey);

      expect(apiClient.get).toHaveBeenCalledWith(
        `Quiz/access/${encodeURIComponent(specialAccessKey)}`,
        expect.any(Object)
      );
    });
  });

  describe('deleteQuiz', () => {
    test('успешно удаляет квиз', async () => {
      const mockResponse = {
        data: 'Квиз успешно удален'
      };

      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await deleteQuiz(mockToken, mockQuizId);

      expect(result).toBe('Квиз успешно удален');
      expect(apiClient.delete).toHaveBeenCalledWith(`/Quiz/${mockQuizId}`, {
        headers: { 'Authorization': `Bearer ${mockToken}` }
      });
    });

    test('бросает ошибку при отсутствии токена', async () => {
      await expect(deleteQuiz(null, mockQuizId))
        .rejects.toThrow('Токен авторизации обязателен');
    });

    test('бросает ошибку при невалидном ID', async () => {
      await expect(deleteQuiz(mockToken, 0))
        .rejects.toThrow('Неверный ID квиза для удаления');
      
      await expect(deleteQuiz(mockToken, -1))
        .rejects.toThrow('Неверный ID квиза для удаления');
      
      await expect(deleteQuiz(mockToken, null))
        .rejects.toThrow('Неверный ID квиза для удаления');
    });

    test('обрабатывает ошибку 404 от сервера', async () => {
      const error404 = {
        response: { status: 404 }
      };

      apiClient.delete.mockRejectedValue(error404);

      await expect(deleteQuiz(mockToken, mockQuizId))
        .rejects.toThrow(`Квиз с ID ${mockQuizId} не найден`);
    });

    test('обрабатывает ошибку 403 от сервера', async () => {
      const error403 = {
        response: { status: 403 }
      };

      apiClient.delete.mockRejectedValue(error403);

      await expect(deleteQuiz(mockToken, mockQuizId))
        .rejects.toThrow('У вас нет прав для удаления этого квиза');
    });

    test('обрабатывает ошибку 401 от сервера', async () => {
      const error401 = {
        response: { status: 401 }
      };

      apiClient.delete.mockRejectedValue(error401);

      await expect(deleteQuiz(mockToken, mockQuizId))
        .rejects.toThrow('Ошибка авторизации');
    });

    test('возвращает сообщение из response.data если есть', async () => {
      const mockResponse = {
        data: { message: 'Квиз удален успешно' }
      };

      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await deleteQuiz(mockToken, mockQuizId);

      expect(result).toEqual({ message: 'Квиз удален успешно' });
    });

    test('возвращает строку по умолчанию если нет response.data', async () => {
      const mockResponse = {}; // Нет data

      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await deleteQuiz(mockToken, mockQuizId);

      expect(result).toBe('Квиз успешно удален');
    });
  });

  describe('updateQuiz', () => {
    const updates = {
      title: 'Обновленный квиз',
      description: 'Новое описание',
      timeLimit: 1800
    };

    test('успешно обновляет квиз', async () => {
      const mockResponse = {
        status: 200,
        data: { id: mockQuizId, ...updates }
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await updateQuiz(mockToken, mockQuizId, updates);

      expect(result).toEqual(mockResponse);
      expect(apiClient.put).toHaveBeenCalledWith(`/Quiz/${mockQuizId}`, updates, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        }
      });
    });

    test('обрабатывает ошибку 404 от сервера', async () => {
      const error404 = {
        response: { status: 404 }
      };

      apiClient.put.mockRejectedValue(error404);

      await expect(updateQuiz(mockToken, mockQuizId, updates))
        .rejects.toThrow(`Квиз с ID ${mockQuizId} не найден`);
    });

    test('обрабатывает ошибку 403 от сервера', async () => {
      const error403 = {
        response: { status: 403 }
      };

      apiClient.put.mockRejectedValue(error403);

      await expect(updateQuiz(mockToken, mockQuizId, updates))
        .rejects.toThrow('У вас нет прав для обновления этого квиза');
    });

    test('прокидывает другие ошибки', async () => {
      const error = new Error('Network error');
      apiClient.put.mockRejectedValue(error);

      await expect(updateQuiz(mockToken, mockQuizId, updates))
        .rejects.toThrow('Network error');
    });
  });

  describe('getQuizQuestions', () => {
    const mockQuestions = [
      { id: 1, text: 'Вопрос 1', options: [] },
      { id: 2, text: 'Вопрос 2', options: [] }
    ];

    test('успешно получает вопросы без accessKey', async () => {
      apiClient.get.mockResolvedValue({ data: mockQuestions });

      const result = await getQuizQuestions(mockQuizId);

      expect(result).toEqual(mockQuestions);
      expect(apiClient.get).toHaveBeenCalledWith(`/quiz/${mockQuizId}/questions`, { params: {} });
    });

    test('успешно получает вопросы с accessKey', async () => {
      apiClient.get.mockResolvedValue({ data: mockQuestions });

      const result = await getQuizQuestions(mockQuizId, mockAccessKey);

      expect(result).toEqual(mockQuestions);
      expect(apiClient.get).toHaveBeenCalledWith(`/quiz/${mockQuizId}/questions`, {
        params: { accessKey: mockAccessKey }
      });
    });

    test('обрабатывает пустой массив вопросов', async () => {
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getQuizQuestions(mockQuizId);

      expect(result).toEqual([]);
    });

    test('прокидывает ошибку при получении вопросов', async () => {
      const error = new Error('Failed to get questions');
      apiClient.get.mockRejectedValue(error);

      await expect(getQuizQuestions(mockQuizId))
        .rejects.toThrow('Failed to get questions');
    });
  });

  describe('connectToQuizByCode', () => {
    const mockCode = 'ABCDE';
    const mockResponseData = {
      quizId: mockQuizId,
      accessKey: mockAccessKey,
      title: 'Квиз по коду'
    };

    test('успешно подключается к квизу по коду', async () => {
      apiClient.get.mockResolvedValue({ data: mockResponseData });

      const result = await connectToQuizByCode(mockCode);

      expect(result).toEqual(mockResponseData);
      expect(apiClient.get).toHaveBeenCalledWith(`/quiz/connect/${mockCode}`);
    });

    test('прокидывает ошибку при подключении', async () => {
      const error = new Error('Invalid code');
      apiClient.get.mockRejectedValue(error);

      await expect(connectToQuizByCode(mockCode))
        .rejects.toThrow('Invalid code');
    });

    test('работает с кодами в разных регистрах', async () => {
      const lowerCaseCode = 'abcde';
      apiClient.get.mockResolvedValue({ data: mockResponseData });

      await connectToQuizByCode(lowerCaseCode);

      expect(apiClient.get).toHaveBeenCalledWith(`/quiz/connect/${lowerCaseCode}`);
    });
  });
});