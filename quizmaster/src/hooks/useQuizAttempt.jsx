import { useState, useCallback, useRef, useEffect } from 'react';
import * as api from '../API methods/attemptMethods.jsx';
import * as quizApi from '../API methods/quizMethods.jsx';
import Cookies from 'js-cookie';
import { useUsers } from './useUsers.jsx';

export const useQuizAttempt = () => {
  const [attempt, setAttempt] = useState(null);
  const [quizInfo, setQuizInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [visitedQuestions, setVisitedQuestions] = useState(new Set());
  const timerRef = useRef(null);
  const { checkToken } = useUsers();

  // Ключи для localStorage
  const ATTEMPT_STORAGE_KEY = 'current_quiz_attempt';
  const ANSWERS_STORAGE_KEY = 'quiz_attempt_answers';
  const CURRENT_QUESTION_KEY = 'quiz_current_question';

  // Сохранить данные попытки в localStorage
  const saveAttemptToStorage = useCallback((attemptData) => {
    if (attemptData) {
      const storageData = {
        id: attemptData.id,
        quizId: attemptData.quizId,
        startedAt: new Date().toISOString(), // Сохраняем время начала локально
        completedAt: attemptData.completedAt,
        guestSessionId: attemptData.guestSessionId
      };
      localStorage.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(storageData));
    }
  }, []);

  // Загрузить данные попытки из localStorage
  const loadAttemptFromStorage = useCallback(() => {
    const stored = localStorage.getItem(ATTEMPT_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Ошибка при чтении данных попытки из localStorage:', e);
        return null;
      }
    }
    return null;
  }, []);

  // Сохранить ответы в localStorage
  const saveAnswersToStorage = useCallback((answersData) => {
    localStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify(answersData));
  }, []);

  // Загрузить ответы из localStorage
  const loadAnswersFromStorage = useCallback(() => {
    const stored = localStorage.getItem(ANSWERS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Ошибка при чтении ответов из localStorage:', e);
        return {};
      }
    }
    return {};
  }, []);

  // Сохранить текущий вопрос в localStorage
  const saveCurrentQuestionToStorage = useCallback((index) => {
    localStorage.setItem(CURRENT_QUESTION_KEY, index.toString());
  }, []);

  // Загрузить текущий вопрос из localStorage
  const loadCurrentQuestionFromStorage = useCallback(() => {
    const stored = localStorage.getItem(CURRENT_QUESTION_KEY);
    return stored ? parseInt(stored) : 0;
  }, []);

  // Очистить данные попытки из localStorage
  const clearAttemptStorage = useCallback(() => {
    localStorage.removeItem(ATTEMPT_STORAGE_KEY);
    localStorage.removeItem(ANSWERS_STORAGE_KEY);
    localStorage.removeItem(CURRENT_QUESTION_KEY);
  }, []);

  // Функция для преобразования строки времени "hh:mm:ss" в секунды
  const parseTimeStringToSeconds = (timeString) => {
    if (!timeString) return null;
    
    try {
      const parts = timeString.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        return hours * 3600 + minutes * 60 + seconds;
      }
      return null;
    } catch (error) {
      console.error('Ошибка парсинга времени:', error);
      return null;
    }
  };

  // Функция для вычисления оставшегося времени
  const calculateTimeLeft = (startTime, timeLimitSeconds) => {
    if (!startTime || !timeLimitSeconds) return null;
    
    try {
      const start = new Date(startTime);
      const now = new Date();
      const elapsedSeconds = Math.floor((now - start) / 1000);
      const remainingSeconds = timeLimitSeconds - elapsedSeconds;
      
      return Math.max(0, remainingSeconds);
    } catch (error) {
      console.error('Ошибка вычисления оставшегося времени:', error);
      return null;
    }
  };

  // Начать попытку
  const startQuizAttempt = async (token, quizId, accessKey = null) => {
    setLoading(true);
    setError(null);

    try {
      // Начинаем попытку
      const attemptData = await api.startAttempt(token, quizId, accessKey);
      setAttempt(attemptData);
      
      // Сохраняем данные попытки в localStorage
      saveAttemptToStorage(attemptData);

      // Сохраняем guestSessionId если есть
      if (attemptData.guestSessionId) {
        Cookies.set('guestSessionId', attemptData.guestSessionId, { expires: 1 });
      }
      
      // Получаем информацию о квизе
      const quizData = await quizApi.getQuizById(quizId, token, accessKey);
      setQuizInfo(quizData);
      
      // Получаем вопросы квиза
      const questionsData = await quizApi.getQuizQuestions(quizId, accessKey);
      setQuestions(questionsData);

      // Инициализируем пустые ответы
      setAnswers({});
      saveAnswersToStorage({});
      
      // Устанавливаем текущий вопрос
      setCurrentQuestionIndex(0);
      saveCurrentQuestionToStorage(0);
      
      // Устанавливаем таймер, если есть ограничение по времени
      if (quizData.timeLimit && attemptData.completedAt) {
        const totalSeconds = parseTimeStringToSeconds(quizData.timeLimit);
        if (totalSeconds && totalSeconds > 0) {
          // Вычисляем оставшееся время на основе времени начала
          const remainingTime = calculateTimeLeft(attemptData.completedAt, totalSeconds);
          
          if (remainingTime !== null && remainingTime > 0) {
            setTimeLeft(remainingTime);
            initializeTimer(remainingTime);
          } else if (remainingTime === 0) {
            // Время уже истекло, завершаем попытку
            setTimeLeft(0);
          }
        }
      }
      
      return attemptData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /** Полуить данные попытки */
  const getAttemptById = async (attemptId) => {
    setLoading(true);
    setError(null);

    try {
      const attemptData = api.getAttemptById(attemptId)
      return attemptData;
    } 
    catch (err) {
      setError(err.message);
      throw err;
    } 
    finally {
      setLoading(false);
    }
  }

  // Получить ВСЕ данные попытки
  const getAttemptByIdFull = async (attemptId, accessKey = null, token) => {
    setLoading(true);
    setError(null);

    try {
      // Получаем данные
      const attemptData = await api.getAttemptById(attemptId, token);
      setAttempt(attemptData);

      // Сохраняем данные попытки в localStorage
      saveAttemptToStorage(attemptData);
      
      // Сохраняем guestSessionId если есть
      if (attemptData.guestSessionId) {
        Cookies.set('guestSessionId', attemptData.guestSessionId, { expires: 1 });
      }
      
      // Получаем информацию о квизе
      const quizData = await quizApi.getQuizById(attemptData.quizId, token, accessKey);
      setQuizInfo(quizData);
      
      // Получаем вопросы квиза
      const questionsData = await quizApi.getQuizQuestions(quizData.id, accessKey);
      setQuestions(questionsData);

      // Загружаем сохраненные ответы
      const savedAnswers = loadAnswersFromStorage();
      setAnswers(savedAnswers);
      
      // Загружаем сохраненный текущий вопрос
      const savedQuestionIndex = loadCurrentQuestionFromStorage();
      setCurrentQuestionIndex(savedQuestionIndex);
      
      // Устанавливаем таймер, если есть ограничение по времени
      if (quizData.timeLimit && attemptData.completedAt) {
        const totalSeconds = parseTimeStringToSeconds(quizData.timeLimit);
        if (totalSeconds && totalSeconds > 0) {
          // Вычисляем оставшееся время на основе времени начала
          const remainingTime = calculateTimeLeft(attemptData.completedAt, totalSeconds);
          
          if (remainingTime !== null && remainingTime > 0) {
            setTimeLeft(remainingTime);
            initializeTimer(remainingTime);
          } else if (remainingTime === 0) {
            // Время уже истекло, завершаем попытку
            setTimeLeft(0);
            // finishQuizAttempt();
          }
        }
      }
      
      return attemptData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Получить ответы попытки
  const getAttemptAnswers = async (attemptId, attemptData = null, token, guestSessionId) => {
    setLoading(true);
    setError(null);

    try {
      const attemptAnswers = api.getAttemptAnswers(attemptId, attemptData, token, guestSessionId)
      return attemptAnswers;
    } 
    catch (err) {
      setError(err.message);
      throw err;
    } 
    finally {
      setLoading(false);
    }
  }

  // Проверить и восстановить активную попытку
  const checkAndRestoreAttempt = async (quizId, accessKey = null) => {
    const storedAttempt = loadAttemptFromStorage();
    
    if (storedAttempt && storedAttempt.quizId === parseInt(quizId)) {
      // Восстанавливаем существующую попытку
      try {
        await getAttemptByIdFull(storedAttempt.id, accessKey);
        return true; // Попытка восстановлена
      } catch (error) {
        console.warn('Не удалось восстановить попытку:', error);
        // Очищаем невалидные данные
        clearAttemptStorage();
        return false; // Попытка не восстановлена
      }
    }
    return false; // Нет сохраненной попытки для этого квиза
  };

  /** Получение лидерборда - по одной лучше попытке каждого пользователя */
  const getLeaderboard = async (quizId, token, guestSessionId = null) => {
    setLoading(true);
    setError(null);

    try {
      const leaderboardData = api.getLeaderboard(quizId, token, guestSessionId)
      return leaderboardData;
    } 
    catch (err) {
      setError(err.message);
      throw err;
    } 
    finally {
      setLoading(false);
    }
  }

  /** Получение лидерборда простой */
  const getLeaderboardSimple = async (quizId, token, guestSessionId = null) => {
    setLoading(true);
    setError(null);

    try {
      const leaderboardData = api.getLeaderboardSimple(quizId, token, guestSessionId)
      return leaderboardData;
    } 
    catch (err) {
      setError(err.message);
      throw err;
    } 
    finally {
      setLoading(false);
    }
  }

  // Таймер обратного отсчета
  const initializeTimer = (seconds) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeLeft(seconds);
  };

  // Сохранить ответ на вопрос
  const saveAnswer = useCallback((questionId, chosenOptions) => {
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: chosenOptions
      };
      // Сохраняем ответы в localStorage
      saveAnswersToStorage(newAnswers);
      return newAnswers;
    });
  }, [saveAnswersToStorage]);

  // Отметить вопрос как посещенный
  const markQuestionAsVisited = useCallback((questionId) => {
    setVisitedQuestions(prev => new Set([...prev, questionId]));
  }, []);

  // Перейти к следующему вопросу
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion) {
        markQuestionAsVisited(currentQuestion.id);
      }
      const newIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newIndex);
      saveCurrentQuestionToStorage(newIndex);
    }
  }, [currentQuestionIndex, questions, markQuestionAsVisited, saveCurrentQuestionToStorage]);

  // Перейти к предыдущему вопросу
  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion) {
        markQuestionAsVisited(currentQuestion.id);
      }
      const newIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(newIndex);
      saveCurrentQuestionToStorage(newIndex);
    }
  }, [currentQuestionIndex, questions, markQuestionAsVisited, saveCurrentQuestionToStorage]);

  // Перейти к конкретному вопросу
  const goToQuestion = useCallback((index) => {
    if (index >= 0 && index < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion) {
        markQuestionAsVisited(currentQuestion.id);
      }
      setCurrentQuestionIndex(index);
      saveCurrentQuestionToStorage(index);
    }
  }, [currentQuestionIndex, questions, markQuestionAsVisited, saveCurrentQuestionToStorage]);

  // Завершить попытку
  const finishQuizAttempt = async () => {
    if (!attempt) return null;
    
    setLoading(true);

    const token = await checkToken()
    
    try {
      // Формируем ответы в формате для API
      const formattedAnswers = Object.entries(answers).map(([questionId, chosenOptions]) => {
        // Убедимся, что все ID - числа
        const selectedOptionIds = chosenOptions.map(id => parseInt(id)).filter(id => !isNaN(id));
        
        return {
          questionId: parseInt(questionId),
          selectedOptionIds: selectedOptionIds
        };
      });
      
      // Добавляем пустые ответы для ВСЕХ вопросов, даже если на них не отвечали
      questions.forEach(question => {
        if (!answers[question.id]) {
          formattedAnswers.push({
            questionId: question.id,
            selectedOptionIds: [] // Пустой массив для вопросов без ответа
          });
        }
      });
      
      console.log('Отправляемые ответы:', formattedAnswers);
      console.log('Всего вопросов:', questions.length);
      console.log('Ответов сформировано:', formattedAnswers.length);
      
      // Завершаем попытку
      const result = await api.finishAttempt(token, attempt.id, formattedAnswers);
      
      // Очищаем 
      clearAttemptStorage();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Сбрасываем состояние
      setAttempt(null);
      setQuizInfo(null);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setVisitedQuestions(new Set());
      setTimeLeft(null);
      
      return result;
    } catch (err) {
      console.error('Ошибка завершения:', err.response?.data || err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Текущий вопрос
  const currentQuestion = questions[currentQuestionIndex] || null;

  // Ответ на текущий вопрос
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  // Прогресс
  const progress = {
    current: currentQuestionIndex + 1,
    total: questions.length,
    percentage: questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0
  };

  // Количество отвеченных вопросов
  const answeredCount = Object.keys(answers).length;

  // Есть ли у квиза ограничение по времени
  const hasTimeLimit = quizInfo && quizInfo.timeLimit;

  // Эффект для управления таймером
useEffect(() => {
  // Если есть время и оно больше 0, запускаем таймер
  if (timeLeft !== null && timeLeft > 0) {
    // console.log('Запуск таймера с временем:', timeLeft);
    
    // Очищаем предыдущий таймер
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Создаем новый интервал
    timerRef.current = setInterval(() => {
      // console.log('Таймер тик, текущее время:', timeLeft);
      setTimeLeft(prev => {
        // console.log('Обновление времени с', prev, 'на', prev - 1);
        if (prev <= 1) {
          console.log('Время истекло');
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  } else if (timeLeft === 0) {
    // Если время истекло, очищаем таймер
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }
  
  // Очистка при размонтировании или изменении timeLeft
  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };
}, [timeLeft]); // Эффект зависит от timeLeft

// Очистка при полном размонтировании хука
useEffect(() => {
  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };
}, []);

  return {
    // Состояние
    attempt,
    quizInfo, // Добавляем информацию о квизе
    questions,
    currentQuestion,
    currentQuestionIndex,
    answers,
    currentAnswer,
    loading,
    error,
    timeLeft,
    progress,
    answeredCount,
    visitedQuestions,
    hasTimeLimit, // Добавляем флаг наличия тайм-лимита
    
    // Методы
    startQuizAttempt,
    getAttemptById,
    getAttemptByIdFull,
    checkAndRestoreAttempt,
    getLeaderboard,
    getLeaderboardSimple,
    getAttemptAnswers,
    saveAnswer,
    goToNextQuestion,
    goToPreviousQuestion,
    goToQuestion,
    finishQuizAttempt,
    markQuestionAsVisited,
    cleanup: () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    },
    clearAttemptStorage
  };
};