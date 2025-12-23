import { useState, useCallback } from 'react';
import * as api from '../API methods/categoryMethods.jsx';

export const useCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Загрузка всех категорий
    const loadCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const categoriesData = await api.getAllCategories();
            setCategories(categoriesData);
            return categoriesData;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Получение категории по ID
    const getCategory = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        
        try {
            const categoryData = await api.getCategoryById(id);
            return categoryData;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Получение квизов по категории
    const getCategoryQuizzes = useCallback(async (categoryName) => {
        setLoading(true);
        setError(null);
        
        try {
            const quizzes = await api.getQuizzesByCategory(categoryName);
            return quizzes;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        categories,
        loading,
        error,
        loadCategories,
        getCategory,
        getCategoryQuizzes
    };
};