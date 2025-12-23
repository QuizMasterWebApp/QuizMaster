import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { message } from 'antd';
import QuizConnectModal from '../../components/QuizConnectModal';
import * as api from '../../API methods/quizMethods';

// Мокаем зависимые модули
jest.mock('../../API methods/quizMethods');
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
  Modal: ({ 
    open, 
    onCancel, 
    title, 
    footer, 
    children 
  }) => open ? (
    <div data-testid="modal">
      <div>{title}</div>
      <button onClick={onCancel} data-testid="cancel-button">Cancel</button>
      <div>{children}</div>
      <div>{footer}</div>
    </div>
  ) : null,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('QuizConnectModal Component', () => {
  const mockOnClose = jest.fn();
  const mockQuizInfo = { quizId: 1, accessKey: 'ABCDE' };

  beforeEach(() => {
    jest.clearAllMocks();
    api.connectToQuizByCode.mockReset();
  });

  test('calls onClose when cancel button is clicked', () => {
    render(
      <BrowserRouter>
        <QuizConnectModal visible={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('cancel-button'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('submits form with valid code and navigates on success', async () => {
    api.connectToQuizByCode.mockResolvedValue(mockQuizInfo);
    
    render(
      <BrowserRouter>
        <QuizConnectModal visible={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    // Вводим код
    const codeInput = screen.getByLabelText(/введите код доступа/i);
    fireEvent.change(codeInput, { target: { value: 'ABCDE' } });
    
    // Отправляем форму
    const submitButton = screen.getByRole('button', { name: /подключиться/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.connectToQuizByCode).toHaveBeenCalledWith('ABCDE');
      expect(message.success).toHaveBeenCalledWith('Подключение успешно!');
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/quiz/1?accessKey=ABCDE');
    });
  });

  test('shows error message when connection fails', async () => {
    const errorResponse = { response: { data: 'Неверный код доступа' } };
    api.connectToQuizByCode.mockRejectedValue(errorResponse);
    
    render(
      <BrowserRouter>
        <QuizConnectModal visible={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    const codeInput = screen.getByLabelText(/введите код доступа/i);
    fireEvent.change(codeInput, { target: { value: 'WRONG' } });
    
    const submitButton = screen.getByRole('button', { name: /подключиться/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.connectToQuizByCode).toHaveBeenCalledWith('WRONG');
      expect(message.error).toHaveBeenCalledWith('Неверный код доступа');
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test('shows error message when API returns error without response', async () => {
    api.connectToQuizByCode.mockRejectedValue(new Error('Network error'));
    
    render(
      <BrowserRouter>
        <QuizConnectModal visible={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    const codeInput = screen.getByLabelText(/введите код доступа/i);
    fireEvent.change(codeInput, { target: { value: 'ABCDE' } });
    
    const submitButton = screen.getByRole('button', { name: /подключиться/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Неверный код доступа');
    });
  });

  test('validates code length (5 characters)', async () => {
    render(
      <BrowserRouter>
        <QuizConnectModal visible={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    // Пробуем ввести 4 символа
    const codeInput = screen.getByLabelText(/введите код доступа/i);
    fireEvent.change(codeInput, { target: { value: 'ABCD' } });
    
    const submitButton = screen.getByRole('button', { name: /подключиться/i });
    fireEvent.click(submitButton);

    // Проверяем, что API не вызывался при невалидных данных
    expect(api.connectToQuizByCode).not.toHaveBeenCalled();
  });
});