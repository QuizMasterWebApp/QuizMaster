import { AuthenticateUser, GetUserIdFromJWT, getUserInfo } from '../usersMethods';
import apiClient from '../.APIclient';
import { jwtDecode } from 'jwt-decode';

// Мокаем только внешние зависимости
jest.mock('../.APIclient');
jest.mock('jwt-decode');

describe('usersMethods API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthenticateUser', () => {
    test('успешный логин возвращает токен', async () => {
      const mockToken = 'test-jwt-token';
      const mockResponse = { data: { token: mockToken } };
      
      apiClient.post.mockResolvedValue(mockResponse);

      const values = { username: 'testuser', password: 'password123' };
      const result = await AuthenticateUser(values, false);

      expect(result).toBe(mockToken);
      expect(apiClient.post).toHaveBeenCalledWith('/User/login', {
        username: 'testuser',
        password: 'password123'
      });
    });

    test('успешная регистрация', async () => {
      const mockToken = 'test-jwt-token';
      const mockResponse = { data: { token: mockToken } };
      
      apiClient.post.mockResolvedValue(mockResponse);

      const values = { username: 'newuser', password: 'password123' };
      const result = await AuthenticateUser(values, true);

      expect(result).toBe(mockToken);
      expect(apiClient.post).toHaveBeenCalledWith('/User/register', {
        username: 'newuser',
        password: 'password123'
      });
    });

    test('бросает ошибку при отсутствии токена в ответе', async () => {
      const mockResponse = { data: {} }; // Нет токена
      apiClient.post.mockResolvedValue(mockResponse);

      const values = { username: 'testuser', password: 'password123' };
      
      await expect(AuthenticateUser(values, false)).rejects.toThrow('Токен отсутствует в ответе сервера');
    });

    test('обрабатывает ошибки сервера', async () => {
      const errorResponse = {
        response: { data: 'Invalid credentials' }
      };
      apiClient.post.mockRejectedValue(errorResponse);

      const values = { username: 'wrong', password: 'wrong' };
      
      await expect(AuthenticateUser(values, false)).rejects.toEqual(errorResponse);
    });
  });

  describe('GetUserIdFromJWT', () => {
    test('извлекает userId из валидного токена', () => {
      const mockUserId = 123;
      const mockDecodedToken = {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': mockUserId.toString()
      };
      
      jwtDecode.mockReturnValue(mockDecodedToken);

      const token = 'test.jwt.token';
      const result = GetUserIdFromJWT(token);

      expect(result).toBe(123); // Преобразуется в число
      expect(jwtDecode).toHaveBeenCalledWith(token);
    });

    test('возвращает null при ошибке декодирования', () => {
      jwtDecode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = GetUserIdFromJWT('invalid-token');
      
      expect(result).toBeNull();
    });

    test('возвращает null если userId не найден', () => {
      jwtDecode.mockReturnValue({}); // Пустой объект
      
      const result = GetUserIdFromJWT('valid.but.no.userid');
      
      expect(result).toBeNull();
    });
  });

  describe('getUserInfo', () => {
    test('получает информацию о пользователе', async () => {
      const mockUserData = {
        id: 123,
        name: 'Test User',
        username: 'testuser'
      };
      
      apiClient.get.mockResolvedValue({ data: mockUserData });

      const result = await getUserInfo(123);

      expect(result).toEqual(mockUserData);
      expect(apiClient.get).toHaveBeenCalledWith('/User/123');
    });

    test('бросает ошибку при неудачном запросе', async () => {
      const error = new Error('User not found');
      apiClient.get.mockRejectedValue(error);

      await expect(getUserInfo(999)).rejects.toThrow('User not found');
    });
  });
});