import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthForm from '../AuthForm';

describe('AuthForm Component', () => {
  const defaultProps = {
    title: 'Тестовая форма',
    onFinish: jest.fn(),
    buttonText: 'Отправить',
    linkText: 'Ссылка',
    linkTo: '/test',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('рендерит все элементы формы', () => {
    render(<AuthForm {...defaultProps} />);

    expect(screen.getByText('Тестовая форма')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Имя пользователя')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Пароль')).toBeInTheDocument();
    expect(screen.getByText('Отправить')).toBeInTheDocument();
    expect(screen.getByText('Ссылка')).toBeInTheDocument();
  });

  test('показывает поле подтверждения пароля при isRegistration', () => {
    render(<AuthForm {...defaultProps} isRegistration={true} />);
    
    expect(screen.getByPlaceholderText('Подтвердите пароль')).toBeInTheDocument();
  });

  test('валидация формы работает корректно', async () => {
    render(<AuthForm {...defaultProps} />);

    const submitButton = screen.getByText('Отправить');
    
    // Пытаемся отправить пустую форму
    fireEvent.click(submitButton);

    // Ждем появления сообщений об ошибках
    await waitFor(() => {
      expect(screen.getByText('Введите имя пользователя!')).toBeInTheDocument();
      expect(screen.getByText('Введите пароль!')).toBeInTheDocument();
    });

    // Проверяем, что onFinish не был вызван
    expect(defaultProps.onFinish).not.toHaveBeenCalled();
  });

  test('форма отправляется с корректными данными', async () => {
    render(<AuthForm {...defaultProps} />);

    // Заполняем форму
    fireEvent.change(screen.getByPlaceholderText('Имя пользователя'), {
      target: { value: 'testuser' },
    });

    fireEvent.change(screen.getByPlaceholderText('Пароль'), {
      target: { value: 'password123' },
    });

    // Отправляем форму
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(defaultProps.onFinish).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });
  });

  test('валидация подтверждения пароля работает при регистрации', async () => {
    render(<AuthForm {...defaultProps} isRegistration={true} />);

    // Заполняем форму с разными паролями
    fireEvent.change(screen.getByPlaceholderText('Имя пользователя'), {
      target: { value: 'testuser' },
    });

    fireEvent.change(screen.getByPlaceholderText('Пароль'), {
      target: { value: 'password123' },
    });

    fireEvent.change(screen.getByPlaceholderText('Подтвердите пароль'), {
      target: { value: 'different' },
    });

    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(screen.getByText('Пароли не совпадают!')).toBeInTheDocument();
    });
  });

  test('отображает состояние загрузки', () => {
    render(<AuthForm {...defaultProps} loading={true} />);
    
    const submitButton = screen.getByText('Отправить');
    expect(submitButton).toBeDisabled();
    expect(submitButton.querySelector('.ant-btn-loading')).toBeInTheDocument();
  });

  test('ссылка ведет на правильный путь', () => {
    render(<AuthForm {...defaultProps} />);
    
    const link = screen.getByText('Ссылка');
    expect(link.closest('a')).toHaveAttribute('href', '/test');
  });
});