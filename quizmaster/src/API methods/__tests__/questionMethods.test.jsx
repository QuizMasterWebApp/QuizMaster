import {
  getQuestionById,
  createQuestion,
  updateQuestion,
  updateOption,
  deleteQuestion,
  getOptionById,
  getQuestionOptions,
  createOption,
  deleteOption
} from '../questionMethods';
import apiClient from '../.APIclient';

jest.mock('../.APIclient');

describe('questionMethods Extended Edge Cases', () => {
  const mockToken = 'test-token';
  const mockQuestionId = 123;
  const mockQuizId = 456;
  const mockOptionId = 789;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('Edge Cases для getQuestionById', () => {
    test('обрабатывает отсутствие опций в ответе API', async () => {
      const mockQuestion = {
        id: mockQuestionId,
        text: 'Вопрос без опций',
        type: 0
        // Нет свойства options
      };
      
      apiClient.get.mockResolvedValue({ data: mockQuestion });

      const result = await getQuestionById(mockQuestionId);

      expect(result).toEqual(mockQuestion);
    });

    test('обрабатывает null в опциях', async () => {
      const mockQuestion = {
        id: mockQuestionId,
        text: 'Вопрос',
        type: 0,
        options: null
      };
      
      apiClient.get.mockResolvedValue({ data: mockQuestion });

      const result = await getQuestionById(mockQuestionId);

      expect(result.options).toBe(null);
    });

    test('обрабатывает undefined в опциях', async () => {
      const mockQuestion = {
        id: mockQuestionId,
        text: 'Вопрос',
        type: 0,
        options: undefined
      };
      
      apiClient.get.mockResolvedValue({ data: mockQuestion });

      const result = await getQuestionById(mockQuestionId);

      expect(result.options).toBe(undefined);
    });

    test('обрабатывает пустой массив опций', async () => {
      const mockQuestion = {
        id: mockQuestionId,
        text: 'Вопрос',
        type: 0,
        options: []
      };
      
      apiClient.get.mockResolvedValue({ data: mockQuestion });

      const result = await getQuestionById(mockQuestionId);

      expect(result.options).toEqual([]);
    });

    test('обрабатывает опции с отсутствующим isCorrect', async () => {
      const mockQuestion = {
        id: mockQuestionId,
        text: 'Вопрос',
        type: 0,
        options: [
          { id: 1, text: 'Опция 1' }, // Нет isCorrect
          { id: 2, text: 'Опция 2', isCorrect: true }
        ]
      };
      
      apiClient.get.mockResolvedValue({ data: mockQuestion });

      const result = await getQuestionById(mockQuestionId);

      expect(result.options[0].isCorrect).toBe(false);
      expect(result.options[1].isCorrect).toBe(true);
    });

    test('обрабатывает 404 ошибку при получении вопроса', async () => {
      const error404 = {
        response: { status: 404 }
      };
      
      apiClient.get.mockRejectedValue(error404);

      await expect(getQuestionById(99999))
        .rejects.toThrow('Вопрос с ID 99999 не найден');
    });

    test('обрабатывает общую ошибку при получении вопроса', async () => {
      const genericError = new Error('Generic error');
      apiClient.get.mockRejectedValue(genericError);

      await expect(getQuestionById(mockQuestionId))
        .rejects.toThrow('Generic error');
    });
  });

  describe('Edge Cases для createQuestion', () => {
    test('обрабатывает null в quizId', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: null,
        type: 0,
        options: [
          { text: 'Ответ 1', isCorrect: true },
          { text: 'Ответ 2', isCorrect: false }
        ]
      };

      await expect(createQuestion(questionData, mockToken))
        .rejects.toThrow('ID квиза обязателен');
    });

    test('обрабатывает невалидный type (2)', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: 2, // Невалидный тип
        options: [
          { text: 'Ответ 1', isCorrect: true },
          { text: 'Ответ 2', isCorrect: false }
        ]
      };

      await expect(createQuestion(questionData, mockToken))
        .rejects.toThrow('Тип вопроса должен быть 0 (одиночный) или 1 (множественный)');
    });

    test('обрабатывает строковый type', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: '0', // Строка вместо числа
        options: [
          { text: 'Ответ 1', isCorrect: true },
          { text: 'Ответ 2', isCorrect: false }
        ]
      };

      // Строка '0' не проходит валидацию
      await expect(createQuestion(questionData, mockToken))
        .rejects.toThrow('Тип вопроса должен быть 0 (одиночный) или 1 (множественный)');
    });

    test('обрабатывает null в options', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: 0,
        options: null
      };

      await expect(createQuestion(questionData, mockToken))
        .rejects.toThrow('Вопрос должен содержать минимум 2 варианта ответа');
    });

    test('обрабатывает пустой массив options', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: 0,
        options: []
      };

      await expect(createQuestion(questionData, mockToken))
        .rejects.toThrow('Вопрос должен содержать минимум 2 варианта ответа');
    });

    test('обрабатывает только одну опцию', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: 0,
        options: [{ text: 'Только один ответ', isCorrect: true }]
      };

      await expect(createQuestion(questionData, mockToken))
        .rejects.toThrow('Вопрос должен содержать минимум 2 варианта ответа');
    });

    test('обрабатывает опции без свойства isCorrect', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: 0,
        options: [
          { text: 'Ответ 1' }, // Нет isCorrect
          { text: 'Ответ 2' }   // Нет isCorrect
        ]
      };

      const mockResponse = { data: { id: mockQuestionId } };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await createQuestion(questionData, mockToken);
      
      // Проверяем, что isCorrect становится false по умолчанию
      expect(apiClient.post).toHaveBeenCalledWith(
        '/Question',
        {
          text: 'Вопрос',
          quizId: mockQuizId,
          type: 0,
          options: [
            { text: 'Ответ 1', isCorrect: false },
            { text: 'Ответ 2', isCorrect: false }
          ]
        },
        expect.any(Object)
      );
    });

    test('обрабатывает опции с null в isCorrect', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: 0,
        options: [
          { text: 'Ответ 1', isCorrect: null },
          { text: 'Ответ 2', isCorrect: true }
        ]
      };

      const mockResponse = { data: { id: mockQuestionId } };
      apiClient.post.mockResolvedValue(mockResponse);

      await createQuestion(questionData, mockToken);
      
      expect(apiClient.post).toHaveBeenCalledWith(
        '/Question',
        {
          text: 'Вопрос',
          quizId: mockQuizId,
          type: 0,
          options: [
            { text: 'Ответ 1', isCorrect: false }, // null преобразуется в false
            { text: 'Ответ 2', isCorrect: true }
          ]
        },
        expect.any(Object)
      );
    });

    test('обрабатывает множественный выбор с одним правильным ответом', async () => {
      const questionData = {
        text: 'Множественный выбор с одним правильным',
        quizId: mockQuizId,
        type: 1, // Множественный выбор
        options: [
          { text: 'Ответ 1', isCorrect: true },
          { text: 'Ответ 2', isCorrect: false },
          { text: 'Ответ 3', isCorrect: false }
        ]
      };

      const mockResponse = { data: { id: mockQuestionId } };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await createQuestion(questionData, mockToken);
      expect(result.id).toBe(mockQuestionId);
    });

    test('обрабатывает ошибку 403 при создании вопроса', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: 0,
        options: [
          { text: 'Ответ 1', isCorrect: true },
          { text: 'Ответ 2', isCorrect: false }
        ]
      };

      const error403 = {
        response: { status: 403 }
      };
      
      apiClient.post.mockRejectedValue(error403);

      await expect(createQuestion(questionData, mockToken))
        .rejects.toThrow('У вас нет прав на создание вопросов в этом квизе');
    });

    test('обрабатывает ошибку 400 с сообщением от сервера', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: 0,
        options: [
          { text: 'Ответ 1', isCorrect: true },
          { text: 'Ответ 2', isCorrect: false }
        ]
      };

      const error400 = {
        response: { 
          status: 400,
          data: { error: 'Invalid question data' }
        }
      };
      
      apiClient.post.mockRejectedValue(error400);

      await expect(createQuestion(questionData, mockToken))
        .rejects.toThrow('Invalid question data');
    });

    test('обрабатывает ошибку 400 без сообщения', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: 0,
        options: [
          { text: 'Ответ 1', isCorrect: true },
          { text: 'Ответ 2', isCorrect: false }
        ]
      };

      const error400 = {
        response: { 
          status: 400,
          data: null
        }
      };
      
      apiClient.post.mockRejectedValue(error400);

      await expect(createQuestion(questionData, mockToken))
        .rejects.toThrow('Неверные данные для создания вопроса');
    });

    test('обрабатывает ошибку 401', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: 0,
        options: [
          { text: 'Ответ 1', isCorrect: true },
          { text: 'Ответ 2', isCorrect: false }
        ]
      };

      const error401 = {
        response: { status: 401 }
      };
      
      apiClient.post.mockRejectedValue(error401);

      await expect(createQuestion(questionData, mockToken))
        .rejects.toThrow('Ошибка авторизации. Пожалуйста, войдите снова.');
    });

    test('обрабатывает создание без токена', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: 0,
        options: [
          { text: 'Ответ 1', isCorrect: true },
          { text: 'Ответ 2', isCorrect: false }
        ]
      };

      const mockResponse = { data: { id: mockQuestionId } };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await createQuestion(questionData, null);
      
      expect(apiClient.post).toHaveBeenCalledWith(
        '/Question',
        expect.any(Object),
        { headers: {} } // Пустые headers без токена
      );
    });

    test('обрабатывает опцию с пустым текстом', async () => {
      const questionData = {
        text: 'Вопрос',
        quizId: mockQuizId,
        type: 0,
        options: [
          { text: '', isCorrect: true }, // Пустой текст
          { text: 'Ответ 2', isCorrect: false }
        ]
      };

      // Валидация проходит, так как проверка только на количество опций
      const mockResponse = { data: { id: mockQuestionId } };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await createQuestion(questionData, mockToken);
      expect(result.id).toBe(mockQuestionId);
    });
  });

  describe('Edge Cases для updateQuestion', () => {
    test('обрабатывает пустой текст вопроса', async () => {
      const updateData = {
        text: '', // Пустой текст
        type: 0
      };

      await expect(updateQuestion(mockQuestionId, updateData, mockToken))
        .rejects.toThrow('Текст вопроса обязателен');
    });

    test('обрабатывает текст только из пробелов', async () => {
      const updateData = {
        text: '   ', // Только пробелы
        type: 0
      };

      await expect(updateQuestion(mockQuestionId, updateData, mockToken))
        .rejects.toThrow('Текст вопроса обязателен');
    });

    test('обрабатывает невалидный тип (не 0 или 1)', async () => {
      const updateData = {
        text: 'Вопрос',
        type: 2 // Невалидный тип
      };

      await expect(updateQuestion(mockQuestionId, updateData, mockToken))
        .rejects.toThrow('Тип вопроса должен быть 0 (одиночный) или 1 (множественный)');
    });

    test('обрабатывает тип как строку', async () => {
      const updateData = {
        text: 'Вопрос',
        type: '1' // Строка вместо числа
      };

      await expect(updateQuestion(mockQuestionId, updateData, mockToken))
        .rejects.toThrow('Тип вопроса должен быть 0 (одиночный) или 1 (множественный)');
    });

    test('обрабатывает ошибку 403 при обновлении', async () => {
      const updateData = {
        text: 'Обновленный вопрос',
        type: 0
      };

      const error403 = {
        response: { status: 403 }
      };
      
      apiClient.put.mockRejectedValue(error403);

      await expect(updateQuestion(mockQuestionId, updateData, mockToken))
        .rejects.toThrow('У вас нет прав на редактирование этого вопроса');
    });

    test('обрабатывает ошибку 404 при обновлении', async () => {
      const updateData = {
        text: 'Обновленный вопрос',
        type: 0
      };

      const error404 = {
        response: { status: 404 }
      };
      
      apiClient.put.mockRejectedValue(error404);

      await expect(updateQuestion(99999, updateData, mockToken))
        .rejects.toThrow('Вопрос с ID 99999 не найден');
    });

    test('обрабатывает ошибку 400 при обновлении с сообщением', async () => {
      const updateData = {
        text: 'Обновленный вопрос',
        type: 0
      };

      const error400 = {
        response: { 
          status: 400,
          data: { error: 'Invalid question text' }
        }
      };
      
      apiClient.put.mockRejectedValue(error400);

      await expect(updateQuestion(mockQuestionId, updateData, mockToken))
        .rejects.toThrow('Invalid question text');
    });

    test('обрабатывает ошибку 400 при обновлении без сообщения', async () => {
      const updateData = {
        text: 'Обновленный вопрос',
        type: 0
      };

      const error400 = {
        response: { 
          status: 400,
          data: null
        }
      };
      
      apiClient.put.mockRejectedValue(error400);

      await expect(updateQuestion(mockQuestionId, updateData, mockToken))
        .rejects.toThrow('Неверные данные для обновления вопроса');
    });

    test('обрабатывает ошибку 401 при обновлении', async () => {
      const updateData = {
        text: 'Обновленный вопрос',
        type: 0
      };

      const error401 = {
        response: { status: 401 }
      };
      
      apiClient.put.mockRejectedValue(error401);

      await expect(updateQuestion(mockQuestionId, updateData, mockToken))
        .rejects.toThrow('Ошибка авторизации. Пожалуйста, войдите снова.');
    });

    test('обрабатывает обновление без токена', async () => {
      const updateData = {
        text: 'Обновленный вопрос',
        type: 0
      };

      const mockResponse = { data: { id: mockQuestionId } };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await updateQuestion(mockQuestionId, updateData, null);
      
      expect(apiClient.put).toHaveBeenCalledWith(
        `/Question/${mockQuestionId}`,
        updateData,
        { headers: {} } // Пустые headers без токена
      );
    });
  });

  describe('Edge Cases для updateOption', () => {
    test('обрабатывает пустой текст опции', async () => {
      const optionData = {
        text: '', // Пустой текст
        isCorrect: true
      };

      await expect(updateOption(mockOptionId, optionData, mockToken))
        .rejects.toThrow('Текст опции обязателен');
    });

    test('обрабатывает текст опции только из пробелов', async () => {
      const optionData = {
        text: '   ', // Только пробелы
        isCorrect: true
      };

      await expect(updateOption(mockOptionId, optionData, mockToken))
        .rejects.toThrow('Текст опции обязателен');
    });

    test('обрабатывает isCorrect как строку', async () => {
      const optionData = {
        text: 'Опция',
        isCorrect: 'true' // Строка вместо boolean
      };

      const mockResponse = { data: { id: mockOptionId } };
      apiClient.put.mockResolvedValue(mockResponse);

      await updateOption(mockOptionId, optionData, mockToken);

      expect(apiClient.put).toHaveBeenCalledWith(
        `/Question/option/${mockOptionId}`,
        { text: 'Опция', isCorrect: 'true' }, // Сохраняется как строка
        expect.any(Object)
      );
    });

    test('обрабатывает ошибку 403 при обновлении опции', async () => {
      const optionData = {
        text: 'Обновленная опция',
        isCorrect: true
      };

      const error403 = {
        response: { status: 403 }
      };
      
      apiClient.put.mockRejectedValue(error403);

      await expect(updateOption(mockOptionId, optionData, mockToken))
        .rejects.toThrow('У вас нет прав на редактирование этой опции');
    });

    test('обрабатывает ошибку 404 при обновлении опции', async () => {
      const optionData = {
        text: 'Обновленная опция',
        isCorrect: true
      };

      const error404 = {
        response: { status: 404 }
      };
      
      apiClient.put.mockRejectedValue(error404);

      await expect(updateOption(99999, optionData, mockToken))
        .rejects.toThrow('Опция с ID 99999 не найдена');
    });

    test('обрабатывает ошибку 400 при обновлении опции с сообщением', async () => {
      const optionData = {
        text: 'Обновленная опция',
        isCorrect: true
      };

      const error400 = {
        response: { 
          status: 400,
          data: { error: 'Invalid option text' }
        }
      };
      
      apiClient.put.mockRejectedValue(error400);

      await expect(updateOption(mockOptionId, optionData, mockToken))
        .rejects.toThrow('Invalid option text');
    });

    test('обрабатывает ошибку 400 при обновлении опции без сообщения', async () => {
      const optionData = {
        text: 'Обновленная опция',
        isCorrect: true
      };

      const error400 = {
        response: { 
          status: 400,
          data: null
        }
      };
      
      apiClient.put.mockRejectedValue(error400);

      await expect(updateOption(mockOptionId, optionData, mockToken))
        .rejects.toThrow('Неверные данные для обновления опции');
    });

    test('обрабатывает ошибку 401 при обновлении опции', async () => {
      const optionData = {
        text: 'Обновленная опция',
        isCorrect: true
      };

      const error401 = {
        response: { status: 401 }
      };
      
      apiClient.put.mockRejectedValue(error401);

      await expect(updateOption(mockOptionId, optionData, mockToken))
        .rejects.toThrow('Ошибка авторизации. Пожалуйста, войдите снова.');
    });

    test('обрабатывает обновление опции без токена', async () => {
      const optionData = {
        text: 'Обновленная опция',
        isCorrect: true
      };

      const mockResponse = { data: { id: mockOptionId } };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await updateOption(mockOptionId, optionData, null);
      
      expect(apiClient.put).toHaveBeenCalledWith(
        `/Question/option/${mockOptionId}`,
        { text: 'Обновленная опция', isCorrect: true },
        { headers: {} } // Пустые headers без токена
      );
    });

    test('обрабатывает ответ API с данными', async () => {
      const optionData = {
        text: 'Опция',
        isCorrect: true
      };

      const mockResponse = { 
        data: { 
          id: mockOptionId,
          text: 'Опция',
          isCorrect: true,
          questionId: mockQuestionId
        }
      };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await updateOption(mockOptionId, optionData, mockToken);
      
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Edge Cases для deleteQuestion', () => {
    test('обрабатывает ошибку 409 при удалении', async () => {
      const error409 = {
        response: { status: 409 }
      };
      
      apiClient.delete.mockRejectedValue(error409);

      await expect(deleteQuestion(mockQuestionId, mockToken))
        .rejects.toThrow('Невозможно удалить вопрос, поскольку на него есть ответы пользователя');
    });

    test('обрабатывает ошибку 403 при удалении', async () => {
      const error403 = {
        response: { status: 403 }
      };
      
      apiClient.delete.mockRejectedValue(error403);

      await expect(deleteQuestion(mockQuestionId, mockToken))
        .rejects.toThrow('У вас нет прав на удаление этого вопроса');
    });

    test('обрабатывает ошибку 401 при удалении', async () => {
      const error401 = {
        response: { status: 401 }
      };
      
      apiClient.delete.mockRejectedValue(error401);

      await expect(deleteQuestion(mockQuestionId, mockToken))
        .rejects.toThrow('Ошибка авторизации. Пожалуйста, войдите снова.');
    });

    test('обрабатывает удаление без токена', async () => {
      const mockResponse = { status: 200 };
      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await deleteQuestion(mockQuestionId, null);
      
      expect(apiClient.delete).toHaveBeenCalledWith(
        `/Question/${mockQuestionId}`,
        { headers: {} } // Пустые headers без токена
      );
    });

    test('обрабатывает успешный ответ от сервера', async () => {
      const mockResponse = { 
        status: 200,
        data: { message: 'Question deleted successfully' }
      };
      
      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await deleteQuestion(mockQuestionId, mockToken);
      
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Edge Cases для getOptionById', () => {
    test('успешно получает опцию', async () => {
      const mockOption = {
        id: mockOptionId,
        text: 'Текст опции',
        isCorrect: true,
        questionId: mockQuestionId
      };
      
      apiClient.get.mockResolvedValue({ data: mockOption });

      const result = await getOptionById(mockOptionId);

      expect(result).toEqual(mockOption);
    });

    test('обрабатывает 404 ошибку', async () => {
      const error404 = {
        response: { status: 404 }
      };
      
      apiClient.get.mockRejectedValue(error404);

      await expect(getOptionById(99999))
        .rejects.toThrow('Опция с ID 99999 не найден');
    });

    test('обрабатывает общую ошибку', async () => {
      const genericError = new Error('Network error');
      apiClient.get.mockRejectedValue(genericError);

      await expect(getOptionById(mockOptionId))
        .rejects.toThrow('Network error');
    });
  });

  describe('Edge Cases для getQuestionOptions', () => {
    test('успешно получает опции вопроса', async () => {
      const mockOptions = [
        { id: 1, text: 'Опция 1', isCorrect: true },
        { id: 2, text: 'Опция 2', isCorrect: false }
      ];
      
      apiClient.get.mockResolvedValue({ data: mockOptions });

      const result = await getQuestionOptions(mockQuestionId);

      expect(result).toEqual(mockOptions);
    });

    test('обрабатывает пустой массив опций', async () => {
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getQuestionOptions(mockQuestionId);

      expect(result).toEqual([]);
    });

    test('обрабатывает ошибку и возвращает пустой массив', async () => {
      const genericError = new Error('Network error');
      apiClient.get.mockRejectedValue(genericError);

      const result = await getQuestionOptions(mockQuestionId);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Edge Cases для createOption', () => {
    test('успешно создает опцию', async () => {
      const optionData = {
        text: 'Новая опция',
        isCorrect: true
      };

      const mockResponse = { 
        data: { 
          id: mockOptionId,
          ...optionData 
        } 
      };
      
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await createOption(mockQuestionId, optionData, mockToken);

      expect(result).toEqual(mockResponse.data);
    });

    test('обрабатывает пустой текст опции', async () => {
      const optionData = {
        text: '', // Пустой текст
        isCorrect: true
      };

      await expect(createOption(mockQuestionId, optionData, mockToken))
        .rejects.toThrow('Текст опции обязателен');
    });

    test('обрабатывает текст опции только из пробелов', async () => {
      const optionData = {
        text: '   ', // Только пробелы
        isCorrect: true
      };

      await expect(createOption(mockQuestionId, optionData, mockToken))
        .rejects.toThrow('Текст опции обязателен');
    });

    test('обрабатывает isCorrect как null', async () => {
      const optionData = {
        text: 'Опция',
        isCorrect: null
      };

      const mockResponse = { data: { id: mockOptionId } };
      apiClient.post.mockResolvedValue(mockResponse);

      await createOption(mockQuestionId, optionData, mockToken);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/Question/${mockQuestionId}/option`,
        { text: 'Опция', isCorrect: false }, // null преобразуется в false
        expect.any(Object)
      );
    });

    test('обрабатывает ошибку 403 при создании опции', async () => {
      const optionData = {
        text: 'Новая опция',
        isCorrect: true
      };

      const error403 = {
        response: { status: 403 }
      };
      
      apiClient.post.mockRejectedValue(error403);

      await expect(createOption(mockQuestionId, optionData, mockToken))
        .rejects.toThrow('У вас нет прав на добавление опций к этому вопросу');
    });

    test('обрабатывает ошибку 404 при создании опции', async () => {
      const optionData = {
        text: 'Новая опция',
        isCorrect: true
      };

      const error404 = {
        response: { status: 404 }
      };
      
      apiClient.post.mockRejectedValue(error404);

      await expect(createOption(99999, optionData, mockToken))
        .rejects.toThrow('Вопрос с ID 99999 не найден');
    });

    test('обрабатывает ошибку 401 при создании опции', async () => {
      const optionData = {
        text: 'Новая опция',
        isCorrect: true
      };

      const error401 = {
        response: { status: 401 }
      };
      
      apiClient.post.mockRejectedValue(error401);

      await expect(createOption(mockQuestionId, optionData, mockToken))
        .rejects.toThrow('Ошибка авторизации. Пожалуйста, войдите снова.');
    });

    test('обрабатывает создание опции без токена', async () => {
      const optionData = {
        text: 'Новая опция',
        isCorrect: true
      };

      const mockResponse = { data: { id: mockOptionId } };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await createOption(mockQuestionId, optionData, null);
      
      expect(apiClient.post).toHaveBeenCalledWith(
        `/Question/${mockQuestionId}/option`,
        { text: 'Новая опция', isCorrect: true },
        { headers: {} } // Пустые headers без токена
      );
    });
  });

  describe('Edge Cases для deleteOption', () => {
    test('успешно удаляет опцию', async () => {
      const mockResponse = { 
        data: { message: 'Option deleted successfully' }
      };
      
      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await deleteOption(mockOptionId, mockToken);

      expect(result).toEqual(mockResponse.data);
    });

    test('обрабатывает ответ без данных', async () => {
      const mockResponse = { status: 200 }; // Нет data
      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await deleteOption(mockOptionId, mockToken);

      expect(result).toBe('Опция успешно удалена');
    });

    test('обрабатывает ошибку 403 при удалении опции', async () => {
      const error403 = {
        response: { status: 403 }
      };
      
      apiClient.delete.mockRejectedValue(error403);

      await expect(deleteOption(mockOptionId, mockToken))
        .rejects.toThrow('У вас нет прав на удаление этой опции');
    });

    test('обрабатывает ошибку 404 при удалении опции', async () => {
      const error404 = {
        response: { status: 404 }
      };
      
      apiClient.delete.mockRejectedValue(error404);

      await expect(deleteOption(99999, mockToken))
        .rejects.toThrow('Опция с ID 99999 не найдена');
    });

    test('обрабатывает ошибку 401 при удалении опции', async () => {
      const error401 = {
        response: { status: 401 }
      };
      
      apiClient.delete.mockRejectedValue(error401);

      await expect(deleteOption(mockOptionId, mockToken))
        .rejects.toThrow('Ошибка авторизации. Пожалуйста, войдите снова.');
    });

    test('обрабатывает удаление опции без токена', async () => {
      const mockResponse = { data: { message: 'Deleted' } };
      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await deleteOption(mockOptionId, null);
      
      expect(apiClient.delete).toHaveBeenCalledWith(
        `/Question/option/${mockOptionId}`,
        { headers: {} } // Пустые headers без токена
      );
    });
  });

  describe('Интеграционные сценарии', () => {
    test('полный цикл работы с вопросом: создание, обновление, удаление', async () => {
      // 1. Создание вопроса
      const questionData = {
        text: 'Интеграционный тест',
        quizId: mockQuizId,
        type: 0,
        options: [
          { text: 'Ответ 1', isCorrect: true },
          { text: 'Ответ 2', isCorrect: false }
        ]
      };

      const createResponse = { 
        data: { 
          id: mockQuestionId,
          ...questionData 
        } 
      };
      
      apiClient.post.mockResolvedValueOnce(createResponse);
      
      const createdQuestion = await createQuestion(questionData, mockToken);
      expect(createdQuestion.id).toBe(mockQuestionId);

      // 2. Получение вопроса
      apiClient.get.mockResolvedValueOnce({ data: createdQuestion });
      
      const fetchedQuestion = await getQuestionById(mockQuestionId);
      expect(fetchedQuestion.id).toBe(mockQuestionId);

      // 3. Обновление вопроса
      const updateData = {
        text: 'Обновленный интеграционный тест',
        type: 0
      };

      const updateResponse = { 
        data: { 
          id: mockQuestionId,
          ...updateData 
        } 
      };
      
      apiClient.put.mockResolvedValueOnce(updateResponse);
      
      const updatedQuestion = await updateQuestion(mockQuestionId, updateData, mockToken);
      expect(updatedQuestion.text).toBe(updateData.text);

      // 4. Удаление вопроса
      const deleteResponse = { status: 200 };
      apiClient.delete.mockResolvedValueOnce(deleteResponse);
      
      const deleteResult = await deleteQuestion(mockQuestionId, mockToken);
      expect(deleteResult.status).toBe(200);
    });

    test('работа с опциями: создание, обновление, удаление', async () => {
      // 1. Создание опции
      const optionData = {
        text: 'Первая опция',
        isCorrect: true
      };

      const createResponse = { 
        data: { 
          id: mockOptionId,
          ...optionData 
        } 
      };
      
      apiClient.post.mockResolvedValueOnce(createResponse);
      
      const createdOption = await createOption(mockQuestionId, optionData, mockToken);
      expect(createdOption.id).toBe(mockOptionId);

      // 2. Получение опции
      apiClient.get.mockResolvedValueOnce({ data: createdOption });
      
      const fetchedOption = await getOptionById(mockOptionId);
      expect(fetchedOption.id).toBe(mockOptionId);

      // 3. Обновление опции
      const updateData = {
        text: 'Обновленная опция',
        isCorrect: false
      };

      const updateResponse = { 
        data: { 
          id: mockOptionId,
          ...updateData 
        } 
      };
      
      apiClient.put.mockResolvedValueOnce(updateResponse);
      
      const updatedOption = await updateOption(mockOptionId, updateData, mockToken);
      expect(updatedOption.text).toBe(updateData.text);

      // 4. Удаление опции
      const deleteResponse = { data: { message: 'Deleted' } };
      apiClient.delete.mockResolvedValueOnce(deleteResponse);
      
      const deleteResult = await deleteOption(mockOptionId, mockToken);
      expect(deleteResult.message).toBe('Deleted');
    });

    test('получение опций вопроса после создания нескольких опций', async () => {
      // Создаем 3 опции
      const options = [
        { id: 1, text: 'Опция 1', isCorrect: true },
        { id: 2, text: 'Опция 2', isCorrect: false },
        { id: 3, text: 'Опция 3', isCorrect: false }
      ];

      // Симулируем создание опций
      options.forEach((option, index) => {
        apiClient.post
          .mockResolvedValueOnce({ data: option });
      });

      // После создания получаем все опции вопроса
      apiClient.get.mockResolvedValueOnce({ data: options });

      const fetchedOptions = await getQuestionOptions(mockQuestionId);
      
      expect(fetchedOptions).toHaveLength(3);
      expect(fetchedOptions[0].text).toBe('Опция 1');
      expect(fetchedOptions[2].text).toBe('Опция 3');
    });
  });

  describe('Граничные случаи производительности', () => {
    test('обрабатывает опцию с максимально длинным текстом', async () => {
      // Создаем текст длиной 5000 символов
      const longText = 'A'.repeat(5000);
      const optionData = {
        text: longText,
        isCorrect: true
      };

      const mockResponse = { data: { id: mockOptionId } };
      apiClient.put.mockResolvedValue(mockResponse);

      await updateOption(mockOptionId, optionData, mockToken);

      expect(apiClient.put).toHaveBeenCalledWith(
        `/Question/option/${mockOptionId}`,
        { text: longText, isCorrect: true },
        expect.any(Object)
      );
    });
  });
});