import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import { useUsers } from '../../hooks/useUsers';

// Мокаем только хук useUsers, чтобы изолировать тест
jest.mock('../../hooks/useUsers');

describe('Login Page', () => {
  const mockLoginUser = jest.fn();
  const mockCheckToken = jest.fn();
  const mockGetUserIdFromJWT = jest.fn();
  const mockGetUserInfo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    useUsers.mockReturnValue({
      loginUser: mockLoginUser,
      checkToken: mockCheckToken,
      GetUserIdFromJWT: mockGetUserIdFromJWT,
      getUserInfo: mockGetUserInfo,
      loading: false,
    });
  });

  test('рендерит страницу логина', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByText('Авторизация')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Имя пользователя')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Пароль')).toBeInTheDocument();
    expect(screen.getByText('Войти')).toBeInTheDocument();
    expect(screen.getByText('Нет аккаунта? Зарегистрироваться')).toBeInTheDocument();
  });

  test('валидация формы работает', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const submitButton = screen.getByText('Войти');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Введите имя пользователя!')).toBeInTheDocument();
      expect(screen.getByText('Введите пароль!')).toBeInTheDocument();
    });

    expect(mockLoginUser).not.toHaveBeenCalled();
  });

  test('успешный логин', async () => {
    const mockToken = 'test-token';
    const mockUserId = 123;
    const mockUserInfo = { name: 'Test User', username: 'testuser' };
    
    mockLoginUser.mockResolvedValue();
    mockCheckToken.mockResolvedValue(mockToken);
    mockGetUserIdFromJWT.mockReturnValue(mockUserId);
    mockGetUserInfo.mockResolvedValue(mockUserInfo);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Заполняем форму
    fireEvent.change(screen.getByPlaceholderText('Имя пользователя'), {
      target: { value: 'testuser' },
    });

    fireEvent.change(screen.getByPlaceholderText('Пароль'), {
      target: { value: 'password123' },
    });

    // Отправляем форму
    fireEvent.click(screen.getByText('Войти'));

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith(
        { username: 'testuser', password: 'password123' },
        false
      );
    });
  });

  test('обработка ошибок при логине', async () => {
    const errorResponse = {
      response: { data: { message: 'Invalid credentials' } }
    };
    
    mockLoginUser.mockRejectedValue(errorResponse);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Заполняем форму
    fireEvent.change(screen.getByPlaceholderText('Имя пользователя'), {
      target: { value: 'wrong' },
    });

    fireEvent.change(screen.getByPlaceholderText('Пароль'), {
      target: { value: 'wrong' },
    });

    // Отправляем форму
    fireEvent.click(screen.getByText('Войти'));

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalled();
    });
  });

  test('ссылка на регистрацию работает', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const registerLink = screen.getByText('Нет аккаунта? Зарегистрироваться');
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });

  test('показывает спиннер при загрузке', () => {
    useUsers.mockReturnValue({
      loginUser: jest.fn(),
      checkToken: jest.fn(),
      GetUserIdFromJWT: jest.fn(),
      getUserInfo: jest.fn(),
      loading: true, // Имитируем загрузку
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const submitButton = screen.getByText('Войти');
    expect(submitButton).toBeDisabled();
  });
});