import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import MenuMobile from '../MenuMobile';
import { useUsers } from '../../hooks/useUsers';

// Мокаем зависимости
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    Dropdown: ({ children, menu, trigger, placement, style }) => (
      <div data-testid="dropdown" style={style}>
        {children}
        {menu && menu.items && (
          <div data-testid="dropdown-menu">
            {menu.items.map((item, index) => (
              <div key={item.key || index} onClick={item.onClick}>
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
  };
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../../hooks/useUsers', () => ({
  useUsers: jest.fn(),
}));

jest.mock('../ProfileModal', () => {
  return function MockProfileModal({ visible, onClose, userId, userName, onUpdateUser }) {
    return visible ? (
      <div data-testid="profile-modal">
        <div>Profile Modal - User: {userName}</div>
        <button onClick={onClose}>Close Modal</button>
        <button onClick={() => onUpdateUser && onUpdateUser({ userName: 'UpdatedName' })}>
          Update User
        </button>
      </div>
    ) : null;
  };
});

describe('MenuMobile', () => {
  const mockNavigate = jest.fn();
  const mockCheckToken = jest.fn();
  const mockGetUserIdFromJWT = jest.fn();
  const mockGetUserInfo = jest.fn();
  const mockLogoutUser = jest.fn();
  const mockUserPicture = jest.fn();

  const defaultUseUsersReturn = {
    userPicture: mockUserPicture,
    GetUserIdFromJWT: mockGetUserIdFromJWT,
    getUserInfo: mockGetUserInfo,
    logoutUser: mockLogoutUser,
    checkToken: mockCheckToken,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
    require('react-router-dom').useLocation.mockReturnValue({ pathname: '/' });
    
    useUsers.mockReturnValue(defaultUseUsersReturn);
    mockUserPicture.mockReturnValue('https://example.com/avatar.jpg');
  });

  const renderWithRouter = (ui) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  describe('Рендеринг', () => {
    it('должен отображать футер с навигацией', () => {
      mockCheckToken.mockResolvedValue(null);
      
      renderWithRouter(<MenuMobile />);
      
      expect(screen.getByText('Главная')).toBeInTheDocument();
      expect(screen.getByText('Войти')).toBeInTheDocument();
    });

    it('должен показывать кнопку "Войти" для неавторизованных пользователей', () => {
      mockCheckToken.mockResolvedValue(null);
      
      renderWithRouter(<MenuMobile />);
      
      expect(screen.getByText('Войти')).toBeInTheDocument();
      expect(screen.queryByText('Мои квизы')).not.toBeInTheDocument();
      expect(screen.queryByText('История')).not.toBeInTheDocument();
    });

    it('должен показывать дополнительные вкладки для авторизованных пользователей', async () => {
      mockCheckToken.mockResolvedValue('valid-token');
      mockGetUserIdFromJWT.mockReturnValue(123);
      mockGetUserInfo.mockResolvedValue({ id: 123, name: 'TestUser' });

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });

      await waitFor(() => {
        expect(screen.getByText('Главная')).toBeInTheDocument();
        expect(screen.getByText('Мои квизы')).toBeInTheDocument();
        expect(screen.getByText('История')).toBeInTheDocument();
        expect(screen.queryByText('Войти')).not.toBeInTheDocument();
      });
    });

    it('должен отображать аватар и имя пользователя для авторизованных пользователей', async () => {
      mockCheckToken.mockResolvedValue('valid-token');
      mockGetUserIdFromJWT.mockReturnValue(123);
      mockGetUserInfo.mockResolvedValue({ id: 123, name: 'TestUser' });

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });

      await waitFor(() => {
        expect(screen.getByText('TestUser')).toBeInTheDocument();
      });
    });

    it('должен подсвечивать активную вкладку', () => {
      mockCheckToken.mockResolvedValue(null);
      
      renderWithRouter(<MenuMobile />);
      
      const homeTab = screen.getByText('Главная').closest('[style*="opacity: 1"]');
      expect(homeTab).toBeInTheDocument();
    });
  });

  describe('Навигация', () => {
    beforeEach(() => {
      mockCheckToken.mockResolvedValue(null);
    });

    it('должен переходить на главную при клике на "Главная"', () => {
      renderWithRouter(<MenuMobile />);
      
      fireEvent.click(screen.getByText('Главная'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('должен переходить на страницу входа при клике на "Войти"', () => {
      renderWithRouter(<MenuMobile />);
      
      fireEvent.click(screen.getByText('Войти'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('должен переходить на "Мои квизы" для авторизованных пользователей', async () => {
      mockCheckToken.mockResolvedValue('valid-token');
      mockGetUserIdFromJWT.mockReturnValue(123);
      mockGetUserInfo.mockResolvedValue({ id: 123, name: 'TestUser' });

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Мои квизы'));
        expect(mockNavigate).toHaveBeenCalledWith('/myquizzes');
      });
    });

    it('должен переходить на "История" для авторизованных пользователей', async () => {
      mockCheckToken.mockResolvedValue('valid-token');
      mockGetUserIdFromJWT.mockReturnValue(123);
      mockGetUserInfo.mockResolvedValue({ id: 123, name: 'TestUser' });

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('История'));
        expect(mockNavigate).toHaveBeenCalledWith('/completedquizzes');
      });
    });
  });

  describe('Аутентификация', () => {
    it('должен проверять аутентификацию при монтировании', () => {
      mockCheckToken.mockResolvedValue(null);
      
      renderWithRouter(<MenuMobile />);
      
      expect(mockCheckToken).toHaveBeenCalled();
    });

    it('должен устанавливать состояние авторизации при наличии токена', async () => {
      mockCheckToken.mockResolvedValue('valid-token');
      mockGetUserIdFromJWT.mockReturnValue(123);
      mockGetUserInfo.mockResolvedValue({ id: 123, name: 'TestUser' });

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });

      expect(mockGetUserIdFromJWT).toHaveBeenCalledWith('valid-token');
      expect(mockGetUserInfo).toHaveBeenCalledWith(123);
    });

    it('должен обрабатывать ошибку декодирования токена', async () => {
      mockCheckToken.mockResolvedValue('invalid-token');
      mockGetUserIdFromJWT.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });

      expect(mockLogoutUser).toHaveBeenCalled();
    });

    it('должен устанавливать состояние неавторизованным при отсутствии токена', async () => {
      mockCheckToken.mockResolvedValue(null);

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });

      expect(screen.getByText('Войти')).toBeInTheDocument();
    });
  });

  describe('Меню профиля', () => {
    beforeEach(async () => {
      mockCheckToken.mockResolvedValue('valid-token');
      mockGetUserIdFromJWT.mockReturnValue(123);
      mockGetUserInfo.mockResolvedValue({ id: 123, name: 'TestUser' });

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });
    });

    it('должен открывать модальное окно профиля при клике на "Настройки профиля"', async () => {
      // Находим дропдаун (обертку вокруг аватара)
      const dropdown = document.querySelector('[data-testid="dropdown"]');
      
      // Кликаем по дропдауну чтобы открыть меню
      fireEvent.click(dropdown);
      
      // Находим пункт меню "Настройки профиля"
      const profileMenuItem = screen.getByText('Настройки профиля');
      fireEvent.click(profileMenuItem);
      
      // Проверяем что модальное окно открылось
      expect(screen.getByTestId('profile-modal')).toBeInTheDocument();
    });

    it('должен выходить из системы при клике на "Выйти"', async () => {
      const dropdown = document.querySelector('[data-testid="dropdown"]');
      fireEvent.click(dropdown);
      
      const logoutMenuItem = screen.getByText('Выйти');
      fireEvent.click(logoutMenuItem);
      
      expect(mockLogoutUser).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('должен обновлять имя пользователя после изменения профиля', async () => {
      const dropdown = document.querySelector('[data-testid="dropdown"]');
      fireEvent.click(dropdown);
      
      const profileMenuItem = screen.getByText('Настройки профиля');
      fireEvent.click(profileMenuItem);
      
      // Находим кнопку обновления в модальном окне
      const updateButton = screen.getByText('Update User');
      fireEvent.click(updateButton);
      
      // Проверяем что имя обновилось
      await waitFor(() => {
        expect(screen.getByText('UpdatedName')).toBeInTheDocument();
      });
    });

    it('должен закрывать модальное окно профиля', async () => {
      const dropdown = document.querySelector('[data-testid="dropdown"]');
      fireEvent.click(dropdown);
      
      const profileMenuItem = screen.getByText('Настройки профиля');
      fireEvent.click(profileMenuItem);
      
      expect(screen.getByTestId('profile-modal')).toBeInTheDocument();
      
      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('profile-modal')).not.toBeInTheDocument();
    });
  });

  describe('Выход из системы', () => {
    beforeEach(async () => {
      mockCheckToken.mockResolvedValue('valid-token');
      mockGetUserIdFromJWT.mockReturnValue(123);
      mockGetUserInfo.mockResolvedValue({ id: 123, name: 'TestUser' });

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });
    });

    it('должен сбрасывать состояние пользователя при выходе', () => {
      const dropdown = document.querySelector('[data-testid="dropdown"]');
      fireEvent.click(dropdown);
      
      const logoutMenuItem = screen.getByText('Выйти');
      fireEvent.click(logoutMenuItem);
      
      // После выхода должны показываться вкладки для неавторизованных
      expect(screen.getByText('Войти')).toBeInTheDocument();
    });
  });

  describe('Смена активной вкладки', () => {
    it('должен обрабатывать неизвестный путь', () => {
      require('react-router-dom').useLocation.mockReturnValue({ pathname: '/unknown' });
      mockCheckToken.mockResolvedValue(null);

      renderWithRouter(<MenuMobile />);
      
      // Компонент должен отрендериться без ошибок
      expect(screen.getByText('Главная')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('должен отображать "Профиль" если имя пользователя отсутствует', async () => {
      mockCheckToken.mockResolvedValue('valid-token');
      mockGetUserIdFromJWT.mockReturnValue(123);
      mockGetUserInfo.mockResolvedValue({ id: 123 }); // Без имени

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });

      await waitFor(() => {
        expect(screen.getByText('Профиль')).toBeInTheDocument();
      });
    });

    it('должен работать без аватара если userPicture возвращает null', async () => {
      mockUserPicture.mockReturnValue(null);
      mockCheckToken.mockResolvedValue('valid-token');
      mockGetUserIdFromJWT.mockReturnValue(123);
      mockGetUserInfo.mockResolvedValue({ id: 123, name: 'TestUser' });

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });

      // Компонент должен отрендериться без ошибок
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    it('должен обрабатывать ошибку при получении информации о пользователе', async () => {
      mockCheckToken.mockResolvedValue('valid-token');
      mockGetUserIdFromJWT.mockReturnValue(123);
      mockGetUserInfo.mockRejectedValue(new Error('Ошибка загрузки'));

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });

      // Компонент должен отрендериться без ошибок
      expect(screen.getByText('Главная')).toBeInTheDocument();
    });
  });

  describe('Интеграция с ProfileModal', () => {
    it('должен передавать правильные пропсы в ProfileModal', async () => {
      mockCheckToken.mockResolvedValue('valid-token');
      mockGetUserIdFromJWT.mockReturnValue(123);
      mockGetUserInfo.mockResolvedValue({ id: 123, name: 'TestUser' });

      await act(async () => {
        renderWithRouter(<MenuMobile />);
      });

      const dropdown = document.querySelector('[data-testid="dropdown"]');
      fireEvent.click(dropdown);
      
      const profileMenuItem = screen.getByText('Настройки профиля');
      fireEvent.click(profileMenuItem);
      
      expect(screen.getByTestId('profile-modal')).toBeInTheDocument();
      expect(screen.getByText('Profile Modal - User: TestUser')).toBeInTheDocument();
    });
  });
});