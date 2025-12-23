import {
  validCategories,
  getCategoryName,
  getCategoryColor,
  getCategoryOriginalName,
  formatCategoriesFromApi,
  filterQuizzesByCategory,
  groupQuizzesByCategory,
  getCategoryStats,
  validateCategory,
  getCategoryById
} from '../categoryUtils';

describe('categoryUtils', () => {
  describe('validCategories', () => {
    test('содержит правильное количество категорий', () => {
      expect(validCategories).toHaveLength(7);
    });

    test('содержит правильные значения категорий', () => {
      expect(validCategories).toEqual(expect.arrayContaining([
        { value: 0, label: 'Общее' },
        { value: 1, label: 'Наука' },
        { value: 7, label: 'Технологии' }
      ]));
    });
  });

  describe('getCategoryName', () => {
    test('возвращает правильное название для известной категории', () => {
      expect(getCategoryName(0)).toBe('Общее');
      expect(getCategoryName(1)).toBe('Наука');
      expect(getCategoryName(2)).toBe('История');
      expect(getCategoryName(3)).toBe('Искусство');
      expect(getCategoryName(4)).toBe('География');
      expect(getCategoryName(5)).toBe('Спорт');
      expect(getCategoryName(7)).toBe('Технологии');
    });

    test('возвращает fallback для неизвестной категории', () => {
      expect(getCategoryName(999)).toBe('Категория 999');
      expect(getCategoryName(6)).toBe('Категория 6');
      expect(getCategoryName(8)).toBe('Категория 8');
    });

    test('обрабатывает null и undefined', () => {
      expect(getCategoryName(null)).toBe('Неизвестная категория');
      expect(getCategoryName(undefined)).toBe('Неизвестная категория');
    });
  });

  describe('getCategoryOriginalName', () => {
    test('возвращает правильное оригинальное название для известной категории', () => {
      expect(getCategoryOriginalName(0)).toBe('Science');
      expect(getCategoryOriginalName(1)).toBe('Technology');
      expect(getCategoryOriginalName(2)).toBe('Music');
      expect(getCategoryOriginalName(3)).toBe('Games');
      expect(getCategoryOriginalName(4)).toBe('Films');
      expect(getCategoryOriginalName(5)).toBe('Sport');
      expect(getCategoryOriginalName(7)).toBe('Other');
    });

    test('возвращает "Unknown" для неизвестной категории', () => {
      expect(getCategoryOriginalName(999)).toBe('Unknown');
      expect(getCategoryOriginalName(6)).toBe('Unknown');
      expect(getCategoryOriginalName(8)).toBe('Unknown');
    });

    test('обрабатывает нулевые значения', () => {
      expect(getCategoryOriginalName(null)).toBe('Unknown');
      expect(getCategoryOriginalName(undefined)).toBe('Unknown');
    });
  });

  describe('getCategoryColor', () => {
    test('возвращает правильный цвет для категории', () => {
      expect(getCategoryColor(0)).toBe('green');
      expect(getCategoryColor(1)).toBe('blue');
      expect(getCategoryColor(2)).toBe('purple');
      expect(getCategoryColor(3)).toBe('cyan');
      expect(getCategoryColor(4)).toBe('magenta');
      expect(getCategoryColor(5)).toBe('red');
      expect(getCategoryColor(7)).toBe('default');
    });

    test('возвращает "default" для неизвестной категории', () => {
      expect(getCategoryColor(999)).toBe('default');
      expect(getCategoryColor(6)).toBe('default');
      expect(getCategoryColor(8)).toBe('default');
      expect(getCategoryColor(null)).toBe('default');
      expect(getCategoryColor(undefined)).toBe('default');
    });
  });

  describe('formatCategoriesFromApi', () => {
    let consoleWarnSpy;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    test('преобразует данные API в нужный формат', () => {
      const apiData = [
        { categoryType: 1, name: 'Science' },
        { categoryType: 7, name: 'Technology' },
      ];

      const result = formatCategoriesFromApi(apiData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        categoryType: 1,
        name: 'Science',
        displayName: 'Наука',
        color: 'blue',
        originalName: 'Science',
      });
      expect(result[1]).toEqual({
        id: 7,
        categoryType: 7,
        name: 'Technology',
        displayName: 'Технологии',
        color: 'default',
        originalName: 'Technology',
      });
    });

    test('сортирует категории по categoryType', () => {
      const apiData = [
        { categoryType: 7, name: 'Technology' },
        { categoryType: 1, name: 'Science' },
        { categoryType: 0, name: 'General' },
      ];

      const result = formatCategoriesFromApi(apiData);
      expect(result[0].categoryType).toBe(0);
      expect(result[1].categoryType).toBe(1);
      expect(result[2].categoryType).toBe(7);
    });

    test('использует getCategoryOriginalName если name отсутствует', () => {
      const apiData = [
        { categoryType: 1 },
        { categoryType: 7, name: null },
      ];

      const result = formatCategoriesFromApi(apiData);
      expect(result[0].name).toBe('Technology');
      expect(result[1].name).toBe('Other');
    });

    test('обрабатывает пустой массив', () => {
      expect(formatCategoriesFromApi([])).toEqual([]);
    });

    test('обрабатывает null и undefined входные данные', () => {
      expect(formatCategoriesFromApi(null)).toEqual([]);
      expect(formatCategoriesFromApi(undefined)).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    test('обрабатывает некорректные типы данных', () => {
      expect(formatCategoriesFromApi('not an array')).toEqual([]);
      expect(formatCategoriesFromApi(123)).toEqual([]);
      expect(formatCategoriesFromApi({})).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    test('логирует отформатированные категории', () => {
      const apiData = [{ categoryType: 1, name: 'Science' }];
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      formatCategoriesFromApi(apiData);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Форматированные категории:', expect.any(Array));
      consoleLogSpy.mockRestore();
    });
  });

  describe('filterQuizzesByCategory', () => {
    const mockQuizzes = [
      { id: 1, title: 'Квиз 1', category: 1 },
      { id: 2, title: 'Квиз 2', category: 2 },
      { id: 3, title: 'Квиз 3', category: 1 },
      { id: 4, title: 'Квиз 4', category: null },
      { id: 5, title: 'Квиз 5', category: 0 },
      { id: 6, title: 'Квиз 6', category: 7 },
    ];

    test('фильтрует квизы по категории', () => {
      const filtered = filterQuizzesByCategory(mockQuizzes, 1);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(q => q.id)).toEqual([1, 3]);
    });

    test('возвращает все квизы при null/undefined категории', () => {
      expect(filterQuizzesByCategory(mockQuizzes, null)).toHaveLength(6);
      expect(filterQuizzesByCategory(mockQuizzes, undefined)).toHaveLength(6);
    });

    test('возвращает пустой массив при отсутствии квизов в категории', () => {
      expect(filterQuizzesByCategory(mockQuizzes, 999)).toHaveLength(0);
    });

    test('фильтрует по категории 0', () => {
      const filtered = filterQuizzesByCategory(mockQuizzes, 0);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(5);
    });

    test('фильтрует по категории 7', () => {
      const filtered = filterQuizzesByCategory(mockQuizzes, 7);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(6);
    });

    test('обрабатывает пустой массив квизов', () => {
      expect(filterQuizzesByCategory([], 1)).toEqual([]);
      expect(filterQuizzesByCategory([], null)).toEqual([]);
    });

    test('обрабатывает квизы без свойства category', () => {
      const quizzesWithoutCategory = [
        { id: 1, title: 'Квиз 1' },
        { id: 2, title: 'Квиз 2', category: 1 },
      ];
      
      const filtered = filterQuizzesByCategory(quizzesWithoutCategory, 1);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(2);
    });
  });

  describe('groupQuizzesByCategory', () => {
    const mockQuizzes = [
      { id: 1, title: 'Квиз 1', category: 1 },
      { id: 2, title: 'Квиз 2', category: 2 },
      { id: 3, title: 'Квиз 3', category: 1 },
      { id: 4, title: 'Квиз 4', category: null },
      { id: 5, title: 'Квиз 5', category: undefined },
      { id: 6, title: 'Квиз 6' },
      { id: 7, title: 'Квиз 7', category: 7 },
      { id: 8, title: 'Квиз 8', category: 0 },
    ];

    test('обрабатывает пустой массив квизов', () => {
      const grouped = groupQuizzesByCategory([]);
      expect(grouped).toEqual({});
    });

    test('обрабатывает только квизы с определенными категориями', () => {
      const quizzesWithCategories = [
        { id: 1, category: 1 },
        { id: 2, category: 1 },
        { id: 3, category: 2 },
      ];
      
      const grouped = groupQuizzesByCategory(quizzesWithCategories);
      expect(grouped[1]).toHaveLength(2);
      expect(grouped[2]).toHaveLength(1);
    });
  });

  describe('getCategoryStats', () => {
    const mockQuizzes = [
      { id: 1, title: 'Квиз 1', category: 1 },
      { id: 2, title: 'Квиз 2', category: 1 },
      { id: 3, title: 'Квиз 3', category: 2 },
      { id: 4, title: 'Квиз 4', category: 1 },
      { id: 5, title: 'Квиз 5', category: 7 },
      { id: 6, title: 'Квиз 6', category: null },
      { id: 7, title: 'Квиз 7', category: 7 },
    ];

    test('включает правильные quizzes для каждой категории', () => {
      const stats = getCategoryStats(mockQuizzes);
      
      const category1 = stats.find(s => s.categoryId === 1);
      expect(category1.quizzes).toHaveLength(3);
      expect(category1.quizzes.map(q => q.id)).toEqual([1, 2, 4]);
    });

    test('обрабатывает пустой массив квизов', () => {
      const stats = getCategoryStats([]);
      expect(stats).toEqual([]);
    });
  });

  describe('validateCategory', () => {
    const availableCategories = [
      { categoryType: 1, name: 'Science' },
      { categoryType: 7, name: 'Technology' },
    ];

    test('возвращает null для допустимой категории', () => {
      expect(validateCategory(1, availableCategories)).toBeNull();
      expect(validateCategory(7, availableCategories)).toBeNull();
      expect(validateCategory(0, availableCategories)).toBeNull(); // 0 в validCategoryIds
      expect(validateCategory(5, availableCategories)).toBeNull(); // 5 в validCategoryIds
    });

    test('возвращает ошибку для null/undefined категории', () => {
      expect(validateCategory(null, availableCategories)).toBe('Выберите категорию для квиза');
      expect(validateCategory(undefined, availableCategories)).toBe('Выберите категорию для квиза');
    });

    test('возвращает ошибку для недопустимой категории', () => {
      expect(validateCategory(999, availableCategories)).toBe('Выбрана недопустимая категория');
      expect(validateCategory(6, availableCategories)).toBe('Выбрана недопустимая категория');
      expect(validateCategory(8, availableCategories)).toBe('Выбрана недопустимая категория');
      expect(validateCategory(-1, availableCategories)).toBe('Выбрана недопустимая категория');
    });

    test('не зависит от availableCategories для проверки допустимых ID', () => {
      // Даже если категории нет в availableCategories, но она в validCategoryIds
      expect(validateCategory(2, [])).toBeNull(); // 2 в validCategoryIds
      expect(validateCategory(3, [])).toBeNull(); // 3 в validCategoryIds
      expect(validateCategory(4, [])).toBeNull(); // 4 в validCategoryIds
    });
  });

  describe('getCategoryById', () => {
    const mockCategories = [
      { id: 1, categoryType: 1, name: 'Science', displayName: 'Наука' },
      { categoryType: 7, name: 'Technology', displayName: 'Технологии' },
      { id: 2, categoryType: 2, name: 'Music', displayName: 'История' },
      { id: 3, name: 'Other Category' }, // без categoryType
    ];

    test('находит категорию по categoryType', () => {
      const result = getCategoryById(1, mockCategories);
      expect(result).toEqual(mockCategories[0]);
    });

    test('находит категорию по id', () => {
      const result = getCategoryById(2, mockCategories);
      expect(result).toEqual(mockCategories[2]);
    });

    test('приоритизирует categoryType над id', () => {
      // Если есть и id и categoryType, ищем по categoryType
      const categoriesWithBoth = [
        { id: 999, categoryType: 1, name: 'По categoryType' },
        { id: 1, categoryType: 888, name: 'По id' },
      ];
      
      const result = getCategoryById(1, categoriesWithBoth);
      expect(result).toEqual(categoriesWithBoth[0]); // Находит по categoryType = 1
    });

    test('обрабатывает пустой массив категорий', () => {
      expect(getCategoryById(1, [])).toBeNull();
      expect(getCategoryById(7, [])).toBeNull();
    });

    test('ищет по числовому значению', () => {
      const categoriesWithStringIds = [
        { id: '1', categoryType: '1', name: 'String ID' },
        { id: 1, categoryType: 2, name: 'Number ID' },
      ];
      
      // Ищет строгое равенство, поэтому '1' !== 1
      const result = getCategoryById(1, categoriesWithStringIds);
      expect(result).toEqual(categoriesWithStringIds[1]);
    });
  });
});