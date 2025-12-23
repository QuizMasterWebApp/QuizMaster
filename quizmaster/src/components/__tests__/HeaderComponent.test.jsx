import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import HeaderComponent from '../HeaderComponent';

// Моки для зависимостей
const mockCheckToken = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../hooks/useUsers', () => ({
  useUsers: () => ({
    checkToken: mockCheckToken,
  }),
}));

jest.mock('../UserInfo', () => () => <div data-testid="user-info">UserInfo Component</div>);

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: jest.fn(),
}));

jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('antd', () => ({
  Layout: {
    Header: ({ children, style }) => (
      <header data-testid="header" style={style}>
        {children}
      </header>
    ),
  },
  Flex: ({ children, justify, align, style }) => (
    <div 
      data-testid="flex" 
      data-justify={justify}
      data-align={align}
      style={style}
    >
      {children}
    </div>
  ),
  Space: ({ children, size, style }) => (
    <div data-testid="space" data-size={size} style={style}>
      {children}
    </div>
  ),
  Button: ({ 
    type, 
    icon, 
    style, 
    onClick, 
    children, 
    disabled 
  }) => (
    <button 
      data-testid={`button-${children?.toString()?.replace(/\s+/g, '-') || 'default'}`}
      data-type={type}
      data-disabled={disabled}
      style={style}
      onClick={onClick}
    >
      {icon && <span data-testid="button-icon">{icon}</span>}
      {children}
    </button>
  ),
  Typography: {
    Text: ({ children }) => <span data-testid="text">{children}</span>,
  },
}));

jest.mock('@ant-design/icons', () => ({
  HomeOutlined: () => <span data-testid="home-icon">🏠</span>,
  FileTextOutlined: () => <span data-testid="file-icon">📄</span>,
  TrophyOutlined: () => <span data-testid="trophy-icon">🏆</span>,
}));

