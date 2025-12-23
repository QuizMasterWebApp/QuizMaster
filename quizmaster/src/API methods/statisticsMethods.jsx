import apiClient from './.APIclient';
import Cookies from 'js-cookie';

/**
 * Получает детальную статистику для квиза автора
 * @param {number} quizId - ID квиза
 * @returns {Promise<Object>} - Статистика по квизу
 */
export const getQuizStatistics = async (quizId) => {
  const token = Cookies.get('token');
  
  if (!token) {
    throw new Error('Требуется авторизация для получения статистики');
  }

  try {
    // Получаем все попытки для этого квиза
    const response = await apiClient.get(`/Quiz/${quizId}/attempts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data || [];
  } catch (error) {
    console.error(`Ошибка при получении статистики квиза ${quizId}:`, error);
    
    if (error.response?.status === 403) {
      throw new Error('У вас нет прав для просмотра статистики этого квиза');
    }
    
    if (error.response?.status === 404) {
      throw new Error(`Квиз с ID ${quizId} не найден`);
    }
    
    throw error;
  }
};

/**
 * Получает ответы пользователей для анализа
 * @param {number} attemptId - ID попытки
 * @returns {Promise<Array>} - Ответы пользователя
 */
export const getAttemptAnswersForAnalysis = async (attemptId) => {
  const token = Cookies.get('token');
  
  if (!token) {
    throw new Error('Требуется авторизация');
  }

  try {
    const response = await apiClient.get(`/Attempt/${attemptId}/answers`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data || [];
  } catch (error) {
    console.error(`Ошибка при получении ответов попытки ${attemptId}:`, error);
    throw error;
  }
};

/**
 * Получает детальную информацию о вопросе
 * @param {number} questionId - ID вопроса
 * @returns {Promise<Object>} - Детали вопроса
 */
export const getQuestionDetails = async (questionId) => {
  try {
    const response = await apiClient.get(`/Question/${questionId}`);
    return response.data;
  } catch (error) {
    console.error(`Ошибка при получении вопроса ${questionId}:`, error);
    throw error;
  }
};