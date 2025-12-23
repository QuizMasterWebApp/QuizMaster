import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import MyQuizCard from '../MyQuizCard';

// Простые моки для зависимостей
const mockDeleteQuiz = jest.fn();
const mockCheckToken = jest.fn();
const mockMessageSuccess = jest.fn();
const mockMessageError = jest.fn();
const mockMessageWarning = jest.fn();

jest.mock('../../hooks/useQuizes', () => ({
  useQuizes: () => ({
    deleteQuiz: mockDeleteQuiz,
  }),
}));

jest.mock('../../hooks/useUsers', () => ({
  useUsers: () => ({
    checkToken: mockCheckToken,
  }),
}));

jest.mock('antd', () => ({
  message: {
    success: mockMessageSuccess,
    error: mockMessageError,
    warning: mockMessageWarning,
  },
  Card: ({ hoverable, actions, onClick, style, styles, children, extra }) => (
    <div 
      data-testid="quiz-card" 
      onClick={onClick}
      style={style}
      data-hoverable={hoverable}
    >
      <div style={styles?.body} data-testid="card-body">
        {children}
      </div>
      <div style={styles?.actions} data-testid="card-actions">
        {actions}
      </div>
      {extra && <div data-testid="card-extra">{extra}</div>}
    </div>
  ),
  Tag: ({ icon, color, children, style }) => (
    <span data-testid="tag" data-color={color} style={style}>
      {icon && <span data-testid="tag-icon">{icon}</span>}
      {children}
    </span>
  ),
  Button: ({ 
    type, 
    icon, 
    onClick, 
    danger, 
    title, 
    children, 
    size, 
    loading, 
    disabled,
    htmlType,
    style 
  }) => (
    <button 
      data-testid={`button-${title || 'default'}`} 
      onClick={onClick}
      data-danger={danger}
      data-type={type}
      data-size={size}
      data-loading={loading}
      data-disabled={disabled}
      title={title}
      style={style}
    >
      {icon && <span data-testid="button-icon">{icon}</span>}
      {children}
    </button>
  ),
  Modal: ({ 
    title, 
    open, 
    onOk, 
    onCancel, 
    okText, 
    cancelText, 
    children, 
    okButtonProps 
  }) => {
    if (!open) return null;
    return (
      <div data-testid="modal" data-open={open}>
        <h3 data-testid="modal-title">{title}</h3>
        <div data-testid="modal-content">{children}</div>
        <button 
          data-testid="modal-ok" 
          onClick={onOk}
          data-danger={okButtonProps?.danger}
          disabled={okButtonProps?.disabled}
        >
          {okText}
        </button>
        <button data-testid="modal-cancel" onClick={onCancel}>{cancelText}</button>
      </div>
    );
  },
  Typography: {
    Title: ({ level, children, style }) => (
      <h3 data-testid="title" data-level={level} style={style}>
        {children}
      </h3>
    ),
    Text: ({ type, children, style }) => (
      <span data-testid="text" data-type={type} style={style}>
        {children}
      </span>
    ),
    Paragraph: ({ ellipsis, children, style }) => {
      const ellipsisProps = ellipsis || {};
      return (
        <p 
          data-testid="paragraph" 
          data-rows={ellipsisProps.rows}
          style={style}
        >
          {children}
        </p>
      );
    },
  },
  Space: ({ children, direction, size, align, style }) => (
    <div 
      data-testid="space" 
      data-direction={direction}
      data-size={size}
      data-align={align}
      style={style}
    >
      {children}
    </div>
  ),
  Flex: ({ children, justify, align, wrap, gap, style }) => (
    <div 
      data-testid="flex" 
      data-justify={justify}
      data-align={align}
      data-wrap={wrap}
      data-gap={gap}
      style={style}
    >
      {children}
    </div>
  ),
  Skeleton: {
    Input: ({ active, size, style }) => (
      <div 
        data-testid="skeleton-input" 
        data-active={active}
        data-size={size}
        style={style}
      >
        Loading...
      </div>
    ),
  },
}));

jest.mock('@ant-design/icons', () => ({
  ClockCircleOutlined: () => <span data-testid="clock-icon">⏰</span>,
  QuestionCircleOutlined: () => <span data-testid="question-icon">❓</span>,
  EditOutlined: () => <span data-testid="edit-icon">✏️</span>,
  DeleteOutlined: () => <span data-testid="delete-icon">🗑️</span>,
  BarChartOutlined: () => <span data-testid="chart-icon">📊</span>,
  ExclamationCircleOutlined: () => <span data-testid="exclamation-icon">⚠️</span>,
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
}));

