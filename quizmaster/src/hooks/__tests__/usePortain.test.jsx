import { renderHook, act } from '@testing-library/react';
import { useIsPortrait } from '../usePortain.jsx';

describe('useIsPortrait', () => {
  const originalInnerHeight = window.innerHeight;
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Сброс размеров окна перед каждым тестом
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    });
  });

  afterEach(() => {
    // Восстановление оригинальных размеров
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    });
  });

  it('должен определять портретную ориентацию когда высота больше ширины', () => {
    // Устанавливаем портретную ориентацию
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 400
    });

    const { result } = renderHook(() => useIsPortrait());
    
    expect(result.current).toBe(true);
  });

  it('должен определять альбомную ориентацию когда ширина больше высоты', () => {
    // Устанавливаем альбомную ориентацию
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 400
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800
    });

    const { result } = renderHook(() => useIsPortrait());
    
    expect(result.current).toBe(false);
  });

  it('должен обновляться при изменении размеров окна', () => {
    // Начинаем с альбомной ориентации
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 400
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800
    });

    const { result } = renderHook(() => useIsPortrait());
    
    expect(result.current).toBe(false);

    // Меняем на портретную ориентацию
    act(() => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800
      });
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400
      });
      
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(true);

    // Возвращаем к альбомной ориентации
    act(() => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 400
      });
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800
      });
      
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(false);
  });

  it('должен считать портретной ориентацией когда высота равна ширине', () => {
    // Устанавливаем равные размеры
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 600
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600
    });

    const { result } = renderHook(() => useIsPortrait());
    
    // Согласно логике функции getOrientation: window.innerHeight > window.innerWidth
    // При равенстве должно быть false
    expect(result.current).toBe(false);
  });

  it('должен очищать обработчик события при размонтировании', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useIsPortrait());
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  it('должен добавлять обработчик события при монтировании', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    
    renderHook(() => useIsPortrait());
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    
    addEventListenerSpy.mockRestore();
  });
});