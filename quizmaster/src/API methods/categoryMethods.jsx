import apiClient from './.APIclient';

/**
 * Получает все категории с сервера
 * @returns {Promise<Array>} - Массив категорий в формате { categoryType: number, name: string }
 */
export const getAllCategories = async () => {
  try {
    const response = await apiClient.get('/Category');
    
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else {
      console.error('Некорректный формат данных категорий:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Ошибка при получении категорий:', error);
    
    // Логируем детали ошибки
    if (error.response) {
      console.error('Данные ошибки:', error.response);
    } else if (error.request) {
      console.error('Запрос был сделан, но ответ не получен:', error.request);
    } else {
      console.error('Ошибка настройки запроса:', error.message);
    }
    
    throw error;
  }
};

/** Получает категорию по ID
 * @param {number} id - ID категории
 * @returns {Promise<Object>} - Объект категории
 */
export const getCategoryById = async (id) => {
  try {
    const response = await apiClient.get(`/Category/${id}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`Категория с ID ${id} не найдена`);
    }
    console.error(`Ошибка при получении категории ${id}:`, error);
    throw error;
  }
};

/**
 * Получает квизы по названию категории
 * @param {string} categoryName - Название категории (например: "Science", "Technology")
 * @returns {Promise<Array>} - Массив квизов в этой категории
 */
export const getQuizzesByCategory = async (categoryName) => {
  try {
    const response = await apiClient.get(`/Quiz/by-category/${categoryName}`);
    return response.data;
  } catch (error) {
    console.error(`Ошибка при получении квизов категории ${categoryName}:`, error);
    
    if (error.response?.status === 404) {
      throw new Error(`Категория "${categoryName}" не найдена или в ней нет квизов`);
    }
    
    if (error.response?.status === 400) {
      throw new Error(`Некорректное название категории: ${categoryName}`);
    }
    
    throw error;
  }
};