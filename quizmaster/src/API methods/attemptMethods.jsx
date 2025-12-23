import apiClient from './.APIclient';
import Cookies from 'js-cookie';
import { GetUserIdFromJWT } from './usersMethods';

/**
 * Начинает попытку прохождения квиза
 * @param {number} quizId - ID квиза
 * @returns {Promise<Object>} - Объект попытки
 */
export const startAttempt = async (token, quizId, accessKey = null) => {
  // Формируем URL с учётом accessKey
  const url = accessKey
    ? `/attempt/${quizId}/start?accessKey=${accessKey}`
    : `/attempt/${quizId}/start`;

  try {
    const response = await apiClient.post(url, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Ошибка при начале попытки квиза ${quizId}:`, error);
    throw error;
  }
};

/**
 * Завершает попытку прохождения квиза
 * @param {number} attemptId - ID попытки
 * @param {Array} answers - Массив ответов в формате {questionId, selectedOptionIds}
 * @returns {Promise<Object>} - Результат попытки
 */
export const finishAttempt = async (token, attemptId, answers) => {
  // Логируем данные перед отправкой
  console.log('Отправка данных на сервер:');
  console.log('- attemptId:', attemptId);
  console.log('- answers:', JSON.stringify(answers, null, 2));
  
  // Форматируем ответы: для вопросов с одиночным выбором берем первый элемент массива
  const formattedAnswers = answers.map(answer => {
    const isSingleChoice = answer.selectedOptionIds.length <= 1;
    return {
      questionId: answer.questionId,
      selectedOptionIds: answer.selectedOptionIds
    };
  });
  
  console.log('Форматированные ответы для отправки:', JSON.stringify(formattedAnswers, null, 2));
  
  try {
    const response = await apiClient.post(`/Attempt/${attemptId}/stop`, {
      answers: formattedAnswers
    }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    console.log('Ответ от сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Ошибка при завершении попытки ${attemptId}:`, error);
    
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные ошибки:', error.response.data);
    }
    
    throw error;
  }
};

/**
 * Получает попытку по ID
 * @param {number} attemptId - ID попытки
 * @returns {Promise<Object>} - Объект попытки
 */
export const getAttemptById = async (attemptId, token) => {
  try {
    const response = await apiClient.get(`/Attempt/${attemptId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return response.data;
  } catch (error) {
    console.error(`Ошибка при получении попытки ${attemptId}:`, error);
    throw error;
  }
};

/**
 * Получает ответы для конкретной попытки
 * @param {number} attemptId - ID попытки
 * @param {Object} attemptData - данные попытки
 * @returns {Promise<Array>} - Массив ответов, сгруппированных по questionId
 */
export const getAttemptAnswers = async (attemptId, attemptData = null, token, guestSessionId) => {
  const config = {};
  const params = {};

  // Определяем guestSessionId: приоритет - из данных попытки, затем из cookies
  const sessionId = attemptData?.guestSessionId || guestSessionId;

  // Если есть токен, добавляем заголовок авторизации
  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`
    };
  }

  // Если нет токена, но есть guestSessionId, используем его
  if (!token && sessionId) {
    params.guestSessionId = sessionId;
  }

  // Добавляем params только если они есть
  if (Object.keys(params).length > 0) {
    config.params = params;
  }

  try {
    const response = await apiClient.get(`/attempt/${attemptId}/answers`, config);
    
    // Группируем ответы по questionId для вопросов с множественным выбором
    const answersByQuestionId = {};
    
    response.data.forEach(answer => {
      const questionId = answer.questionId;
      
      if (!answersByQuestionId[questionId]) {
        answersByQuestionId[questionId] = {
          questionId: questionId,
          selectedOptionIds: [],
          isCorrect: true, // Изначально считаем правильным
          answers: []
        };
      }
      
      answersByQuestionId[questionId].selectedOptionIds.push(answer.chosenOptionId);
      answersByQuestionId[questionId].answers.push(answer);
      
      // Если хотя бы один ответ неправильный, помечаем весь ответ как неправильный
      if (!answer.isCorrect) {
        answersByQuestionId[questionId].isCorrect = false;
      }
    });
    
    // Конвертируем обратно в массив
    const groupedAnswers = Object.values(answersByQuestionId);
    
    console.log('Сгруппированные ответы:', groupedAnswers);
    
    // Возвращаем и сгруппированные, и исходные данные для обратной совместимости
    return {
      grouped: groupedAnswers,
      raw: response.data
    };
    
  } catch (error) {
    console.error(`Ошибка при получении ответов попытки ${attemptId}:`, error);
    
    // Если ошибка 403 и есть guestSessionId, пробуем без авторизации
    if (error.response?.status === 403 && sessionId) {
      console.log('Пробуем с guestSessionId без авторизации...');
      
      try {
        const guestResponse = await apiClient.get(`/attempt/${attemptId}/answers`, {
          params: { guestSessionId: sessionId }
        });
        
        // Группируем аналогично
        const answersByQuestionId = {};
        
        guestResponse.data.forEach(answer => {
          const questionId = answer.questionId;
          
          if (!answersByQuestionId[questionId]) {
            answersByQuestionId[questionId] = {
              questionId: questionId,
              selectedOptionIds: [],
              isCorrect: true,
              answers: []
            };
          }
          
          answersByQuestionId[questionId].selectedOptionIds.push(answer.chosenOptionId);
          answersByQuestionId[questionId].answers.push(answer);
          
          if (!answer.isCorrect) {
            answersByQuestionId[questionId].isCorrect = false;
          }
        });
        
        const groupedAnswers = Object.values(answersByQuestionId);
        
        return {
          grouped: groupedAnswers,
          raw: guestResponse.data
        };
        
      } catch (guestError) {
        console.error('Ошибка при получении ответов через guestSessionId:', guestError);
        throw guestError;
      }
    }
    
    throw error;
  }
};

