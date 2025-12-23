import { renderHook, act, waitFor } from '@testing-library/react';
import * as api from '../../API methods/questionMethods';
import { useQuestions } from '../useQuestions';

// Мокаем API методы
jest.mock('../../API methods/questionMethods');

// Основные тесты для useQuestions хука
test('useQuestions возвращает все методы и состояния', () => {
  const { result } = renderHook(() => useQuestions());

  expect(result.current).toMatchObject({
    getQuestionById: expect.any(Function),
    createQuestion: expect.any(Function),
    updateQuestion: expect.any(Function),
    deleteQuestion: expect.any(Function),
    getOptionById: expect.any(Function),
    getQuestionOptions: expect.any(Function),
    createOption: expect.any(Function),
    updateOption: expect.any(Function),
    deleteOption: expect.any(Function),
    pluralize: expect.any(Function),
    loading: false,
    error: null
  });
});

test('getQuestionById успешно получает вопрос по ID', async () => {
  const mockQuestionData = {
    id: 123,
    text: 'Что такое React?',
    type: 0,
    options: [
      { id: 1, text: 'Библиотека JavaScript', isCorrect: true },
      { id: 2, text: 'Фреймворк', isCorrect: false }
    ]
  };
  
  api.getQuestionById.mockResolvedValue(mockQuestionData);

  const { result } = renderHook(() => useQuestions());

  let question;
  await act(async () => {
    question = await result.current.getQuestionById(123);
  });

  expect(question).toEqual(mockQuestionData);
  expect(api.getQuestionById).toHaveBeenCalledWith(123);
  
  // Проверяем состояние загрузки
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });
});

test('getQuestionById обрабатывает ошибку при получении вопроса', async () => {
  const error = new Error('Question not found');
  api.getQuestionById.mockRejectedValue(error);

  const { result } = renderHook(() => useQuestions());

  let question;
  await act(async () => {
    question = await result.current.getQuestionById(999);
  });

  expect(question).toBeUndefined();
  expect(result.current.error).toBe(error);
  expect(result.current.loading).toBe(false);
});

test('createQuestion успешно создает вопрос', async () => {
  const newQuestionData = {
    text: 'Новый вопрос',
    quizId: 1,
    type: 0,
    options: [
      { text: 'Вариант 1', isCorrect: true },
      { text: 'Вариант 2', isCorrect: false }
    ]
  };
  
  const createdQuestion = { ...newQuestionData, id: 123 };
  api.createQuestion.mockResolvedValue(createdQuestion);

  const { result } = renderHook(() => useQuestions());

  let question;
  await act(async () => {
    question = await result.current.createQuestion(newQuestionData, 'test-token');
  });

  expect(question).toEqual(createdQuestion);
  expect(api.createQuestion).toHaveBeenCalledWith(newQuestionData, 'test-token');
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBe(null);
});

test('updateQuestion успешно обновляет вопрос', async () => {
  const updateData = {
    text: 'Обновленный вопрос',
    type: 1
  };
  
  const updatedQuestion = { id: 123, ...updateData };
  api.updateQuestion.mockResolvedValue(updatedQuestion);

  const { result } = renderHook(() => useQuestions());

  let question;
  await act(async () => {
    question = await result.current.updateQuestion(123, updateData, 'test-token');
  });

  expect(question).toEqual(updatedQuestion);
  expect(api.updateQuestion).toHaveBeenCalledWith(123, updateData, 'test-token');
  expect(result.current.loading).toBe(false);
});

test('deleteQuestion успешно удаляет вопрос', async () => {
  const deleteResponse = { success: true, message: 'Question deleted' };
  api.deleteQuestion.mockResolvedValue(deleteResponse);

  const { result } = renderHook(() => useQuestions());

  let response;
  await act(async () => {
    response = await result.current.deleteQuestion(123, 'test-token');
  });

  expect(response).toEqual(deleteResponse);
  expect(api.deleteQuestion).toHaveBeenCalledWith(123, 'test-token');
  expect(result.current.loading).toBe(false);
});

test('getOptionById успешно получает опцию по ID', async () => {
  const mockOptionData = {
    id: 456,
    text: 'Новый вариант ответа',
    isCorrect: true
  };
  
  api.getOptionById.mockResolvedValue(mockOptionData);

  const { result } = renderHook(() => useQuestions());

  let option;
  await act(async () => {
    option = await result.current.getOptionById(456);
  });

  expect(option).toEqual(mockOptionData);
  expect(api.getOptionById).toHaveBeenCalledWith(456);
  expect(result.current.loading).toBe(false);
});

