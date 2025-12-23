const {
  getCategoryName,
  getCategoryColor,
  filterQuizzesByCategory,
} = require('../categoryUtils');

describe('categoryUtils', () => {
  describe('getCategoryName', () => {
    test('возвращает правильное название категории', () => {
      expect(getCategoryName(1)).toBe('Наука');
      expect(getCategoryName(7)).toBe('Технологии');
    });

    test('возвращает fallback для неизвестной категории', () => {
      expect(getCategoryName(999)).toBe('Неизвестная категория');
    });

    test('обрабатывает null и undefined', () => {
      expect(getCategoryName(null)).toBe('Неизвестная категория');
      expect(getCategoryName(undefined)).toBe('Неизвестная категория');
    });
  });

  describe('filterQuizzesByCategory', () => {
    const mockQuizzes = [
      { id: 1, title: 'Quiz 1', category: 1 },
      { id: 2, title: 'Quiz 2', category: 2 },
      { id: 3, title: 'Quiz 3', category: 1 },
      { id: 4, title: 'Quiz 4', category: null },
    ];

    test('фильтрует по категории', () => {
      const result = filterQuizzesByCategory(mockQuizzes, 1);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    test('возвращает все при null категории', () => {
      const result = filterQuizzesByCategory(mockQuizzes, null);
      expect(result).toHaveLength(4);
    });
  });
});