/**
 * Получает все попытки пользователя
 * @returns {Promise<Array>} - Массив попыток пользователя
 */
export const getUserAttempts = async (token, userId) => {
  if (!token) {
    throw new Error('Токен авторизации обязателен');
  }

  try {
    const response = await apiClient.get(`/User/${userId}/attempts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении попыток пользователя:', error);
    throw error;
  }
};

/**
 * Получает лидерборд с лучшими попытками для квиза
 * @param {number} quizId - ID квиза
 * @param {string} guestSessionId - ID гостевой сессии (опционально)
 * @returns {Promise<Array>} - Массив лучших попыток
 */
export const getLeaderboard = async (quizId, token, guestSessionId = null) => {
    const config = {};
    const params = {};

    if (token) {
        config.headers = {
            Authorization: `Bearer ${token}`
        };
    }

    let url = `/Attempt/quiz/${quizId}/leaderboard`;

    // Если передали guestSessionId или есть в cookies
    const sessionId = guestSessionId || Cookies.get('guestSessionId');
    if (sessionId) {
        url += `?guestSessionId=${sessionId}`;
    }

    try {
        const response = await apiClient.get(url, config);
        
        // Преобразуем данные в удобный формат
        const leaderboardData = Array.isArray(response.data) ? response.data : [];

        // Получение только по одной лучшей попытки пользователей для отображения в таблице
        // И фильтруем записи убирая строки с нулевым временем и гостей
        const leaderboardDataFilter = getBestAttemptsPerUser(leaderboardData.filter(attempt => 
          attempt.completedAt && 
          attempt.completedAt !== null &&
          attempt.timeSpent !== '00:00:00' &&
          attempt.userName !== 'Guest'
        ))

        return leaderboardDataFilter.map((item, index) => ({
            id: item.id || index,
            userId: item.userId,
            userName: item.userName || `Участник ${index + 1}`,
            score: item.score || 0,
            timeSpent: item.timeSpent || '00:00:00',
            completedAt: item.completedAt || 'Не известно'
        }));
        
    } catch (error) {
        console.error(`Ошибка при получении лидерборда для квиза ${quizId}:`, error);
        
        // Если ошибка авторизации и есть guestSessionId, пробуем без авторизации
        if ((error.response?.status === 401 || error.response?.status === 403) && sessionId) {
            try {
                const guestResponse = await apiClient.get(`/Attempt/quiz/${quizId}/leaderboard`, {
                    params: { guestSessionId: sessionId }
                });
                
                const guestData = Array.isArray(guestResponse.data) ? guestResponse.data : [];
                return guestData.map((item, index) => ({
                    id: item.id || index,
                    position: index + 1,
                    userId: item.userId,
                    userName: item.userName || item.username || `Участник ${index + 1}`,
                    score: item.score || item.percentage || 0,
                    timeTaken: item.timeTaken || item.duration || "00:00:00",
                    completedAt: item.completedAt || item.finishedAt || new Date().toISOString()
                }));
                
            } catch (guestError) {
                console.error('Ошибка при получении лидерборда через guestSessionId:', guestError);
                return []; // Возвращаем пустой массив при ошибке
            }
        }
        
        return []; // Возвращаем пустой массив при ошибке
    }
};

/**
 * Получает поыткии квиза
 * @param {number} quizId - ID квиза
 * @param {string} guestSessionId - ID гостевой сессии (опционально)
 * @returns {Promise<Array>} - Массив лучших попыток
 */
export const getLeaderboardSimple = async (quizId, token, guestSessionId = null) => {
    const config = {};
    const params = {};

    // if (token) {
    //     config.headers = {
    //         Authorization: `Bearer ${token}`
    //     };
    // }

    let url = `/Attempt/quiz/${quizId}/leaderboard`;

    // Если передали guestSessionId или есть в cookies
    const sessionId = guestSessionId || Cookies.get('guestSessionId');
    if (sessionId) {
        url += `?guestSessionId=${sessionId}`;
    }

    try {
        const response = await apiClient.get(url);
        
        // Преобразуем данные в удобный формат
        const leaderboardData = Array.isArray(response.data) ? response.data : [];

        // фильтруем записи убирая строки с нулевым временем
        const leaderboardDataFilter = leaderboardData.filter(attempt => 
          attempt.completedAt && 
          attempt.completedAt !== null &&
          attempt.timeSpent !== '00:00:00'
        )

        return leaderboardDataFilter.map((item, index) => ({
            id: item.id || index,
            userId: item.userId,
            userName: item.userName || `Участник ${index + 1}`,
            score: item.score || 0,
            timeSpent: item.timeSpent || '00:00:00',
            completedAt: item.completedAt || 'Не известно'
        }));
        
    } catch (error) {
        console.error(`Ошибка при получении лидерборда для квиза ${quizId}:`, error);
        
        // Если ошибка авторизации и есть guestSessionId, пробуем без авторизации
        if ((error.response?.status === 401 || error.response?.status === 403) && sessionId) {
            try {
                const guestResponse = await apiClient.get(`/Attempt/quiz/${quizId}/leaderboard`, {
                    params: { guestSessionId: sessionId }
                });
                
                const guestData = Array.isArray(guestResponse.data) ? guestResponse.data : [];
                return guestData.map((item, index) => ({
                    id: item.id || index,
                    position: index + 1,
                    userId: item.userId,
                    userName: item.userName || item.username || `Участник ${index + 1}`,
                    score: item.score || 0,
                    timeSpent: item.timeTaken || "00:00:00",
                    completedAt: item.completedAt || item.finishedAt || new Date().toISOString()
                }));
                
            } catch (guestError) {
                console.error('Ошибка при получении лидерборда через guestSessionId:', guestError);
                return []; // Возвращаем пустой массив при ошибке
            }
        }
        
        return []; // Возвращаем пустой массив при ошибке
    }
};

export const getBestAttemptsPerUser = (attempts) => {
  const bestByUser = {};

  attempts.forEach(attempt => {
    const currentBest = bestByUser[attempt.userName];

    if (!currentBest) {
      bestByUser[attempt.userName] = attempt;
      return;
    }

    // 1. Приоритет score
    if (attempt.score > currentBest.score) {
      bestByUser[attempt.userName] = attempt;
      return;
    }

    // 2. Если score равен — меньшее время лучше
    if (attempt.score === currentBest.score) {
      const attemptTime = parseTime(attempt.timeSpent);
      const bestTime = parseTime(currentBest.timeSpent);

      if (attemptTime < bestTime) {
        bestByUser[attempt.userName] = attempt;
        return;
      }

      // 3. Если и время одинаковое — более ранняя попытка
      if (attemptTime === bestTime) {
        if (new Date(attempt.completedAt) < new Date(currentBest.completedAt)) {
          bestByUser[attempt.userName] = attempt;
        }
      }
    }
  });

  return Object.values(bestByUser);
};

const parseTime = (time) => {
  const [h, m, s] = time.split(':');
  const seconds = parseFloat(s); // учитывает миллисекунды
  return Number(h) * 3600 + Number(m) * 60 + seconds;
};