test('getQuestionOptions успешно получает опции вопроса', async () => {
  const mockQuestionOptions = [
    { id: 1, text: 'Вариант 1', isCorrect: true },
    { id: 2, text: 'Вариант 2', isCorrect: false }
  ];
  
  api.getQuestionOptions.mockResolvedValue(mockQuestionOptions);

  const { result } = renderHook(() => useQuestions());

  let options;
  await act(async () => {
    options = await result.current.getQuestionOptions(123);
  });

  expect(options).toEqual(mockQuestionOptions);
  expect(api.getQuestionOptions).toHaveBeenCalledWith(123);
  expect(result.current.loading).toBe(false);
});

test('createOption успешно создает опцию', async () => {
  const newOptionData = {
    text: 'Новая опция',
    isCorrect: false
  };
  
  const createdOption = { ...newOptionData, id: 456 };
  api.createOption.mockResolvedValue(createdOption);

  const { result } = renderHook(() => useQuestions());

  let option;
  await act(async () => {
    option = await result.current.createOption(123, newOptionData, 'test-token');
  });

  expect(option).toEqual(createdOption);
  expect(api.createOption).toHaveBeenCalledWith(123, newOptionData, 'test-token');
  expect(result.current.loading).toBe(false);
});

test('updateOption успешно обновляет опцию', async () => {
  const updateOptionData = {
    text: 'Обновленная опция',
    isCorrect: true
  };
  
  const updatedOption = { id: 456, ...updateOptionData };
  api.updateOption.mockResolvedValue(updatedOption);

  const { result } = renderHook(() => useQuestions());

  let option;
  await act(async () => {
    option = await result.current.updateOption(456, updateOptionData, 'test-token');
  });

  expect(option).toEqual(updatedOption);
  expect(api.updateOption).toHaveBeenCalledWith(456, updateOptionData, 'test-token');
  expect(result.current.loading).toBe(false);
});

test('deleteOption успешно удаляет опцию', async () => {
  const deleteResponse = { success: true, message: 'Option deleted' };
  api.deleteOption.mockResolvedValue(deleteResponse);

  const { result } = renderHook(() => useQuestions());

  let response;
  await act(async () => {
    response = await result.current.deleteOption(456, 'test-token');
  });

  expect(response).toEqual(deleteResponse);
  expect(api.deleteOption).toHaveBeenCalledWith(456, 'test-token');
  expect(result.current.loading).toBe(false);
});

test('pluralize корректно склоняет слова для чисел', () => {
  const { result } = renderHook(() => useQuestions());

  expect(result.current.pluralize(1)).toBe('');
  expect(result.current.pluralize(2)).toBe('а');
  expect(result.current.pluralize(5)).toBe('ов');
  expect(result.current.pluralize(11)).toBe('ов');
  expect(result.current.pluralize(21)).toBe('');
  expect(result.current.pluralize(22)).toBe('а');
  expect(result.current.pluralize(25)).toBe('ов');
});

test('pluralize обрабатывает null и undefined', () => {
  const { result } = renderHook(() => useQuestions());

  expect(result.current.pluralize(null)).toBe('ов');
  expect(result.current.pluralize(undefined)).toBe('ов');
});

test('pluralize работает с граничными значениями', () => {
  const { result } = renderHook(() => useQuestions());

  expect(result.current.pluralize(0)).toBe('ов');
  expect(result.current.pluralize(101)).toBe('');
  expect(result.current.pluralize(102)).toBe('а');
  expect(result.current.pluralize(111)).toBe('ов');
  expect(result.current.pluralize(112)).toBe('ов');
  expect(result.current.pluralize(121)).toBe('');
});

test('устанавливает loading в true во время запроса', async () => {
  const mockQuestionData = {
    id: 123,
    text: 'Что такое React?'
  };
  
  // Делаем задержку, чтобы увидеть состояние loading
  api.getQuestionById.mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(mockQuestionData), 100))
  );

  const { result } = renderHook(() => useQuestions());

  let requestPromise;
  act(() => {
    requestPromise = result.current.getQuestionById(123);
  });

  // Сразу после вызова loading должен быть true
  expect(result.current.loading).toBe(true);

  await act(async () => {
    await requestPromise;
  });

  // После завершения loading должен быть false
  expect(result.current.loading).toBe(false);
});

test('сбрасывает ошибку перед новым запросом', async () => {
  const error = new Error('Previous error');
  api.getQuestionById.mockRejectedValueOnce(error);
  
  const mockQuestionData = {
    id: 123,
    text: 'Что такое React?'
  };
  
  const { result } = renderHook(() => useQuestions());

  // Первый запрос с ошибкой
  await act(async () => {
    await result.current.getQuestionById(999);
  });

  expect(result.current.error).toBe(error);

  // Сбрасываем мок для успешного запроса
  api.getQuestionById.mockResolvedValue(mockQuestionData);

  // Второй запрос
  await act(async () => {
    await result.current.getQuestionById(123);
  });

  // Ошибка должна быть сброшена
  expect(result.current.error).toBe(null);
  expect(result.current.loading).toBe(false);
});