describe('MyQuizCard Component - Extended Tests', () => {
  const mockQuiz = {
    id: 1,
    title: 'Test Quiz',
    description: 'This is a test quiz description',
    questionsCount: 10,
    timeLimit: '00:30:00',
  };

  const mockQuizWithoutDescription = {
    id: 2,
    title: 'Quiz Without Description',
    questionsCount: 5,
    timeLimit: '00:15:00',
  };

  const mockQuizWithoutTimeLimit = {
    id: 3,
    title: 'Quiz Without Time Limit',
    description: 'No time limit quiz',
    questionsCount: 15,
  };

  const mockQuizWithZeroTime = {
    id: 4,
    title: 'Quiz With Zero Time',
    description: 'Quiz with 00:00:00 time',
    questionsCount: 8,
    timeLimit: '00:00:00',
  };

  const mockQuizWithLongDescription = {
    id: 5,
    title: 'Quiz With Very Long Description',
    description: 'A'.repeat(500) + 'B'.repeat(500), // Очень длинное описание
    questionsCount: 12,
    timeLimit: '01:30:00',
  };

  const mockQuizWithZeroQuestions = {
    id: 6,
    title: 'Quiz With Zero Questions',
    description: 'Quiz with no questions',
    questionsCount: 0,
    timeLimit: '00:10:00',
  };

  const mockQuizWithInvalidTimeFormat = {
    id: 7,
    title: 'Quiz With Invalid Time Format',
    description: 'Quiz with invalid time',
    questionsCount: 7,
    timeLimit: 'invalid-time',
  };

  const mockQuizWithVeryLongTitle = {
    id: 8,
    title: 'A'.repeat(100) + 'B'.repeat(100), // Очень длинное название
    description: 'Normal description',
    questionsCount: 20,
    timeLimit: '00:45:00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckToken.mockResolvedValue('valid-token');
    mockDeleteQuiz.mockResolvedValue({ status: 200 });
  });

  describe('Рендеринг в разных состояниях', () => {
    test('отображает карточку квиза с описанием', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuiz} />
        </BrowserRouter>
      );

      expect(screen.getByText('Test Quiz')).toBeInTheDocument();
      expect(screen.getByText('This is a test quiz description')).toBeInTheDocument();
      expect(screen.getByText('10 вопросов')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    test('отображает карточку квиза без ограничения по времени', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuizWithoutTimeLimit} />
        </BrowserRouter>
      );

      expect(screen.getByText('Quiz Without Time Limit')).toBeInTheDocument();
      expect(screen.queryByTestId('tag')).not.toBeInTheDocument(); // Нет тега времени
    });

    test('отображает карточку квиза с нулевым временем (не показывает тег)', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuizWithZeroTime} />
        </BrowserRouter>
      );

      expect(screen.getByText('Quiz With Zero Time')).toBeInTheDocument();
      expect(screen.queryByTestId('tag')).not.toBeInTheDocument(); // Не показывает тег для 00:00:00
    });

    test('обрабатывает очень длинное описание (с ellipsis)', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuizWithLongDescription} />
        </BrowserRouter>
      );

      const paragraph = screen.getByTestId('paragraph');
      expect(paragraph).toHaveAttribute('data-rows', '2'); // Ellipsis с 2 строками
    });

    test('обрабатывает очень длинное название (с ellipsis)', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuizWithVeryLongTitle} />
        </BrowserRouter>
      );

      const title = screen.getByTestId('title');
      expect(title).toBeInTheDocument();
    });

    test('показывает иконки в действиях карточки', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuiz} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('chart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
      expect(screen.getByTestId('delete-icon')).toBeInTheDocument();
    });
  });

  describe('Форматирование времени', () => {
    test('форматирует время в часах, минутах, секундах', () => {
      const quizWithHours = {
        ...mockQuiz,
        timeLimit: '02:30:45',
      };

      render(
        <BrowserRouter>
          <MyQuizCard quiz={quizWithHours} />
        </BrowserRouter>
      );

      const tag = screen.getByTestId('tag');
      expect(tag.textContent).toContain('2ч 30м');
    });

    test('форматирует время только в минутах и секундах', () => {
      const quizWithMinutes = {
        ...mockQuiz,
        timeLimit: '00:45:30',
      };

      render(
        <BrowserRouter>
          <MyQuizCard quiz={quizWithMinutes} />
        </BrowserRouter>
      );

      const tag = screen.getByTestId('tag');
      expect(tag.textContent).toContain('45м 30с');
    });

    test('форматирует время только в секундах', () => {
      const quizWithSeconds = {
        ...mockQuiz,
        timeLimit: '00:00:45',
      };

      render(
        <BrowserRouter>
          <MyQuizCard quiz={quizWithSeconds} />
        </BrowserRouter>
      );

      const tag = screen.getByTestId('tag');
      expect(tag.textContent).toContain('45с');
    });

    test('не показывает тег времени при отсутствии timeLimit', () => {
      const quizWithoutTime = {
        ...mockQuiz,
        timeLimit: null,
      };

      render(
        <BrowserRouter>
          <MyQuizCard quiz={quizWithoutTime} />
        </BrowserRouter>
      );

      expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
    });
  });

  describe('Навигация', () => {
    test('навигация на страницу квиза при клике на карточку', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuiz} />
        </BrowserRouter>
      );

      fireEvent.click(screen.getByTestId('quiz-card'));
      expect(mockNavigate).toHaveBeenCalledWith('/quiz/1');
    });

    test('навигация на редактирование вопросов при клике на кнопку редактирования', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuiz} />
        </BrowserRouter>
      );

      const editButton = screen.getByTestId('button-Редактировать');
      fireEvent.click(editButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/quiz/1/questions');
    });

    test('навигация на статистику при клике на кнопку статистики', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuiz} />
        </BrowserRouter>
      );

      const statsButton = screen.getByTestId('button-Статистика');
      fireEvent.click(statsButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/quiz/1/statistics');
    });
  });

  describe('Удаление квиза', () => {
    test('открывает модальное окно подтверждения при клике на удаление', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuiz} />
        </BrowserRouter>
      );

      const deleteButton = screen.getByTestId('button-Удалить');
      fireEvent.click(deleteButton);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Подтверждение удаления');
      expect(screen.getByTestId('modal-content')).toHaveTextContent('Вы уверены, что хотите удалить квиз "Test Quiz"?');
    });

    test('закрывает модальное окно при отмене удаления', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuiz} />
        </BrowserRouter>
      );

      // Открываем модальное окно
      const deleteButton = screen.getByTestId('button-Удалить');
      fireEvent.click(deleteButton);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      
      // Закрываем модальное окно
      const cancelButton = screen.getByTestId('modal-cancel');
      fireEvent.click(cancelButton);
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  describe('Граничные значения', () => {
    test('обрабатывает квиз без id', () => {
      const quizWithoutId = {
        title: 'Quiz Without ID',
        description: 'No ID quiz',
        questionsCount: 3,
        timeLimit: '00:05:00',
      };

      render(
        <BrowserRouter>
          <MyQuizCard quiz={quizWithoutId} />
        </BrowserRouter>
      );

      expect(screen.getByText('Quiz Without ID')).toBeInTheDocument();
      // Навигация не должна падать
      fireEvent.click(screen.getByTestId('quiz-card'));
    });

    test('обрабатывает квиз с отрицательным questionsCount', () => {
      const quizWithNegativeCount = {
        id: 9,
        title: 'Quiz With Negative Count',
        description: 'Negative questions count',
        questionsCount: -5,
        timeLimit: '00:10:00',
      };

      render(
        <BrowserRouter>
          <MyQuizCard quiz={quizWithNegativeCount} />
        </BrowserRouter>
      );

      expect(screen.getByText('-5 вопросов')).toBeInTheDocument();
    });

    test('обрабатывает квиз с плавающим questionsCount', () => {
      const quizWithFloatCount = {
        id: 10,
        title: 'Quiz With Float Count',
        description: 'Float questions count',
        questionsCount: 7.5,
        timeLimit: '00:10:00',
      };

      render(
        <BrowserRouter>
          <MyQuizCard quiz={quizWithFloatCount} />
        </BrowserRouter>
      );

      expect(screen.getByText('7.5 вопросов')).toBeInTheDocument();
    });

    test('обрабатывает квиз с null values', () => {
      const quizWithNulls = {
        id: 11,
        title: null,
        description: null,
        questionsCount: null,
        timeLimit: null,
      };

      render(
        <BrowserRouter>
          <MyQuizCard quiz={quizWithNulls} />
        </BrowserRouter>
      );

      // Не должно падать
      expect(screen.getByTestId('quiz-card')).toBeInTheDocument();
    });

    test('обрабатывает квиз с undefined values', () => {
      const quizWithUndefined = {
        id: 12,
        title: undefined,
        description: undefined,
        questionsCount: undefined,
        timeLimit: undefined,
      };

      render(
        <BrowserRouter>
          <MyQuizCard quiz={quizWithUndefined} />
        </BrowserRouter>
      );

      // Не должно падать
      expect(screen.getByTestId('quiz-card')).toBeInTheDocument();
    });
  });

  describe('Визуальное оформление', () => {
    test('применяет hoverable стиль к карточке', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuiz} />
        </BrowserRouter>
      );

      const card = screen.getByTestId('quiz-card');
      expect(card).toHaveAttribute('data-hoverable', 'true');
    });

    test('отображает иконки вопросов и времени', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuiz} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('question-icon')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    test('правильно стилизует кнопку удаления', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuiz} />
        </BrowserRouter>
      );

      const deleteButton = screen.getByTestId('button-Удалить');
      expect(deleteButton).toHaveAttribute('data-danger', 'true');
    });
  });

  describe('Производительность и устойчивость', () => {
    test('не падает при быстрых последовательных кликах', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuiz} />
        </BrowserRouter>
      );

      const deleteButton = screen.getByTestId('button-Удалить');
      
      // Многократные клики на кнопку удаления
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);
      
      // Не должно падать
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    test('корректно обрабатывает быстрое открытие и закрытие модального окна', () => {
      render(
        <BrowserRouter>
          <MyQuizCard quiz={mockQuiz} />
        </BrowserRouter>
      );

      const deleteButton = screen.getByTestId('button-Удалить');
      
      // Открываем и сразу закрываем
      fireEvent.click(deleteButton);
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      
      const cancelButton = screen.getByTestId('modal-cancel');
      fireEvent.click(cancelButton);
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      
      // Снова открываем
      fireEvent.click(deleteButton);
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });
  });
});