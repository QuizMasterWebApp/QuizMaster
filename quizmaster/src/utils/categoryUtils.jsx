/**
 * Утилиты для работы с категориями квизов
 */

// Или, если нужно по названиям:
export const validCategories = [
    { value: 0, label: 'Наука' },
    { value: 1, label: 'Технологии' },
    { value: 2, label: 'Музыка' },
    { value: 3, label: 'Игры' },
    { value: 4, label: 'Фильмы' },
    { value: 5, label: 'Спорт' },
    { value: 7, label: 'Другое' }
];

/** Получает человекочитаемое название категории по значению enum
 * @param {number} categoryType - Числовое значение категории
 * @returns {string} - Название категории на русском
 */
export const getCategoryName = (categoryValue) => {
    if (categoryValue === null || categoryValue === undefined) return 'Неизвестная категория';
    
    const categoryMap = {
        0: 'Наука',
        1: 'Технологии',
        2: 'Музыка', 
        3: 'Игры',
        4: 'Фильмы',
        5: 'Спорт',
        7: 'Другое'
    };
    
    return categoryMap[categoryValue] || `Категория ${categoryValue}`;
};

/**
 * Получает оригинальное название категории (англ) по значению enum
 * @param {number} categoryType - Числовое значение категории
 * @returns {string} - Оригинальное название категории
 */
export const getCategoryOriginalName = (categoryType) => {
  const categoryMap = {
    0: 'Science',
    1: 'Technology',
    2: 'Music',
    3: 'Games',
    4: 'Films',
    5: 'Sport',
    7: 'Other'
  };
  
  return categoryMap[categoryType] || 'Unknown';
};

/**
 * Получает цвет для категории (для Tag или другого UI элемента)
 * @param {number} categoryType - Числовое значение категории
 * @returns {string} - Цвет в формате Ant Design Tag
 */
export const getCategoryColor = (categoryType) => {
  const colorMap = {
    0: 'green',      // Наука
    1: 'blue',       // Технологии
    2: 'purple',     // Музыка
    3: 'cyan',       // Игры
    4: 'magenta',    // Фильмы
    5: 'red',        // Спорт
    7: 'default'     // Другое
  };
  
  return colorMap[categoryType] || 'default';
};

/**
 * Преобразует данные категории из API в удобный формат
 * @param {Array} apiCategories - Категории из API
 * @returns {Array} - Форматированные категории
 */
export const formatCategoriesFromApi = (apiCategories) => {
  if (!apiCategories || !Array.isArray(apiCategories)) {
    console.warn('Некорректные данные категорий:', apiCategories);
    return [];
  }
  
  // Преобразуем данные API в нужный формат
  // API возвращает { categoryType: number, name: string }
  const formatted = apiCategories
    .map(category => {
      if (!category || category.categoryType === undefined) {
        console.warn('Пропущена некорректная категория:', category);
        return null;
      }
      
      const categoryType = category.categoryType;
      
      return {
        id: categoryType,
        categoryType: categoryType,
        name: category.name || getCategoryOriginalName(categoryType),
        displayName: getCategoryName(categoryType),
        color: getCategoryColor(categoryType),
        originalName: category.name
      };
    })
    .filter(category => category !== null) // Удаляем null значения
    .sort((a, b) => a.categoryType - b.categoryType); // Сортируем по типу
  
  console.log('Форматированные категории:', formatted);
  return formatted;
};

/**
 * Фильтрует квизы по категории
 * @param {Array} quizzes - Массив квизов
 * @param {number} categoryId - ID категории для фильтрации
 * @returns {Array} - Отфильтрованный массив квизов
 */
export const filterQuizzesByCategory = (quizzes, categoryId) => {
  if (!categoryId && categoryId !== 0) return quizzes;
  return quizzes.filter(quiz => quiz.category === categoryId);
};

/**
 * Группирует квизы по категориям
 * @param {Array} quizzes - Массив квизов
 * @returns {Object} - Объект с ключами-категориями и массивами квизов
 */
export const groupQuizzesByCategory = (quizzes) => {
  return quizzes.reduce((groups, quiz) => {
    const category = quiz.category !== undefined ? quiz.category : 7;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(quiz);
    return groups;
  }, {});
};

/**
 * Получает статистику по категориям
 * @param {Array} quizzes - Массив квизов
 * @returns {Array} - Массив объектов с статистикой по категориям
 */
export const getCategoryStats = (quizzes) => {
  const grouped = groupQuizzesByCategory(quizzes);
  
  return Object.entries(grouped).map(([categoryId, categoryQuizzes]) => ({
    categoryId: parseInt(categoryId),
    categoryName: getCategoryName(parseInt(categoryId)),
    count: categoryQuizzes.length,
    quizzes: categoryQuizzes
  })).sort((a, b) => b.count - a.count);
};

/**
 * Валидация выбора категории при создании/редактировании квиза
 * @param {number} categoryId - ID выбранной категории
 * @param {Array} availableCategories - Доступные категории
 * @returns {string|null} - Сообщение об ошибке или null, если все ок
 */
export const validateCategory = (categoryId, availableCategories) => {
  if (categoryId === undefined || categoryId === null) {
    return 'Выберите категорию для квиза';
  }
  
  const validCategoryIds = [0, 1, 2, 3, 4, 5, 7];
  if (!validCategoryIds.includes(categoryId)) {
    return 'Выбрана недопустимая категория';
  }
  
  return null;
};

/**
 * Получает категорию по ID
 * @param {number} categoryId - ID категории
 * @param {Array} categories - Массив категорий
 * @returns {Object|null} - Объект категории или null
 */
export const getCategoryById = (categoryId, categories) => {
  return categories.find(cat => cat.categoryType === categoryId || cat.id === categoryId) || null;
};