test('работа с полным циклом вопроса', async () => {
  const { result } = renderHook(() => useQuestions());

  // 1. Создаем вопрос
  const newQuestion = {
    text: 'Интеграционный тест',
    quizId: 1,
    type: 0,
    options: [
      { text: 'Правильный ответ', isCorrect: true },
      { text: 'Неправильный ответ', isCorrect: false }
    ]
  };

  const createdQuestion = { ...newQuestion, id: 123 };
  api.createQuestion.mockResolvedValue(createdQuestion);

  let created;
  await act(async () => {
    created = await result.current.createQuestion(newQuestion, 'test-token');
  });

  expect(created).toEqual(createdQuestion);
  expect(result.current.loading).toBe(false);

  // 2. Получаем вопрос
  api.getQuestionById.mockResolvedValue(createdQuestion);

  let retrieved;
  await act(async () => {
    retrieved = await result.current.getQuestionById(123);
  });

  expect(retrieved).toEqual(createdQuestion);

  // 3. Создаем дополнительную опцию
  const newOption = { text: 'Еще один вариант', isCorrect: false };
  const createdOption = { ...newOption, id: 456 };
  api.createOption.mockResolvedValue(createdOption);

  let option;
  await act(async () => {
    option = await result.current.createOption(123, newOption, 'test-token');
  });

  expect(option).toEqual(createdOption);

  // 4. Обновляем опцию
  const updatedOption = { ...createdOption, isCorrect: true };
  api.updateOption.mockResolvedValue(updatedOption);

  let updatedOpt;
  await act(async () => {
    updatedOpt = await result.current.updateOption(456, { isCorrect: true }, 'test-token');
  });

  expect(updatedOpt).toEqual(updatedOption);

  // 5. Получаем все опции вопроса
  const allOptions = [
    ...createdQuestion.options,
    updatedOption
  ];
  api.getQuestionOptions.mockResolvedValue(allOptions);

  let options;
  await act(async () => {
    options = await result.current.getQuestionOptions(123);
  });

  expect(options).toEqual(allOptions);

  // 6. Удаляем опцию
  const deleteResponse = { success: true };
  api.deleteOption.mockResolvedValue(deleteResponse);

  let deleteResult;
  await act(async () => {
    deleteResult = await result.current.deleteOption(456, 'test-token');
  });

  expect(deleteResult).toEqual(deleteResponse);

  // 7. Обновляем вопрос
  const updateData = { text: 'Обновленный интеграционный тест' };
  const updatedQuestion = { ...createdQuestion, ...updateData };
  api.updateQuestion.mockResolvedValue(updatedQuestion);

  let updatedQ;
  await act(async () => {
    updatedQ = await result.current.updateQuestion(123, updateData, 'test-token');
  });

  expect(updatedQ).toEqual(updatedQuestion);

  // 8. Удаляем вопрос
  api.deleteQuestion.mockResolvedValue({ success: true });

  let finalDelete;
  await act(async () => {
    finalDelete = await result.current.deleteQuestion(123, 'test-token');
  });

  expect(finalDelete).toEqual({ success: true });
});

test('обрабатывает сетевые ошибки', async () => {
  const networkError = new TypeError('Network Error');
  api.getQuestionById.mockRejectedValue(networkError);

  const { result } = renderHook(() => useQuestions());

  await act(async () => {
    await result.current.getQuestionById(123);
  });

  expect(result.current.error).toBe(networkError);
  expect(result.current.loading).toBe(false);
});

test('обрабатывает ошибки валидации от сервера', async () => {
  const validationError = {
    response: {
      status: 400,
      data: { message: 'Invalid question data' }
    }
  };
  api.createQuestion.mockRejectedValue(validationError);

  const { result } = renderHook(() => useQuestions());

  await act(async () => {
    await result.current.createQuestion({}, 'test-token');
  });

  expect(result.current.error).toBe(validationError);
});

test('работает без токена для методов, которые его требуют', async () => {
  const { result } = renderHook(() => useQuestions());

  // Методы, требующие токен, должны вызываться с null/undefined токеном
  api.deleteQuestion.mockResolvedValue({ success: true });

  await act(async () => {
    await result.current.deleteQuestion(123, null);
  });

  expect(api.deleteQuestion).toHaveBeenCalledWith(123, null);
});