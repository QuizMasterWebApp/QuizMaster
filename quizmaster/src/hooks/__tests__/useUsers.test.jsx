// tests/hooks/useUsers.test.jsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUsers } from '../../hooks/useUsers';
import * as api from '../../API methods/usersMethods';
import Cookies from 'js-cookie';

// Мокируем модули
jest.mock('../../API methods/usersMethods');
jest.mock('js-cookie');

describe('useUsers', () => {
  beforeEach(() => {
    // Сбрасываем все моки перед каждым тестом
    jest.clearAllMocks();
    // Сбрасываем Cookies mock
    Cookies.get.mockReset();
    Cookies.set.mockReset();
    Cookies.remove.mockReset();
    // Очищаем localStorage
    localStorage.clear();
  });

  describe('userPicture', () => {
    it('should generate correct avatar URL', () => {
      const { result } = renderHook(() => useUsers());
      
      const userId = 123;
      const expectedUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
      
      expect(result.current.userPicture(userId)).toBe(expectedUrl);
    });
  });

  describe('loginUser', () => {
    it('should login successfully and set token', async () => {
      const mockToken = 'mock-jwt-token';
      const loginData = { username: 'testuser', password: 'password123' };
      
      api.AuthenticateUser.mockResolvedValue(mockToken);
      
      const { result } = renderHook(() => useUsers());
      
      await act(async () => {
        await result.current.loginUser(loginData);
      });
      
      expect(api.AuthenticateUser).toHaveBeenCalledWith(loginData, false);
      expect(Cookies.set).toHaveBeenCalledWith('token', mockToken, {
        expires: 1,
        secure: true,
        sameSite: 'Strict'
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle login error', async () => {
      const loginData = { username: 'testuser', password: 'wrongpassword' };
      const mockError = new Error('Invalid credentials');
      
      api.AuthenticateUser.mockRejectedValue(mockError);
      
      const { result } = renderHook(() => useUsers());
      
      await expect(
        act(async () => {
          await result.current.loginUser(loginData);
        })
      ).rejects.toThrow('Invalid credentials');
      
      expect(api.AuthenticateUser).toHaveBeenCalledWith(loginData, false);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('registerUser', () => {
    it('should register successfully and set token', async () => {
      const mockToken = 'mock-jwt-token';
      const registerData = { username: 'newuser', password: 'password123' };
      
      api.AuthenticateUser.mockResolvedValue(mockToken);
      
      const { result } = renderHook(() => useUsers());
      
      await act(async () => {
        await result.current.registerUser(registerData);
      });
      
      expect(api.AuthenticateUser).toHaveBeenCalledWith(registerData, true);
      expect(Cookies.set).toHaveBeenCalledWith('token', mockToken, {
        expires: 1,
        secure: true,
        sameSite: 'Strict'
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle registration error', async () => {
      const registerData = { username: 'existinguser', password: 'password123' };
      const mockError = new Error('User already exists');
      
      api.AuthenticateUser.mockRejectedValue(mockError);
      
      const { result } = renderHook(() => useUsers());
      
      await expect(
        act(async () => {
          await result.current.registerUser(registerData);
        })
      ).rejects.toThrow('User already exists');
      
      expect(api.AuthenticateUser).toHaveBeenCalledWith(registerData, true);
      expect(result.current.loading).toBe(false);
    });
  });
  
  describe('checkToken', () => {
    it('should return null when no token in cookies', async () => {
      Cookies.get.mockReturnValue(null);
      
      const { result } = renderHook(() => useUsers());
      
      const token = await act(async () => {
        return await result.current.checkToken();
      });
      
      expect(token).toBeNull();
      expect(Cookies.get).toHaveBeenCalledWith('token');
    });

    it('should return valid token when not expired', async () => {
      const validToken = 'valid.jwt.token';
      
      Cookies.get.mockReturnValue(validToken);
      
      const { result } = renderHook(() => useUsers());
      
      // Мокаем isTokenExpired чтобы возвращать false
      // Для этого нам нужно протестировать реальную логику
      const token = 'header.' + btoa(JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 3600 // через 1 час
      })) + '.signature';
      
      Cookies.get.mockReturnValue(token);
      
      const resultToken = await act(async () => {
        return await result.current.checkToken();
      });
      
      expect(resultToken).toBe(token);
    });

    it('should refresh token when expired and set new cookie', async () => {
      const expiredToken = 'header.' + btoa(JSON.stringify({
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 час назад
      })) + '.signature';
      
      const newToken = 'new.jwt.token';
      const mockResponse = { token: newToken };
      
      Cookies.get.mockReturnValue(expiredToken);
      api.RefreshUserToken.mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => useUsers());
      
      const token = await act(async () => {
        return await result.current.checkToken();
      });
      
      expect(api.RefreshUserToken).toHaveBeenCalledWith(expiredToken);
      expect(Cookies.set).toHaveBeenCalledWith('token', newToken, {
        expires: 1,
        secure: true,
        sameSite: 'Strict'
      });
      expect(token).toBe(newToken);
    });

    it('should remove token and return null when refresh fails', async () => {
      const expiredToken = 'expired.jwt.token';
      
      Cookies.get.mockReturnValue(expiredToken);
      api.RefreshUserToken.mockRejectedValue(new Error('Refresh failed'));
      
      const { result } = renderHook(() => useUsers());
      
      const token = await act(async () => {
        return await result.current.checkToken();
      });
      
      expect(api.RefreshUserToken).toHaveBeenCalledWith(expiredToken);
      expect(Cookies.remove).toHaveBeenCalledWith('token');
      expect(token).toBeNull();
    });
  });

  describe('logoutUser', () => {
    it('should clear all auth data', () => {
      // Устанавливаем некоторые данные для очистки
      localStorage.setItem('someKey', 'someValue');
      Cookies.get.mockReturnValue('someToken');
      
      const { result } = renderHook(() => useUsers());
      
      act(() => {
        result.current.logoutUser();
      });
      
      expect(localStorage.length).toBe(0);
      expect(Cookies.remove).toHaveBeenCalledWith('token');
      expect(Cookies.remove).toHaveBeenCalledWith('guestSessionId');
      expect(Cookies.remove).toHaveBeenCalledWith('refreshToken');
      expect(Cookies.remove).toHaveBeenCalledWith('guest_session_id');
    });
  });

  describe('getUserInfo', () => {
    it('should return user info successfully', async () => {
      const userId = 123;
      const mockUserInfo = { id: userId, name: 'Test User' };
      
      api.getUserInfo.mockResolvedValue(mockUserInfo);
      
      const { result } = renderHook(() => useUsers());
      
      const userInfo = await act(async () => {
        return await result.current.getUserInfo(userId);
      });
      
      expect(api.getUserInfo).toHaveBeenCalledWith(userId);
      expect(userInfo).toEqual(mockUserInfo);
    });

    it('should return null for invalid userId', async () => {
      const { result } = renderHook(() => useUsers());
      
      const userInfo = await act(async () => {
        return await result.current.getUserInfo(null);
      });
      
      expect(userInfo).toBeNull();
      expect(api.getUserInfo).not.toHaveBeenCalled();
    });

    it('should return null on API error', async () => {
      const userId = 123;
      
      api.getUserInfo.mockRejectedValue(new Error('User not found'));
      
      const { result } = renderHook(() => useUsers());
      
      const userInfo = await act(async () => {
        return await result.current.getUserInfo(userId);
      });
      
      expect(api.getUserInfo).toHaveBeenCalledWith(userId);
      expect(userInfo).toBeNull();
    });
  });

  describe('getUserByUsername', () => {
    it('should return user by username successfully', async () => {
      const username = 'testuser';
      const mockUserInfo = { id: 123, username: 'testuser' };
      
      api.getUserByUsername.mockResolvedValue(mockUserInfo);
      
      const { result } = renderHook(() => useUsers());
      
      const userInfo = await act(async () => {
        return await result.current.getUserByUsername(username);
      });
      
      expect(api.getUserByUsername).toHaveBeenCalledWith(username);
      expect(userInfo).toEqual(mockUserInfo);
    });

    it('should return null for invalid username', async () => {
      const { result } = renderHook(() => useUsers());
      
      const userInfo = await act(async () => {
        return await result.current.getUserByUsername(null);
      });
      
      expect(userInfo).toBeNull();
      expect(api.getUserByUsername).not.toHaveBeenCalled();
    });

    it('should return null on API error', async () => {
      const username = 'nonexistent';
      
      api.getUserByUsername.mockRejectedValue(new Error('User not found'));
      
      const { result } = renderHook(() => useUsers());
      
      const userInfo = await act(async () => {
        return await result.current.getUserByUsername(username);
      });
      
      expect(api.getUserByUsername).toHaveBeenCalledWith(username);
      expect(userInfo).toBeNull();
    });
  });

  describe('GetUserIdFromJWT', () => {
    it('should return userId from valid token', () => {
      const token = 'valid.jwt.token';
      const mockUserId = 123;
      
      api.GetUserIdFromJWT.mockReturnValue(mockUserId);
      
      const { result } = renderHook(() => useUsers());
      
      const userId = result.current.GetUserIdFromJWT(token);
      
      expect(api.GetUserIdFromJWT).toHaveBeenCalledWith(token);
      expect(userId).toBe(mockUserId);
    });

    it('should return null for null token', () => {
      const { result } = renderHook(() => useUsers());
      
      const userId = result.current.GetUserIdFromJWT(null);
      
      expect(userId).toBeNull();
      expect(api.GetUserIdFromJWT).not.toHaveBeenCalled();
    });

    it('should return null on decode error', () => {
      const token = 'invalid.token';
      
      api.GetUserIdFromJWT.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const { result } = renderHook(() => useUsers());
      
      const userId = result.current.GetUserIdFromJWT(token);
      
      expect(api.GetUserIdFromJWT).toHaveBeenCalledWith(token);
      expect(userId).toBeNull();
    });
  });

  describe('getUserQuizzes', () => {
    it('should return user quizzes successfully', async () => {
      const token = 'user-token';
      const userId = 123;
      const mockQuizzes = [{ id: 1, title: 'Quiz 1' }];
      
      api.getUserQuizzes.mockResolvedValue(mockQuizzes);
      
      const { result } = renderHook(() => useUsers());
      
      await act(async () => {
        const quizzes = await result.current.getUserQuizzes(token, userId);
        expect(quizzes).toEqual(mockQuizzes);
      });
      
      expect(api.getUserQuizzes).toHaveBeenCalledWith(token, userId);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const token = 'user-token';
      const userId = 123;
      const oldPassword = 'oldpass';
      const newPassword = 'newpass';
      const mockResponse = { success: true };
      
      api.updateUserData.mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => useUsers());
      
      await act(async () => {
        const response = await result.current.changePassword(token, userId, oldPassword, newPassword);
        expect(response).toEqual(mockResponse);
      });
      
      expect(api.updateUserData).toHaveBeenCalledWith(token, userId, {
        oldPassword: oldPassword,
        password: newPassword
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle API error with response data', async () => {
      const token = 'user-token';
      const userId = 123;
      const oldPassword = 'wrongpass';
      const newPassword = 'newpass';
      const mockError = {
        response: { data: 'Invalid old password' }
      };
      
      api.updateUserData.mockRejectedValue(mockError);
      
      const { result } = renderHook(() => useUsers());
      
      await expect(
        act(async () => {
          await result.current.changePassword(token, userId, oldPassword, newPassword);
        })
      ).rejects.toThrow('Invalid old password');
      
      expect(api.updateUserData).toHaveBeenCalledWith(token, userId, {
        oldPassword: oldPassword,
        password: newPassword
      });
      expect(result.current.loading).toBe(false);
    });
  });

  describe('changeUsername', () => {
    it('should change username successfully', async () => {
      const token = 'user-token';
      const userId = 123;
      const newUsername = 'newusername';
      const mockResponse = { success: true };
      
      api.updateUserData.mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => useUsers());
      
      await act(async () => {
        const response = await result.current.changeUsername(token, userId, newUsername);
        expect(response).toEqual(mockResponse);
      });
      
      expect(api.updateUserData).toHaveBeenCalledWith(token, userId, {
        userName: newUsername
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle API error with response data', async () => {
      const token = 'user-token';
      const userId = 123;
      const newUsername = 'takenusername';
      const mockError = {
        response: { data: 'Username already taken' }
      };
      
      api.updateUserData.mockRejectedValue(mockError);
      
      const { result } = renderHook(() => useUsers());
      
      await expect(
        act(async () => {
          await result.current.changeUsername(token, userId, newUsername);
        })
      ).rejects.toThrow('Username already taken');
      
      expect(api.updateUserData).toHaveBeenCalledWith(token, userId, {
        userName: newUsername
      });
      expect(result.current.loading).toBe(false);
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useUsers());
      
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.userPicture).toBe('function');
      expect(typeof result.current.loginUser).toBe('function');
      expect(typeof result.current.registerUser).toBe('function');
      expect(typeof result.current.logoutUser).toBe('function');
      expect(typeof result.current.checkToken).toBe('function');
      expect(typeof result.current.getUserInfo).toBe('function');
      expect(typeof result.current.getUserByUsername).toBe('function');
      expect(typeof result.current.GetUserIdFromJWT).toBe('function');
      expect(typeof result.current.getUserQuizzes).toBe('function');
      expect(typeof result.current.changePassword).toBe('function');
      expect(typeof result.current.changeUsername).toBe('function');
    });
  });
});