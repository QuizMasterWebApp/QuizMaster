import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { message } from 'antd';
import ProfileModal from '../ProfileModal';
import { useUsers } from '../../hooks/useUsers';

// Мокаем зависимости
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    message: {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
    },
  };
});

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../../API methods/.APIclient', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../hooks/useUsers', () => ({
  useUsers: jest.fn(),
}));

describe('ProfileModal', () => {
  const mockOnClose = jest.fn();
  const mockOnUpdateUser = jest.fn();
  const mockCheckToken = jest.fn();
  const mockChangeUsername = jest.fn();
  const mockChangePassword = jest.fn();
  const mockGetUserInfo = jest.fn();
  const mockNavigate = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    userId: 123,
    userName: 'TestUser',
    onUpdateUser: mockOnUpdateUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
    require('react-router-dom').useLocation.mockReturnValue({ pathname: '/' });
    
    useUsers.mockReturnValue({
      checkToken: mockCheckToken,
      changeUsername: mockChangeUsername,
      changePassword: mockChangePassword,
      getUserInfo: mockGetUserInfo,
    });
  });

  describe('Рендеринг', () => {
    it('должен отображать модальное окно с заголовком', () => {
      render(<ProfileModal {...defaultProps} />);
      
      expect(screen.getByText('Профиль пользователя')).toBeInTheDocument();
    });

    it('должен отображать информацию о пользователе', () => {
      render(<ProfileModal {...defaultProps} />);
      
      expect(screen.getByText('TestUser')).toBeInTheDocument();
      expect(screen.getByText('ID: 123')).toBeInTheDocument();
    });

    it('должен отображать табы "Профиль" и "Безопасность"', () => {
      render(<ProfileModal {...defaultProps} />);
      
      expect(screen.getByText('Профиль')).toBeInTheDocument();
      expect(screen.getByText('Безопасность')).toBeInTheDocument();
    });

    it('должен показывать вкладку профиля по умолчанию', () => {
      render(<ProfileModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Имя пользователя (никнейм)')).toBeInTheDocument();
    });

    it('должен переключаться на вкладку безопасности при клике', () => {
      render(<ProfileModal {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Безопасность'));
      
      expect(screen.getByLabelText('Текущий пароль')).toBeInTheDocument();
      expect(screen.getByLabelText('Новый пароль')).toBeInTheDocument();
    });

    it('не должен рендериться при visible=false', () => {
      const { container } = render(<ProfileModal {...defaultProps} visible={false} />);
      
      // Проверяем, что модальное окно не отображается
      expect(container.firstChild).toBeNull();
    });

    it('должен отображать аватар пользователя', () => {
      render(<ProfileModal {...defaultProps} />);
      
      const avatar = document.querySelector('.ant-avatar');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('Загрузка данных пользователя', () => {
    it('должен загружать данные пользователя при открытии', async () => {
      mockCheckToken.mockResolvedValue('mock-token');
      mockGetUserInfo.mockResolvedValue({ name: 'LoadedUser' });

      await act(async () => {
        render(<ProfileModal {...defaultProps} />);
      });

      expect(mockCheckToken).toHaveBeenCalled();
      expect(mockGetUserInfo).toHaveBeenCalledWith(123);
    });

    it('должен показывать ошибку при неудачной загрузке', async () => {
      mockCheckToken.mockRejectedValue(new Error('Ошибка загрузки'));

      await act(async () => {
        render(<ProfileModal {...defaultProps} />);
      });

      expect(message.error).toHaveBeenCalledWith('Не удалось загрузить данные профиля');
    });
  });

  describe('Обновление профиля', () => {
    beforeEach(() => {
      mockCheckToken.mockResolvedValue('mock-token');
      mockGetUserInfo.mockResolvedValue({ name: 'TestUser' });
    });

    it('должен обновлять имя пользователя при отправке формы', async () => {
      mockChangeUsername.mockResolvedValue({});

      await act(async () => {
        render(<ProfileModal {...defaultProps} />);
      });

      const input = screen.getByLabelText('Имя пользователя (никнейм)');
      fireEvent.change(input, { target: { value: 'NewUsername' } });
      
      const saveButton = screen.getByText('Сохранить изменения');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(mockChangeUsername).toHaveBeenCalledWith('mock-token', 123, 'NewUsername');
      expect(message.success).toHaveBeenCalledWith('Профиль успешно обновлен!');
      expect(mockOnUpdateUser).toHaveBeenCalledWith({ userName: 'NewUsername' });
    });

    it('не должен отправлять форму, если имя не изменилось', async () => {
      await act(async () => {
        render(<ProfileModal {...defaultProps} />);
      });

      const saveButton = screen.getByText('Сохранить изменения');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(mockChangeUsername).not.toHaveBeenCalled();
      expect(message.info).toHaveBeenCalledWith('Нет изменений для сохранения');
    });

    it('должен показывать ошибку при неудачном обновлении', async () => {
      const error = new Error('Ошибка');
      error.response = { status: 400, data: 'UserName already taken' };
      mockChangeUsername.mockRejectedValue(error);

      await act(async () => {
        render(<ProfileModal {...defaultProps} />);
      });

      const input = screen.getByLabelText('Имя пользователя (никнейм)');
      fireEvent.change(input, { target: { value: 'TakenUsername' } });
      
      const saveButton = screen.getByText('Сохранить изменения');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(message.error).toHaveBeenCalledWith('Этот никнейм уже занят. Выберите другой.');
    });

    it('должен валидировать минимальную длину имени', async () => {
      await act(async () => {
        render(<ProfileModal {...defaultProps} />);
      });

      const input = screen.getByLabelText('Имя пользователя (никнейм)');
      fireEvent.change(input, { target: { value: 'ab' } });
      
      const saveButton = screen.getByText('Сохранить изменения');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Минимум 3 символа')).toBeInTheDocument();
      });
    });

    it('должен валидировать максимальную длину имени', async () => {
      await act(async () => {
        render(<ProfileModal {...defaultProps} />);
      });

      const input = screen.getByLabelText('Имя пользователя (никнейм)');
      const longName = 'a'.repeat(51);
      fireEvent.change(input, { target: { value: longName } });
      
      const saveButton = screen.getByText('Сохранить изменения');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Максимум 50 символов')).toBeInTheDocument();
      });
    });
  });

  describe('Смена пароля', () => {
    beforeEach(async () => {
      mockCheckToken.mockResolvedValue('mock-token');
      mockGetUserInfo.mockResolvedValue({ name: 'TestUser' });

      await act(async () => {
        render(<ProfileModal {...defaultProps} />);
      });

      // Переходим на вкладку безопасности
      fireEvent.click(screen.getByText('Безопасность'));
    });

    it('должен менять пароль при корректных данных', async () => {
      mockChangePassword.mockResolvedValue({});

      const oldPasswordInput = screen.getByLabelText('Текущий пароль');
      const newPasswordInput = screen.getByLabelText('Новый пароль');
      const confirmPasswordInput = screen.getByLabelText('Подтвердите новый пароль');

      fireEvent.change(oldPasswordInput, { target: { value: 'oldPass123' } });
      fireEvent.change(newPasswordInput, { target: { value: 'newPass456' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newPass456' } });

      const changeButton = screen.getByText('Изменить пароль');
      await act(async () => {
        fireEvent.click(changeButton);
      });

      expect(mockChangePassword).toHaveBeenCalledWith(
        'mock-token',
        123,
        'oldPass123',
        'newPass456'
      );
      expect(message.success).toHaveBeenCalledWith('Пароль успешно изменен!');
    });

    it('должен валидировать совпадение паролей', async () => {
      const oldPasswordInput = screen.getByLabelText('Текущий пароль');
      const newPasswordInput = screen.getByLabelText('Новый пароль');
      const confirmPasswordInput = screen.getByLabelText('Подтвердите новый пароль');

      fireEvent.change(oldPasswordInput, { target: { value: 'oldPass123' } });
      fireEvent.change(newPasswordInput, { target: { value: 'newPass456' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentPass' } });

      const changeButton = screen.getByText('Изменить пароль');
      fireEvent.click(changeButton);

      await waitFor(() => {
        expect(screen.getByText('Пароли не совпадают')).toBeInTheDocument();
      });
    });

    it('должен валидировать минимальную длину пароля', async () => {
      const newPasswordInput = screen.getByLabelText('Новый пароль');
      
      fireEvent.change(newPasswordInput, { target: { value: '123' } });
      fireEvent.blur(newPasswordInput);

      await waitFor(() => {
        expect(screen.getByText('Пароль должен содержать минимум 6 символов')).toBeInTheDocument();
      });
    });

    it('не должен разрешать одинаковые старый и новый пароли', async () => {
      const oldPasswordInput = screen.getByLabelText('Текущий пароль');
      const newPasswordInput = screen.getByLabelText('Новый пароль');
      const confirmPasswordInput = screen.getByLabelText('Подтвердите новый пароль');

      fireEvent.change(oldPasswordInput, { target: { value: 'samePassword' } });
      fireEvent.change(newPasswordInput, { target: { value: 'samePassword' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'samePassword' } });

      const changeButton = screen.getByText('Изменить пароль');
      await act(async () => {
        fireEvent.click(changeButton);
      });

      expect(message.error).toHaveBeenCalledWith('Новый пароль должен отличаться от старого');
    });

    it('должен показывать ошибку при неверном текущем пароле', async () => {
      const error = new Error('Ошибка');
      error.response = { status: 400, data: 'OldPassword is incorrect' };
      mockChangePassword.mockRejectedValue(error);

      const oldPasswordInput = screen.getByLabelText('Текущий пароль');
      const newPasswordInput = screen.getByLabelText('Новый пароль');
      const confirmPasswordInput = screen.getByLabelText('Подтвердите новый пароль');

      fireEvent.change(oldPasswordInput, { target: { value: 'wrongPass' } });
      fireEvent.change(newPasswordInput, { target: { value: 'newPass456' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newPass456' } });

      const changeButton = screen.getByText('Изменить пароль');
      await act(async () => {
        fireEvent.click(changeButton);
      });

      expect(message.error).toHaveBeenCalledWith('Неверный текущий пароль');
    });
  });

  describe('Закрытие модального окна', () => {
    it('должен закрывать модальное окно при клике на отмену', async () => {
      await act(async () => {
        render(<ProfileModal {...defaultProps} />);
      });

      const cancelButton = screen.getByText('Отмена');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('должен сбрасывать форму при закрытии', async () => {
      await act(async () => {
        render(<ProfileModal {...defaultProps} />);
      });

      const input = screen.getByLabelText('Имя пользователя (никнейм)');
      fireEvent.change(input, { target: { value: 'TestValue' } });
      
      expect(input.value).toBe('TestValue');

      // Закрываем и открываем снова
      fireEvent.click(screen.getByText('Отмена'));
      await act(async () => {
        render(<ProfileModal {...defaultProps} visible={true} />);
      });

      const newInput = screen.getByLabelText('Имя пользователя (никнейм)');
      expect(newInput.value).toBe('TestUser'); // Исходное значение
    });
  });

  describe('Обработка ошибок авторизации', () => {
    beforeEach(() => {
      require('js-cookie').remove.mockClear();
    });

    it('должен перенаправлять на логин при ошибке 401 при обновлении профиля', async () => {
      const error = new Error('Ошибка авторизации');
      error.response = { status: 401 };
      mockChangeUsername.mockRejectedValue(error);
      mockCheckToken.mockResolvedValue('mock-token');

      await act(async () => {
        render(<ProfileModal {...defaultProps} />);
      });

      const input = screen.getByLabelText('Имя пользователя (никнейм)');
      fireEvent.change(input, { target: { value: 'NewUsername' } });
      
      const saveButton = screen.getByText('Сохранить изменения');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(require('js-cookie').remove).toHaveBeenCalledWith('token');
      expect(message.error).toHaveBeenCalledWith('Ошибка авторизации. Пожалуйста, войдите снова.');
    });

    it('должен перенаправлять на логин при ошибке 401 при смене пароля', async () => {
      const error = new Error('Ошибка авторизации');
      error.response = { status: 401 };
      mockChangePassword.mockRejectedValue(error);
      mockCheckToken.mockResolvedValue('mock-token');

      await act(async () => {
        render(<ProfileModal {...defaultProps} />);
      });

      fireEvent.click(screen.getByText('Безопасность'));

      const oldPasswordInput = screen.getByLabelText('Текущий пароль');
      const newPasswordInput = screen.getByLabelText('Новый пароль');
      const confirmPasswordInput = screen.getByLabelText('Подтвердите новый пароль');

      fireEvent.change(oldPasswordInput, { target: { value: 'oldPass123' } });
      fireEvent.change(newPasswordInput, { target: { value: 'newPass456' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newPass456' } });

      const changeButton = screen.getByText('Изменить пароль');
      await act(async () => {
        fireEvent.click(changeButton);
      });

      expect(message.error).toHaveBeenCalledWith('Сессия истекла. Пожалуйста, войдите снова.');
      expect(require('js-cookie').remove).toHaveBeenCalledWith('token');
    });
  });

  describe('Edge Cases', () => {
    it('должен работать без userId', () => {
      const propsWithoutId = { ...defaultProps, userId: null };
      render(<ProfileModal {...propsWithoutId} />);
      
      expect(screen.getByText('ID:')).toBeInTheDocument(); // Проверяем что ID пустой
    });

    it('должен работать без userName', () => {
      const propsWithoutName = { ...defaultProps, userName: null };
      render(<ProfileModal {...propsWithoutName} />);
      
      expect(screen.getByText('Пользователь')).toBeInTheDocument();
    });

    it('должен работать без onUpdateUser callback', () => {
      const propsWithoutCallback = { ...defaultProps, onUpdateUser: undefined };
      render(<ProfileModal {...propsWithoutCallback} />);
      
      // Просто проверяем что компонент рендерится без ошибок
      expect(screen.getByText('Профиль пользователя')).toBeInTheDocument();
    });
  });
});