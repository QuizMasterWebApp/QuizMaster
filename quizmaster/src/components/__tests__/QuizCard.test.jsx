import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuizCard from '../quizCard';

// Мокаем зависимые модули
jest.mock('../../API methods/usersMethods', () => ({
  getUserInfo: jest.fn(),
}));

jest.mock('../../hooks/useQuestions', () => ({
  useQuestions: jest.fn(),
}));

jest.mock('../../utils/categoryUtils', () => ({
  getCategoryName: jest.fn(),
  getCategoryColor: jest.fn(),
}));

jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  Card: ({ 
    hoverable, 
    onClick, 
    style, 
    styles, 
    children 
  }) => (
    <div 
      data-testid="quiz-card" 
      onClick={onClick}
      style={style}
      data-hoverable={hoverable}
    >
      <div style={styles?.body}>
        {children}
      </div>
    </div>
  ),
  Tag: ({ icon, color, children, style }) => (
    <span data-testid="tag" data-color={color} style={style}>
      {icon && <span data-testid="tag-icon">{icon}</span>}
      {children}
    </span>
  ),
  Skeleton: {
    Input: ({ active, size, style }) => (
      <div 
        data-testid="skeleton" 
        data-active={active}
        data-size={size}
        style={style}
      />
    ),
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
    Paragraph: ({ ellipsis, children, style }) => (
      <p data-testid="paragraph" data-ellipsis={ellipsis?.rows} style={style}>
        {children}
      </p>
    ),
  },
  Space: ({ children, direction, align, size, style, wrap }) => (
    <div 
      data-testid="space" 
      data-direction={direction}
      data-align={align}
      data-size={size}
      data-wrap={wrap}
      style={style}
    >
      {children}
    </div>
  ),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Тесты
describe('QuizCard Component', () => {
  const mockPluralize = jest.fn();
  const { useQuestions } = require('../../hooks/useQuestions');
  const { getUserInfo } = require('../../API methods/usersMethods');
  const { getCategoryName, getCategoryColor } = require('../../utils/categoryUtils');
  
  const mockQuiz = {
    id: 1,
    title: 'Test Quiz Title',
    description: 'Test quiz description',
    authorId: 123,
    questionsCount: 10,
    timeLimit: '00:30:00',
    category: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useQuestions.mockReturnValue({
      pluralize: mockPluralize,
    });
    mockPluralize.mockReturnValue('ов');
    getCategoryName.mockReturnValue('Наука');
    getCategoryColor.mockReturnValue('green');
  });

  test('navigates to quiz page on click', async () => {
    getUserInfo.mockResolvedValue({ name: 'John Doe' });
    
    render(
      <BrowserRouter>
        <QuizCard quiz={mockQuiz} />
      </BrowserRouter>
    );

    await waitFor(() => {
      const card = screen.getByTestId('quiz-card');
      fireEvent.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/quiz/1');
    });
  });
});