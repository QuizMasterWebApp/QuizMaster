import React, { useState, useEffect, useCallback } from 'react';
import * as quizApi from '../API methods/quizMethods.jsx';
import Cookies from 'js-cookie';

export const usePrivateQuizAccess = () => {
    const [hasAccess, setHasAccess] = useState(false);
    const [accessKey, setAccessKey] = useState('');
    const [loading, setLoading] = useState(true);
    
    /** Выдать доступ (записать в локал сторадж) */
    const grantAccess = async (quizId, key) => {
        try {
            // Используем API для проверки ключа
            const response = await quizApi.connectToQuizByCode(key.toUpperCase());
            
            // Проверяем, что ключ подходит для этого квиза
            if (parseInt(response.quizId) === parseInt(quizId)) {
                // Сохраняем ключ в localStorage
                setSavedAccessKey(quizId, key);
                setHasAccess(true);
                setAccessKey(key.toUpperCase());
                return {
                    success: true,
                    quizInfo: response
                };
            } else {
                // Ключ не подходит для этого квиза
                throw new Error('Ключ не подходит для этого квиза');
            }
        } catch (error) {
            console.error('Ошибка предоставления доступа:', error);
            
            // Если это 403 ошибка, всё равно сохраняем ключ
            if (error.response?.status === 403) {
                console.log('403 ошибка, но сохраняем ключ для локального использования');
                localStorage.setItem(`quiz_access_${quizId}`, key.toUpperCase());
                setHasAccess(true);
                setAccessKey(key.toUpperCase());
                return {
                    success: true,
                    quizInfo: { quizId: parseInt(quizId) }
                };
            }
            
            throw error;
        }
    };

    /**Сохранить ключ доступа */
    const setSavedAccessKey = (quizId, key) => {
        localStorage.setItem(`quiz_access_${quizId}`, key.toUpperCase());
    }

    // Функция для получения сохраненного ключа доступа
    const getSavedAccessKey = (quizId) => {
        return localStorage.getItem(`quiz_access_${quizId}`);
    };

    // Обновляем метод checkAccess
    const checkAccess = async (quizId) => {
        setLoading(true);
        try {
            // Проверяем, есть ли сохраненный ключ доступа
            const storedKey = getSavedAccessKey(quizId);
            
            if (storedKey) {
                // Проверяем валидность ключа через метод подключения
                try {
                    const response = await quizApi.connectToQuizByCode(storedKey);
                    if (parseInt(response.quizId) === parseInt(quizId)) {
                        // Ключ валиден
                        setHasAccess(true);
                        setAccessKey(storedKey);

                        return storedKey;
                    } else {
                        // Ключ не подходит для этого квиза
                        localStorage.removeItem(`quiz_access_${quizId}`);
                        setHasAccess(false);
                        setAccessKey('');
                    }
                } catch (error) {
                    // Если 403 ошибка, всё равно считаем ключ валидным
                    if (error.response?.status === 403) {
                        console.log('403 ошибка при проверке ключа, но ключ сохранен');
                        setHasAccess(true);
                        setAccessKey(storedKey);

                        return storedKey;
                    } else {
                        // Ключ недействителен
                        console.warn('Недействительный ключ доступа:', error);
                        localStorage.removeItem(`quiz_access_${quizId}`);
                        setHasAccess(false);
                        setAccessKey('');
                    }
                }
            } else {
                setHasAccess(false);
                setAccessKey('');
            }
        } catch (error) {
            console.error('Ошибка проверки доступа:', error);
            setHasAccess(false);
            setAccessKey('');
        } finally {
            setLoading(false);
        }
    }
    
    // useEffect(() => {
    //     checkAccess();
    // }, [quizId]);
    
    /** Убрать доступ к квизу */
    const revokeAccess = (quizId) => {
        localStorage.removeItem(`quiz_access_${quizId}`);
        setHasAccess(false);
        setAccessKey('');
    };
    
    /** Скопировать ключ доступа */
    const copyAccessKey = () => {
        if (accessKey) {
            navigator.clipboard.writeText(accessKey);
            return true;
        }
        return false;
    };
    
    return {
        hasAccess,
        accessKey,
        loading,
        grantAccess,
        revokeAccess,
        copyAccessKey,
        checkAccess,
        setHasAccess, // Экспортируем сеттер
        setAccessKey,
        setSavedAccessKey,
        getSavedAccessKey
    };
};