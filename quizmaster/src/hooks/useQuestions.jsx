import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as api from '../API methods/questionMethods.jsx';

export const useQuestions = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getQuestionById = async (id) => {
        setLoading(true);
        setError(null);

        try {
            const questionData = await api.getQuestionById(id);

            return questionData;
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const createQuestion = async (questionData, token) => {
        setLoading(true);
        setError(null);

        try {
            const question = await api.createQuestion(questionData, token);

            return question;
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const updateQuestion = async (id, questionData, token) => {
        setLoading(true);
        setError(null);

        try {
            const question = await api.updateQuestion(id, questionData, token);

            return question;
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const deleteQuestion = async (id, token) => {
        setLoading(true);
        setError(null);

        try {
            const question = await api.deleteQuestion(id, token);

            return question;
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const getOptionById = async (optionId) => {
        setLoading(true);
        setError(null);

        try {
            const question = await api.getOptionById(optionId);

            return question;
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const getQuestionOptions = async (questionId) => {
        setLoading(true);
        setError(null);

        try {
            const question = await api.getQuestionOptions(questionId);

            return question;
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const createOption = async (questionId, optionData, token) => {
        setLoading(true);
        setError(null);

        try {
            const question = await api.createOption(questionId, optionData, token);

            return question;
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const updateOption = async (optionId, optionData, token) => {
        setLoading(true);
        setError(null);

        try {
            const question = await api.updateOption(optionId, optionData, token);

            return question;
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const deleteOption = async (optionId, token) => {
        setLoading(true);
        setError(null);

        try {
            const question = await api.deleteOption(optionId, token);

            return question;
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const pluralize = (count) => {
        if (count === null || count === undefined) return 'ов';
      
        const mod10 = count % 10;
        const mod100 = count % 100;
      
        if (mod10 === 1 && mod100 !== 11) return '';
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'а';
        return 'ов';
      };

    return {
        getQuestionById,
        createQuestion,
        updateQuestion,
        deleteQuestion,
        getOptionById,
        getQuestionOptions,
        createOption,
        updateOption,
        deleteOption,
        pluralize,
        loading,
        error
    }
}