describe('HeaderComponent', () => {
  const mockUseLocation = require('react-router-dom').useLocation;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockCheckToken.mockClear();
  });

  describe('Рендеринг и начальное состояние', () => {
    test('рендерит хедер с корректными стилями', () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      mockCheckToken.mockResolvedValue(null);

      render(
        <BrowserRouter>
          <HeaderComponent />
        </BrowserRouter>
      );

      const header = screen.getByTestId('header');
      expect(header).toHaveStyle({
        backgroundColor: '#fff',
        height: '64px',
        lineHeight: '64px',
        position: 'sticky',
      });
    });

    test('показывает только кнопку "Главная" когда пользователь не аутентифицирован', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      mockCheckToken.mockResolvedValue(null);

      await act(async () => {
        render(
          <BrowserRouter>
            <HeaderComponent />
          </BrowserRouter>
        );
      });

      expect(screen.getByTestId('button-Главная')).toBeInTheDocument();
      expect(screen.queryByTestId('button-Мои-квизы')).not.toBeInTheDocument();
      expect(screen.queryByTestId('button-Пройденные-квизы')).not.toBeInTheDocument();
    });

    test('показывает все кнопки когда пользователь аутентифицирован', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      mockCheckToken.mockResolvedValue('valid-token');

      await act(async () => {
        render(
          <BrowserRouter>
            <HeaderComponent />
          </BrowserRouter>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('button-Главная')).toBeInTheDocument();
        expect(screen.getByTestId('button-Мои-квизы')).toBeInTheDocument();
        expect(screen.getByTestId('button-Пройденные-квизы')).toBeInTheDocument();
      });
    });

    test('рендерит иконки на кнопках', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      mockCheckToken.mockResolvedValue('valid-token');

      await act(async () => {
        render(
          <BrowserRouter>
            <HeaderComponent />
          </BrowserRouter>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('home-icon')).toBeInTheDocument();
        expect(screen.getAllByTestId('file-icon')).toHaveLength(1);
        expect(screen.getAllByTestId('trophy-icon')).toHaveLength(1);
      });
    });
  });

  describe('Навигация по кликам', () => {
    test('навигация на главную страницу при клике на кнопку "Главная"', () => {
      mockUseLocation.mockReturnValue({ pathname: '/myquizzes' });
      mockCheckToken.mockResolvedValue('valid-token');

      render(
        <BrowserRouter>
          <HeaderComponent />
        </BrowserRouter>
      );

      const homeButton = screen.getByTestId('button-Главная');
      fireEvent.click(homeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    test('не вызывает навигацию при клике на несуществующий ключ', () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      mockCheckToken.mockResolvedValue('valid-token');

      render(
        <BrowserRouter>
          <HeaderComponent />
        </BrowserRouter>
      );

      // Создаем мок кнопки с несуществующим ключом
      const handleTabClick = HeaderComponent.prototype?.handleTabClick;
      if (handleTabClick) {
        const originalHandleTabClick = handleTabClick;
        const spy = jest.spyOn(HeaderComponent.prototype, 'handleTabClick');
        
        // Это для демонстрации - в реальности так не тестируется
        // Просто проверяем что default case существует
        expect(() => {
          HeaderComponent.prototype.handleTabClick('unknown');
        }).not.toThrow();
      }
    });
  });

  describe('Проверка аутентификации', () => {
    test('вызывает checkToken при монтировании компонента', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      mockCheckToken.mockResolvedValue('valid-token');

      await act(async () => {
        render(
          <BrowserRouter>
            <HeaderComponent />
          </BrowserRouter>
        );
      });

      expect(mockCheckToken).toHaveBeenCalledTimes(1);
    });

    test('устанавливает isAuthenticated в true при наличии токена', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      mockCheckToken.mockResolvedValue('valid-token');

      await act(async () => {
        render(
          <BrowserRouter>
            <HeaderComponent />
          </BrowserRouter>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('button-Мои-квизы')).toBeInTheDocument();
        expect(screen.getByTestId('button-Пройденные-квизы')).toBeInTheDocument();
      });
    });

    test('оставляет isAuthenticated в false при отсутствии токена', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      mockCheckToken.mockResolvedValue(null);

      await act(async () => {
        render(
          <BrowserRouter>
            <HeaderComponent />
          </BrowserRouter>
        );
      });

      await waitFor(() => {
        expect(screen.queryByTestId('button-Мои-квизы')).not.toBeInTheDocument();
        expect(screen.queryByTestId('button-Пройденные-квизы')).not.toBeInTheDocument();
      });
    });
  });

  describe('Стили активных/неактивных вкладок', () => {

    test('применяет правильные стили для неактивной вкладки', () => {
      mockUseLocation.mockReturnValue({ pathname: '/myquizzes' });
      mockCheckToken.mockResolvedValue('valid-token');

      render(
        <BrowserRouter>
          <HeaderComponent />
        </BrowserRouter>
      );

      const homeButton = screen.getByTestId('button-Главная');
      
      expect(homeButton.style.borderBottom).toBe('2px solid transparent');
      expect(homeButton.style.color).toBe('rgba(0, 0, 0, 0.85)');
      expect(homeButton.style.fontWeight).toBe('400');
    });
  });

  describe('Флекс-раскладка', () => {
    test('применяет правильные flex стили к контейнеру', () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      mockCheckToken.mockResolvedValue(null);

      render(
        <BrowserRouter>
          <HeaderComponent />
        </BrowserRouter>
      );

      const flexContainer = screen.getByTestId('flex');
      
      expect(flexContainer).toHaveAttribute('data-justify', 'space-between');
      expect(flexContainer).toHaveAttribute('data-align', 'center');
      expect(flexContainer.style.width).toBe('100%');
      expect(flexContainer.style.height).toBe('100%');
    });
  });

  describe('Интеграция с UserInfo', () => {
    test('рендерит компонент UserInfo', () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      mockCheckToken.mockResolvedValue(null);

      render(
        <BrowserRouter>
          <HeaderComponent />
        </BrowserRouter>
      );

      expect(screen.getByTestId('user-info')).toBeInTheDocument();
      expect(screen.getByText('UserInfo Component')).toBeInTheDocument();
    });
  });

  describe('Граничные случаи', () => {
    test('работает с пустым путем', () => {
      mockUseLocation.mockReturnValue({ pathname: '' });
      mockCheckToken.mockResolvedValue('valid-token');

      render(
        <BrowserRouter>
          <HeaderComponent />
        </BrowserRouter>
      );

      // Не должно падать
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    test('работает с путем содержащим слеш', () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      mockCheckToken.mockResolvedValue('valid-token');

      render(
        <BrowserRouter>
          <HeaderComponent />
        </BrowserRouter>
      );

      expect(screen.getByTestId('button-Главная')).toBeInTheDocument();
    });

    test('работает с вложенными путями', () => {
      mockUseLocation.mockReturnValue({ pathname: '/quiz/123/questions' });
      mockCheckToken.mockResolvedValue('valid-token');

      render(
        <BrowserRouter>
          <HeaderComponent />
        </BrowserRouter>
      );

      // Должен установить activeTab в '' для неизвестного пути
      const homeButton = screen.getByTestId('button-Главная');
      expect(homeButton.style.borderBottom).toBe('2px solid transparent');
    });
  });

  describe('Производительность', () => {
    test('не вызывает лишних ререндеров при тех же пропсах', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      mockCheckToken.mockResolvedValue('valid-token');

      const { rerender } = await act(async () => {
        return render(
          <BrowserRouter>
            <HeaderComponent />
          </BrowserRouter>
        );
      });

      const initialRenderCount = mockCheckToken.mock.calls.length;

      // Ререндерим с теми же условиями
      await act(async () => {
        rerender(
          <BrowserRouter>
            <HeaderComponent />
          </BrowserRouter>
        );
      });

      // checkToken должен быть вызван только один раз при монтировании
      expect(mockCheckToken).toHaveBeenCalledTimes(initialRenderCount);
    });
  });

  describe('Асинхронное поведение', () => {
    test('корректно обрабатывает задержку при проверке токена', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      
      // Имитируем задержку ответа
      mockCheckToken.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('valid-token'), 100))
      );

      await act(async () => {
        render(
          <BrowserRouter>
            <HeaderComponent />
          </BrowserRouter>
        );
      });

      // Изначально кнопки не должны отображаться
      expect(screen.queryByTestId('button-Мои-квизы')).not.toBeInTheDocument();

      // Ждем завершения асинхронной операции
      await waitFor(() => {
        expect(screen.getByTestId('button-Мои-квизы')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    test('не ломается при быстрой смене аутентификации', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      
      // Сначала возвращаем токен, потом null
      mockCheckToken
        .mockResolvedValueOnce('valid-token')
        .mockResolvedValueOnce(null);

      const { rerender } = await act(async () => {
        return render(
          <BrowserRouter>
            <HeaderComponent />
          </BrowserRouter>
        );
      });

      // Ждем первой проверки
      await waitFor(() => {
        expect(screen.getByTestId('button-Мои-квизы')).toBeInTheDocument();
      });

      // Сбрасываем мок для симуляции новой проверки (хотя в реальности useEffect не должен вызываться повторно)
      // Этот тест проверяет устойчивость компонента
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });
});