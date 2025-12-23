import apiClient from './.APIclient';
import { GetUserIdFromJWT } from './usersMethods';

/**
 * Получает все квизы с сервера
 * @returns {Promise<Array>} - Массив квизов
 */
export const getAllQuizzes = async () => {
  try {
    const response = await apiClient.get('/Quiz');
    const quizzes = response.data;

    // Для каждого квиза получаем количество вопросов
    const quizzesWithQuestionsCount = await Promise.all(
      quizzes.map(async (quiz) => {
        try {
          const questions = await getQuizQuestions(quiz.id, quiz.privateAccessKey);
          return {
            ...quiz,
            questionsCount: questions?.length ?? 0,
          };
        } catch (e) {
          console.warn(`Не удалось получить вопросы для квиза ${quiz.id}`, e);
          return {
            ...quiz,
            questionsCount: 0,
          };
        }
      })
    );

    console.log('Полученные квизы:', quizzesWithQuestionsCount);
    return quizzesWithQuestionsCount;

  } catch (error) {
    console.error('Ошибка при получении квизов:', error);
    throw error;
  }
};

/**
 * Создает новый квиз
 * @param {Object} token - Токен авторизации
 * @param {Object} quizData - Данные для создания квиза
 * @param {string} quizData.title - Название квиза
 * @param {string} quizData.description - Описание квиза
 * @param {number} quizData.categoryId - ID категории
 * @param {boolean} quizData.isPublic - Публичный ли квиз
 * @param {number} quizData.timeLimit - Ограничение по времени в секундах
 * @returns {Promise<Object>} - Созданный квиз
 */
export const createQuiz = async (token, quizData) => {
  if (!token) {
    throw new Error('Токен авторизации обязателен');
  }
  // Валидация данных
  if (!quizData.title || quizData.title.trim() === '') {
    throw new Error('Название квиза обязательно');
  }

  const payload = {
    title: quizData.title,
    description: quizData.description || '',
    categoryId: quizData.categoryId || null,
    isPublic: quizData.isPublic || false,
    timeLimit: quizData.timeLimit || null
  };

  try {
    const response = await apiClient.post('/Quiz', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Квиз успешно создан:', response.data);
    return response.data;

  } catch (error) {
    console.error('Ошибка при создании квиза:', error);
    
    if (error.response?.status === 400) {
      const errorMessage = error.response.data || 'Неверные данные для создания квиза';
      throw new Error(errorMessage);
    }
    
    if (error.response?.status === 401) {
      throw new Error('Ошибка авторизации. Пожалуйста, войдите снова.');
    }
    
    throw error;
  }
};

/**
 * Получает квиз по его ID
 * @param {number} id - ID квиза
 * @param {string} token - Токен пользователя
 * @returns {Promise<Object>} - Объект квиза
 */
export const getQuizById = async (id, token, accessKey = null) => {
    try {
        const config = {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        };
        
        // Если есть accessKey, добавляем его в URL как query параметр
        let url = `/Quiz/${id}`;
        if (accessKey) {
            url = `Quiz/access/${encodeURIComponent(accessKey)}`;
        }
        
        console.log('Запрос квиза:', { url, accessKey });
        
        const response = await apiClient.get(url, config);
        const quiz = response.data;

        // Получаем вопросы и считаем их количество
        const questions = await getQuizQuestions(id, accessKey);
        const questionsCount = questions?.length ?? 0;

        const result = {
          ...quiz,
          questionsCount,
        };

        console.log('Получен квиз с ID', id || accessKey, ':', result);
        return result;
    } catch (error) {
        console.error(`Ошибка при получении квиза ${id || accessKey}:`, error);
        throw error;
    }
};


/**
 * Удаляет квиз по ID
 * @param {Object} token - Токен авторизации
 * @param {number} id - ID квиза для удаления
 * @returns {Promise<string>} Сообщение об успешном удалении
 */
export const deleteQuiz = async (token, id) => {
  if (!token) {
    throw new Error('Токен авторизации обязателен');
  }
  if (!id || id <= 0) {
    throw new Error('Неверный ID квиза для удаления');
  }

  try {
    const response = await apiClient.delete(`/Quiz/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Квиз с ID ${id} успешно удален`);
    return response.data || 'Квиз успешно удален';

  } catch (error) {
    console.error(`Ошибка при удалении квиза ${id}:`, error);
    
    if (error.response?.status === 404) {
      throw new Error(`Квиз с ID ${id} не найден`);
    }
    
    if (error.response?.status === 403) {
      throw new Error('У вас нет прав для удаления этого квиза');
    }
    
    if (error.response?.status === 401) {
      throw new Error('Ошибка авторизации');
    }
    
    throw error;
  }
};

/**
 * Обновляет существующий квиз
 * @param {Object} token - Токен авторизации
 * @param {number} id - ID квиза
 * @param {Object} updates - Обновления для квиза
 * @returns {Promise<string>} - Сообщение об успешном обновлении
 */
export const updateQuiz = async (token, id, updates) => {

  try {
    const response = await apiClient.put(`/Quiz/${id}`, updates, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Квиз с ID ${id} успешно обновлен`);
    return response;

  } catch (error) {
    console.error(`Ошибка при обновлении квиза ${id}:`, error);
    
    if (error.response?.status === 404) {
      throw new Error(`Квиз с ID ${id} не найден`);
    }
    
    if (error.response?.status === 403) {
      throw new Error('У вас нет прав для обновления этого квиза');
    }
    
    throw error;
  }
};

/**
 * Получает вопросы для квиза
 * @param {number} quizId - ID квиза
 * @param {string} accessKey - Ключ доступа для приватных квизов
 * @returns {Promise<Array>} - Массив вопросов
 */
export const getQuizQuestions = async (quizId, accessKey = null) => {
  try {
    const params = {};
    if (accessKey) {
      params.accessKey = accessKey;
    }
    
    const response = await apiClient.get(`/quiz/${quizId}/questions`, { params });
    return response.data;
  } catch (error) {
    console.error(`Ошибка при получении вопросов квиза ${quizId}:`, error);
    throw error;
  }
};

/**
 * Подключается к квизу по коду доступа
 * @param {string} code - Код доступа (5 символов)
 * @returns {Promise<Object>} - Информация о квизе
 */
export const connectToQuizByCode = async (code) => {
  try {
    const response = await apiClient.get(`/quiz/connect/${code}`);
    return response.data;
  } catch (error) {
    console.error(`Ошибка при подключении к квизу по коду ${code}:`, error);
    throw error;
  }
};
