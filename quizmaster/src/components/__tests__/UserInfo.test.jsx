import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { message } from 'antd';
import UserInfo from '../UserInfo';

// Мокаем зависимые модули
jest.mock('../../hooks/useUsers', () => ({
  useUsers: jest.fn(),
}));

jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
  Avatar: ({ icon, style, src, children }) => (
    <div data-testid="avatar" style={style}>
      {icon && <span data-testid="avatar-icon">{icon}</span>}
      {src && <img src={src} alt="avatar" />}
      {children}
    </div>
  ),
  Dropdown: ({ menu, children, placement, arrow }) => (
    <div 
      data-testid="dropdown" 
      data-placement={placement}
      data-arrow={arrow}
      onClick={(e) => {
        // Имитируем клик по меню при клике на дочерний элемент
        if (menu && menu.items) {
          const clickEvent = new CustomEvent('dropdown-click', { detail: menu.items });
          e.target.dispatchEvent(clickEvent);
        }
      }}
    >
      {children}
      {menu && <div data-testid="dropdown-menu">{JSON.stringify(menu)}</div>}
    </div>
  ),
  Button: ({ type, icon, onClick, children, danger }) => (
    <button 
      data-testid="button" 
      data-type={type}
      data-danger={danger}
      onClick={onClick}
    >
      {icon && <span data-testid="button-icon">{icon}</span>}
      {children}
    </button>
  ),
  Space: ({ children, style }) => (
    <div data-testid="space" style={style}>
      {children}
    </div>
  ),
  Text: ({ children, strong, type }) => (
    <span 
      data-testid="text" 
      data-strong={strong} 
      data-type={type}
    >
      {children}
    </span>
  ),
}));

jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' }),
}));

jest.mock('../ProfileModal', () => ({
  __esModule: true,
  default: ({ visible, onClose, userId, userName, onUpdateUser }) => (
    <div data-testid="profile-modal">
      {visible && (
        <div>
          <p>Profile Modal - User: {userName} (ID: {userId})</p>
          <button data-testid="close-modal" onClick={onClose}>Close Modal</button>
          <button 
            data-testid="update-user" 
            onClick={() => onUpdateUser({ userName: 'Updated User' })}
          >
            Update User
          </button>
        </div>
      )}
    </div>
  ),
}));

// Теперь добавляем тесты
describe('UserInfo Component', () => {
  const mockCheckToken = jest.fn();
  const mockGetUserIdFromJWT = jest.fn();
  const mockGetUserInfo = jest.fn();
  const mockLogoutUser = jest.fn();
  const mockUserPicture = jest.fn();
  const { useUsers } = require('../../hooks/useUsers');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserPicture.mockReturnValue('https://api.dicebear.com/7.x/avataaars/svg?seed=123');
    useUsers.mockReturnValue({
      GetUserIdFromJWT: mockGetUserIdFromJWT,
      getUserInfo: mockGetUserInfo,
      logoutUser: mockLogoutUser,
      userPicture: mockUserPicture,
      checkToken: mockCheckToken,
    });
  });

  test('navigates to login page when login button is clicked', async () => {
    mockCheckToken.mockResolvedValue(null);
    
    render(
      <BrowserRouter>
        <UserInfo />
      </BrowserRouter>
    );

    await waitFor(() => {
      const loginButton = screen.getByText(/войти/i);
      fireEvent.click(loginButton);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('handles user info loading error', async () => {
    mockCheckToken.mockResolvedValue('valid-token');
    mockGetUserIdFromJWT.mockReturnValue(123);
    mockGetUserInfo.mockRejectedValue(new Error('Failed to load user'));
    
    render(
      <BrowserRouter>
        <UserInfo />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockLogoutUser).toHaveBeenCalled();
    });
  });

  test('handles token decode error', async () => {
    mockCheckToken.mockResolvedValue('invalid-token');
    mockGetUserIdFromJWT.mockImplementation(() => {
      throw new Error('Token decode error');
    });
    
    render(
      <BrowserRouter>
        <UserInfo />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockLogoutUser).toHaveBeenCalled();
    });
  });
});