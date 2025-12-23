import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import QuizCard from '../components/QuizCard';
import { getUserInfo } from '../../API methods/usersMethods';

// Мокаем только API вызов
jest.mock('../../API methods/usersMethods', () => ({
  getUserInfo: jest.fn(),
}));

describe('QuizCard Component', () => {
  const mockQuiz = {
    id: 1,
    title: 'Тестовый квиз',
    description: 'Описание тестового квиза',
    questionsCount: 10,
    timeLimit: '00:30:00',
    authorId: 123,
    category: 1,
  };

  const mockAuthor = {
    id: 123,
    name: 'Автор Тестов',
    username: 'testauthor',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('рендерит информацию о квизе', () => {
    getUserInfo.mockResolvedValue(mockAuthor);

    render(
      <Router>
        <QuizCard quiz={mockQuiz} />
      </Router>
    );

    expect(screen.getByText('Тестовый квиз')).toBeInTheDocument();
    expect(screen.getByText('Описание тестового квиза')).toBeInTheDocument();
    expect(screen.getByText('10 вопросов')).toBeInTheDocument();
    expect(screen.getByText('30м')).toBeInTheDocument();
  });

  test('показывает загрузку информации об авторе', async () => {
    getUserInfo.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve(mockAuthor), 100);
    }));

    render(
      <Router>
        <QuizCard quiz={mockQuiz} />
      </Router>
    );

    // Проверяем, что есть индикатор загрузки
    const loadingIndicator = screen.getByRole('img', { hidden: true });
    expect(loadingIndicator).toBeInTheDocument();

    // Ждем загрузки
    await waitFor(() => {
      expect(screen.getByText('Автор Тестов')).toBeInTheDocument();
    });
  });

  test('обрабатывает ошибку загрузки автора', async () => {
    getUserInfo.mockRejectedValue(new Error('Failed to load'));

    render(
      <Router>
        <QuizCard quiz={mockQuiz} />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('Неизвестный автор')).toBeInTheDocument();
    });
  });

  test('форматирует время правильно', () => {
    getUserInfo.mockResolvedValue(mockAuthor);

    const quizWithLongTime = {
      ...mockQuiz,
      timeLimit: '02:15:30',
    };

    render(
      <Router>
        <QuizCard quiz={quizWithLongTime} />
      </Router>
    );

    expect(screen.getByText('2ч 15м')).toBeInTheDocument();
  });

  test('обрабатывает отсутствие времени', () => {
    getUserInfo.mockResolvedValue(mockAuthor);

    const quizWithoutTime = {
      ...mockQuiz,
      timeLimit: null,
    };

    render(
      <Router>
        <QuizCard quiz={quizWithoutTime} />
      </Router>
    );

    // Проверяем, что нет тега с временем
    const timeTag = screen.queryByText('м');
    expect(timeTag).toBeNull();
  });

  test('показывает правильную категорию', () => {
    getUserInfo.mockResolvedValue(mockAuthor);

    render(
      <Router>
        <QuizCard quiz={mockQuiz} />
      </Router>
    );

    expect(screen.getByText('Наука')).toBeInTheDocument();
  });

  test('ссылка ведет на правильный URL', () => {
    getUserInfo.mockResolvedValue(mockAuthor);

    const { container } = render(
      <Router>
        <QuizCard quiz={mockQuiz} />
      </Router>
    );

    const link = container.querySelector('a[href="/quiz/1"]');
    expect(link).toBeInTheDocument();
  });
});