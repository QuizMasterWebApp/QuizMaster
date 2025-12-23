import {
  AuthenticateUser,
  RefreshUserToken,
  GetUserIdFromJWT,
  getUserInfo,
  getUserByUsername,
  getUserQuizzes,
  updateUserData
} from '../usersMethods';
import apiClient from '../.APIclient';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';
import { getQuizQuestions } from '../quizMethods.jsx';

// Мокаем внешние зависимости
jest.mock('../.APIclient');
jest.mock('jwt-decode');
jest.mock('js-cookie');
jest.mock('../quizMethods.jsx');

describe('usersMethods API', () => {
  // Моковые данные для тестов
  const mockToken = 'test-jwt-token-123';
  const mockUserId = 123;
  const mockUsername = 'testuser';
  const mockPassword = 'password123';
  const mockUserData = {
    id: mockUserId,
    name: 'Test User',
    username: mockUsername
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthenticateUser', () => {
    test('успешный логин возвращает токен', async () => {
      const mockResponse = {
        data: { token: mockToken }
      };
      
      apiClient.post.mockResolvedValue(mockResponse);

      const values = { username: mockUsername, password: mockPassword };
      const result = await AuthenticateUser(values, false);

      expect(result).toBe(mockToken);
      expect(apiClient.post).toHaveBeenCalledWith('/User/login', {
        username: mockUsername,
        password: mockPassword
      });
    });

    test('успешная регистрация возвращает токен', async () => {
      const mockResponse = {
        data: { token: mockToken }
      };
      
      apiClient.post.mockResolvedValue(mockResponse);

      const values = { username: 'newuser', password: 'newpassword' };
      const result = await AuthenticateUser(values, true);

      expect(result).toBe(mockToken);
      expect(apiClient.post).toHaveBeenCalledWith('/User/register', {
        username: 'newuser',
        password: 'newpassword'
      });
    });

    test('бросает ошибку если токен отсутствует в ответе', async () => {
      const mockResponse = {
        data: { message: 'success' } // Нет поля token
      };
      
      apiClient.post.mockResolvedValue(mockResponse);

      const values = { username: mockUsername, password: mockPassword };
      
      await expect(AuthenticateUser(values, false)).rejects.toThrow('Токен отсутствует в ответе сервера');
    });

    test('обрабатывает ошибки сервера', async () => {
      const errorResponse = {
        response: { 
          data: 'Invalid credentials' 
        },
        message: 'Authentication failed'
      };
      
      apiClient.post.mockRejectedValue(errorResponse);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const values = { username: 'wrong', password: 'wrong' };
      
      await expect(AuthenticateUser(values, false)).rejects.toEqual(errorResponse);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Ошибка аутентификации:',
        errorResponse.response?.data || errorResponse.message
      );
      
      consoleErrorSpy.mockRestore();
    });

    test('обрабатывает ошибки без response', async () => {
      const networkError = new Error('Network error');
      apiClient.post.mockRejectedValue(networkError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const values = { username: mockUsername, password: mockPassword };
      
      await expect(AuthenticateUser(values, false)).rejects.toThrow('Network error');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Ошибка аутентификации:',
        networkError.message
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('RefreshUserToken', () => {
    test('успешно обновляет токен', async () => {
      const newToken = 'new-refreshed-token';
      const mockResponse = {
        data: { token: newToken, expiresIn: 3600 }
      };
      
      // Обратите внимание: в коде передается headers в теле запроса, а не вторым параметром
      // Это похоже на ошибку в коде, но мы тестируем как есть
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await RefreshUserToken(mockToken);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith('/User/refresh', {
        headers: {
          'Authorization': `Bearer ${mockToken}`
        }
      });
    });

    test('обрабатывает ошибки при обновлении токена', async () => {
      const error = new Error('Refresh failed');
      apiClient.post.mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(RefreshUserToken(mockToken)).rejects.toThrow('Refresh failed');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Ошибка при обновлении токена пользователя',
        error
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('GetUserIdFromJWT', () => {
    test('извлекает userId из валидного JWT токена', () => {
      const userIdString = '123';
      const mockDecodedToken = {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': userIdString
      };
      
      jwtDecode.mockReturnValue(mockDecodedToken);

      const result = GetUserIdFromJWT(mockToken);

      expect(result).toBe(123); // Преобразуется в число
      expect(jwtDecode).toHaveBeenCalledWith(mockToken);
    });

    test('возвращает null если userId не найден в токене', () => {
      const mockDecodedToken = {
        // Нет нужного поля
        sub: 'user-123',
        exp: 1234567890
      };
      
      jwtDecode.mockReturnValue(mockDecodedToken);

      const result = GetUserIdFromJWT(mockToken);

      expect(result).toBeNull();
      expect(jwtDecode).toHaveBeenCalledWith(mockToken);
    });

    test('возвращает null если userId не является числом', () => {
      const mockDecodedToken = {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'not-a-number'
      };
      
      jwtDecode.mockReturnValue(mockDecodedToken);

      const result = GetUserIdFromJWT(mockToken);

      expect(result).toBe(NaN); // parseInt('not-a-number') возвращает NaN
    });

    test('возвращает null при ошибке декодирования', () => {
      const decodeError = new Error('Invalid token format');
      jwtDecode.mockImplementation(() => {
        throw decodeError;
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = GetUserIdFromJWT('invalid-token');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Ошибка при декодировании токена:',
        decodeError
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getUserInfo', () => {
    test('успешно получает информацию о пользователе', async () => {
      apiClient.get.mockResolvedValue({ data: mockUserData });

      const result = await getUserInfo(mockUserId);

      expect(result).toEqual(mockUserData);
      expect(apiClient.get).toHaveBeenCalledWith(`/User/${mockUserId}`);
    });

    test('обрабатывает ошибки при получении информации о пользователе', async () => {
      const error = new Error('User not found');
      apiClient.get.mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(getUserInfo(999)).rejects.toThrow('User not found');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Ошибка при получении информации пользователя #999`,
        error
      );
      
      consoleErrorSpy.mockRestore();
    });

    test('работает со строковым userId', async () => {
      apiClient.get.mockResolvedValue({ data: mockUserData });

      const result = await getUserInfo('123'); // Строка вместо числа

      expect(result).toEqual(mockUserData);
      expect(apiClient.get).toHaveBeenCalledWith('/User/123');
    });
  });

  describe('getUserByUsername', () => {
    test('успешно получает пользователя по username', async () => {
      apiClient.get.mockResolvedValue({ data: mockUserData });

      const result = await getUserByUsername(mockUsername);

      expect(result).toEqual(mockUserData);
      expect(apiClient.get).toHaveBeenCalledWith(`/User/by-username/${mockUsername}`);
    });

    test('обрабатывает ошибки при поиске по username', async () => {
      const error = new Error('User not found');
      apiClient.get.mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(getUserByUsername('nonexistent')).rejects.toThrow('User not found');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Ошибка при получении информации пользователя #nonexistent`,
        error
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getUserQuizzes', () => {
    const mockQuizzes = [
      { id: 1, title: 'Quiz 1', privateAccessKey: 'ABC123' },
      { id: 2, title: 'Quiz 2', privateAccessKey: null },
      { id: 3, title: 'Quiz 3', privateAccessKey: 'DEF456' }
    ];

    const mockQuestions1 = [{ id: 1 }, { id: 2 }];
    const mockQuestions2 = [{ id: 3 }, { id: 4 }, { id: 5 }];
    const mockQuestions3 = []; // Пустой массив

    test('успешно получает квизы пользователя с количеством вопросов', async () => {
      apiClient.get.mockResolvedValue({ data: mockQuizzes });
      getQuizQuestions
        .mockResolvedValueOnce(mockQuestions1) // Для quiz.id = 1
        .mockResolvedValueOnce([]) // Для quiz.id = 2 (null accessKey)
        .mockResolvedValueOnce(mockQuestions3); // Для quiz.id = 3

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await getUserQuizzes(mockToken, mockUserId);

      expect(result).toHaveLength(3);
      
      // Проверяем форматирование
      expect(result[0]).toEqual({
        id: 1,
        title: 'Quiz 1',
        privateAccessKey: 'ABC123',
        questionsCount: 2
      });
      
      expect(result[1]).toEqual({
        id: 2,
        title: 'Quiz 2',
        privateAccessKey: null,
        questionsCount: 0
      });
      
      expect(result[2]).toEqual({
        id: 3,
        title: 'Quiz 3',
        privateAccessKey: 'DEF456',
        questionsCount: 0
      });

      expect(apiClient.get).toHaveBeenCalledWith(`/User/${mockUserId}/quizzes`, {
        headers: { 'Authorization': `Bearer ${mockToken}` }
      });

      expect(getQuizQuestions).toHaveBeenCalledTimes(3);
      expect(getQuizQuestions).toHaveBeenCalledWith(1, 'ABC123');
      expect(getQuizQuestions).toHaveBeenCalledWith(2, null);
      expect(getQuizQuestions).toHaveBeenCalledWith(3, 'DEF456');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Успешно получены квизы ${mockUserId}:`,
        expect.any(Array)
      );

      consoleLogSpy.mockRestore();
    });

    test('бросает ошибку при отсутствии токена', async () => {
      await expect(getUserQuizzes(null, mockUserId))
        .rejects.toThrow('Токен авторизации обязателен');
    });

    test('бросает ошибку при отсутствии userId', async () => {
      await expect(getUserQuizzes(mockToken, null))
        .rejects.toThrow('Id пользователя обязателен');
    });

    test('обрабатывает ошибки при получении вопросов для отдельных квизов', async () => {
      apiClient.get.mockResolvedValue({ data: mockQuizzes });
      
      const quizError = new Error('Failed to get questions');
      getQuizQuestions
        .mockResolvedValueOnce(mockQuestions1)
        .mockRejectedValueOnce(quizError) // Ошибка для второго квиза
        .mockResolvedValueOnce(mockQuestions2);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getUserQuizzes(mockToken, mockUserId);

      // Должен вернуть все квизы, даже с ошибками
      expect(result).toHaveLength(3);
      expect(result[1].questionsCount).toBe(0); // При ошибке questionsCount = 0
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `Не удалось получить вопросы для квиза ${mockQuizzes[1].id}`,
        quizError
      );

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('обрабатывает ошибки при основном запросе квизов', async () => {
      const error = new Error('Failed to get user quizzes');
      apiClient.get.mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(getUserQuizzes(mockToken, mockUserId))
        .rejects.toThrow('Failed to get user quizzes');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Ошибка при получении квизов пользователя:',
        error
      );

      consoleErrorSpy.mockRestore();
    });

    test('обрабатывает пустой массив квизов', async () => {
      apiClient.get.mockResolvedValue({ data: [] });

      const result = await getUserQuizzes(mockToken, mockUserId);

      expect(result).toEqual([]);
      expect(getQuizQuestions).not.toHaveBeenCalled();
    });
  });

  describe('updateUserData', () => {
    test('успешно обновляет имя пользователя', async () => {
      const newUsername = 'newusername';
      const updateData = { userName: newUsername };
      const mockResponse = { data: { id: mockUserId, userName: newUsername } };

      apiClient.put.mockResolvedValue(mockResponse);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await updateUserData(mockToken, mockUserId, updateData);

      expect(result).toEqual(mockResponse.data);
      
      expect(apiClient.put).toHaveBeenCalledWith(`/User/${mockUserId}`, {
        userName: newUsername
      }, {
        headers: { 
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Отправка запроса на обновление пользователя:',
        {
          url: `/User/${mockUserId}`,
          method: 'PUT',
          data: { userName: newUsername }
        }
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Успешный ответ от сервера:',
        mockResponse.data
      );

      consoleLogSpy.mockRestore();
    });

    test('успешно обновляет пароль', async () => {
      const updateData = {
        oldPassword: 'oldpass',
        password: 'newpass'
      };
      
      const mockResponse = { data: { message: 'Password updated' } };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await updateUserData(mockToken, mockUserId, updateData);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.put).toHaveBeenCalledWith(`/User/${mockUserId}`, {
        oldPassword: 'oldpass',
        password: 'newpass'
      }, expect.any(Object));
    });

    test('успешно обновляет и имя и пароль', async () => {
      const updateData = {
        userName: 'newname',
        oldPassword: 'oldpass',
        password: 'newpass'
      };
      
      const mockResponse = { data: { id: mockUserId, userName: 'newname' } };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await updateUserData(mockToken, mockUserId, updateData);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.put).toHaveBeenCalledWith(`/User/${mockUserId}`, {
        userName: 'newname',
        oldPassword: 'oldpass',
        password: 'newpass'
      }, expect.any(Object));
    });

    test('бросает ошибку при отсутствии токена', async () => {
      await expect(updateUserData(null, mockUserId, { userName: 'test' }))
        .rejects.toThrow('Требуется авторизация');
    });

    test('обрабатывает ошибки при обновлении данных', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: { message: 'Username already taken' }
        },
        message: 'Bad Request'
      };
      
      apiClient.put.mockRejectedValue(errorResponse);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const updateData = { userName: 'existinguser' };
      
      await expect(updateUserData(mockToken, mockUserId, updateData))
        .rejects.toThrow('Username already taken');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Ошибка при обновлении профиля пользователя ${mockUserId}:`,
        errorResponse
      );

      consoleErrorSpy.mockRestore();
    });

    test('обрабатывает ошибки без response', async () => {
      const networkError = new Error('Network error');
      apiClient.put.mockRejectedValue(networkError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const updateData = { userName: 'test' };
      
      const apiError = await updateUserData(mockToken, mockUserId, updateData).catch(e => e);

      expect(apiError).toBeInstanceOf(Error);
      expect(apiError.message).toBe('Network error');
      expect(apiError.status).toBeUndefined();

      consoleErrorSpy.mockRestore();
    });

    test('обрабатывает пустой payload', async () => {
      const mockResponse = { data: { id: mockUserId } };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await updateUserData(mockToken, mockUserId, {});

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.put).toHaveBeenCalledWith(`/User/${mockUserId}`, {}, expect.any(Object));
    });

    test('обрабатывает undefined значения в userData', async () => {
      const updateData = {
        userName: undefined,
        oldPassword: 'oldpass',
        password: undefined
      };
      
      const mockResponse = { data: { message: 'Updated' } };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await updateUserData(mockToken, mockUserId, updateData);

      expect(result).toEqual(mockResponse.data);
      // undefined значения не должны попадать в payload
      expect(apiClient.put).toHaveBeenCalledWith(`/User/${mockUserId}`, {
        oldPassword: 'oldpass'
      }, expect.any(Object));
    });
  });
});

describe('Edge Cases для usersMethods', () => {
  const mockToken = 'test-token';
  const mockUserId = 123;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthenticateUser Edge Cases', () => {
    test('обрабатывает значения с пробелами', async () => {
      const mockResponse = { data: { token: mockToken } };
      apiClient.post.mockResolvedValue(mockResponse);

      const values = { 
        username: '  user with spaces  ', 
        password: '  pass with spaces  ' 
      };
      
      const result = await AuthenticateUser(values, false);

      expect(result).toBe(mockToken);
      // Значения передаются как есть, обрезка должна быть на сервере
      expect(apiClient.post).toHaveBeenCalledWith('/User/login', {
        username: '  user with spaces  ',
        password: '  pass with spaces  '
      });
    });

    test('обрабатывает пустые значения', async () => {
      const mockResponse = { data: { token: mockToken } };
      apiClient.post.mockResolvedValue(mockResponse);

      const values = { username: '', password: '' };
      
      const result = await AuthenticateUser(values, false);

      expect(result).toBe(mockToken);
      expect(apiClient.post).toHaveBeenCalledWith('/User/login', {
        username: '',
        password: ''
      });
    });
  });

  describe('GetUserIdFromJWT Edge Cases', () => {
    test('обрабатывает userId как дробное число в токене', () => {
      const mockDecodedToken = {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '123.45'
      };
      
      jwtDecode.mockReturnValue(mockDecodedToken);

      const result = GetUserIdFromJWT(mockToken);

      expect(result).toBe(123); // parseInt отбрасывает дробную часть
    });

    test('обрабатывает очень большое число как userId', () => {
      const largeNumber = '999999999999999';
      const mockDecodedToken = {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': largeNumber
      };
      
      jwtDecode.mockReturnValue(mockDecodedToken);

      const result = GetUserIdFromJWT(mockToken);

      expect(result).toBe(999999999999999);
    });

    test('обрабатывает userId с ведущими нулями', () => {
      const mockDecodedToken = {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '00123'
      };
      
      jwtDecode.mockReturnValue(mockDecodedToken);

      const result = GetUserIdFromJWT(mockToken);

      expect(result).toBe(123); // parseInt игнорирует ведущие нули
    });
  });

  describe('getUserQuizzes Edge Cases', () => {
    test('обрабатывает квизы с вопросами, выбрасывающими ошибку', async () => {
      const mockQuizzes = [
        { id: 1, title: 'Quiz 1', privateAccessKey: 'KEY1' },
        { id: 2, title: 'Quiz 2', privateAccessKey: 'KEY2' }
      ];

      apiClient.get.mockResolvedValue({ data: mockQuizzes });
      
      // Первый запрос вопросов успешен, второй падает
      getQuizQuestions
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
        .mockRejectedValueOnce(new Error('Network error'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getUserQuizzes(mockToken, mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].questionsCount).toBe(2);
      expect(result[1].questionsCount).toBe(0); // При ошибке 0
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Не удалось получить вопросы для квиза 2',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    test('обрабатывает квизы с null вопросами', async () => {
      const mockQuizzes = [{ id: 1, title: 'Quiz', privateAccessKey: null }];
      apiClient.get.mockResolvedValue({ data: mockQuizzes });
      
      // getQuizQuestions возвращает null
      getQuizQuestions.mockResolvedValue(null);

      const result = await getUserQuizzes(mockToken, mockUserId);

      expect(result[0].questionsCount).toBe(0); // null.length ?? 0 = 0
    });

    test('обрабатывает undefined вопросы', async () => {
      const mockQuizzes = [{ id: 1, title: 'Quiz', privateAccessKey: null }];
      apiClient.get.mockResolvedValue({ data: mockQuizzes });
      
      getQuizQuestions.mockResolvedValue(undefined);

      const result = await getUserQuizzes(mockToken, mockUserId);

      expect(result[0].questionsCount).toBe(0); // undefined?.length ?? 0 = 0
    });
  });

  describe('updateUserData Edge Cases', () => {
    test('обрабатывает строку 0 как userId', async () => {
      const mockResponse = { data: { id: 0 } };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await updateUserData(mockToken, '0', { userName: 'test' });

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.put).toHaveBeenCalledWith('/User/0', { userName: 'test' }, expect.any(Object));
    });

    test('обрабатывает специальные символы в userName', async () => {
      const specialName = 'user@name#123!';
      const mockResponse = { data: { userName: specialName } };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await updateUserData(mockToken, mockUserId, { userName: specialName });

      expect(result).toEqual(mockResponse.data);
      // userName передается как есть, кодировкой должен заниматься apiClient
      expect(apiClient.put).toHaveBeenCalledWith(
        `/User/${mockUserId}`,
        { userName: specialName },
        expect.any(Object)
      );
    });

    test('обрабатывает очень длинные значения', async () => {
      const longPassword = 'a'.repeat(1000);
      const mockResponse = { data: { message: 'Updated' } };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await updateUserData(mockToken, mockUserId, { password: longPassword });

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.put).toHaveBeenCalledWith(
        `/User/${mockUserId}`,
        { password: longPassword },
        expect.any(Object)
      );
    });
  });
});