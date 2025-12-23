import { useState } from 'react';
import Cookies from 'js-cookie';
import * as api from '../API methods/usersMethods.jsx'; 

export const useUsers = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const userPicture = (userId) => {
        const link = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
        return link
    }

    // Функция авторизации
    const loginUser = async (values) => {
        setLoading(true);
        setError(null);

        try {
            const token = await api.AuthenticateUser(values, false);

            // const refToken = await api.RefreshUserToken(token)

            // Сохраняем токен в cookies
            setTokenToCookie(token);
            localStorage.clear();
            console.log('Вход: ', values);
        }
        catch (error) {
            console.error(`Ошибка входа: `, error);
            throw error;
        }
        finally {
            setLoading(false);
        }
    }

    /** Функция регистрации */ 
    const registerUser = async (values) => {
        setLoading(true);
        setError(null);

        try {
            const token = await api.AuthenticateUser(values, true);

            // Сохраняем токен в cookies
            setTokenToCookie(token);
            console.log('Регистрация: ', values);
        }
        catch (error) {
            console.error(`Ошибка регистрации: `, error);
            throw error;
        }
        finally {
            setLoading(false);
        }
    }

    const isTokenExpired = (token) => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));

            const expiresAt = payload.exp * 1000;
            const now = Date.now();
            const safetyMargin = 1000 * 60 * 15;

            const expired = now + safetyMargin >= expiresAt;

            // console.log('now:', new Date(now).toLocaleString());
            // console.log('expiresAt:', new Date(expiresAt).toLocaleString());
            // console.log('now + margin:', new Date(now + safetyMargin).toLocaleString());
            // console.log('expired:', expired);

            return expired;
        } catch (e) {
            return true;
        }
    };


    const checkToken = async () => {
        const token = Cookies.get('token');
        if (!token) return null;
        
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.warn("истекает  ", payload.exp * 1000)
        console.warn("сравниваем", Date.now() + 1000 * 60 * 15)
        console.log('Токен истек?', isTokenExpired(token));
        console.log('Срок действия:', new Date(payload.exp * 1000).toLocaleString());

        if (!isTokenExpired(token)) {
            return token;
        }

        try {
            const response = await api.RefreshUserToken(token);
            console.log("ПОЛУЧИЛИ", response)
            const newToken = response.accessToken;

            setTokenToCookie(newToken);
            console.warn("Токен обновлён!")
            return newToken;
        } catch (error) {
            console.error(error)
            return null;
        }
    }

    const setTokenToCookie = (token) => {
        Cookies.set('token', token, {
            expires: 1,
            sameSite: 'Strict'
        });
    };

    // Функция выхода
    const logoutUser = () => {
        localStorage.clear();
        // Cookies.remove('token', {
        //     sameSite: 'Strict'
        // });
        Cookies.remove('guestSessionId');
        Cookies.remove('refreshToken');
        Cookies.remove('guest_session_id');
    };

    /**  Получение информации о пользователе */
    const getUserInfo = async (userId) => {
        if (!userId) return null;

        try {
            const userInfo = await api.getUserInfo(userId);
            return userInfo;
                
        } catch (err) {
            console.error('Ошибка получения пользователя:', err);
            return null;
        }
    };

    const getUserByUsername = async (username) => {
        if (!username) return null;

        try {
            const userInfo = await api.getUserByUsername(username);
            return userInfo;
                
        } catch (err) {
            console.error('Ошибка получения пользователя:', err);
            return null;
        }
    };

    const GetUserIdFromJWT = (token) => {
        if (!token) return null;

        try {
            const userId = api.GetUserIdFromJWT(token);
            return userId;
        } catch (err) {
            console.error('Ошибка получения id из токена')
            return null;
        }
    }

    const getUserQuizzes = async (token, userId) => {
        setLoading(true);
        setError(null);
        
        try {
            const quizzesData = await api.getUserQuizzes(token, userId);
            return quizzesData;

        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    /** Сменить пароль */
    const changePassword = async (token, userId, oldPassword, newPassword) => {
        setLoading(true);
        setError(null);
        
        try {
            const updateData = {
                oldPassword: oldPassword,
                password: newPassword
            };
            
            const response = await api.updateUserData(token, userId, updateData);
            return response;
        } catch (err) {
            console.error('Ошибка при смене пароля:', err);
            
            if (err.response?.data) {
                throw new Error(err.response.data);
            }
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /** Сменить логин */
    const changeUsername = async (token, userId, newUsername) => {
        setLoading(true);
        setError(null);
        
        try {
            const updateData = {
                userName: newUsername
            };
            
            const response = await api.updateUserData(token, userId, updateData);
            return response;
        } catch (err) {
            console.error('Ошибка при смене логина:', err);
            
            // Пробрасываем ошибку дальше для обработки в компоненте
            if (err.response?.data) {
                throw new Error(err.response.data);
            }
            throw err;
        } finally {
            setLoading(false);
        }
    }

    return {
        loading,
        error,
        userPicture,
        loginUser,
        registerUser,
        logoutUser,
        checkToken,
        getUserInfo,
        getUserByUsername,
        GetUserIdFromJWT,
        getUserQuizzes,
        changePassword,
        changeUsername
    };
};