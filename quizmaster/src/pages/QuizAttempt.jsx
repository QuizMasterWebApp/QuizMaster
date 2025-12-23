import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Layout, Row, Col, Card, Radio, Checkbox, Button, Space, 
    Typography, Alert, Spin, Divider, Tooltip, Flex, message
} from 'antd';
import { 
    LeftOutlined, 
    QuestionCircleOutlined, CheckCircleOutlined,
    RightOutlined, CheckOutlined, SaveOutlined, ClockCircleOutlined,
    ArrowLeftOutlined
} from '@ant-design/icons';
import Cookies from 'js-cookie';

import { useQuizAttempt } from '../hooks/useQuizAttempt';
import HeaderComponent from '../components/HeaderComponent';
import { useQuizes } from '../hooks/useQuizes';
import { useIsPortrait } from '../hooks/usePortain';
import { useUsers } from '../hooks/useUsers';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function QuizAttempt() {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const { getQuizById } = useQuizes();
    const { checkToken } = useUsers();
    const isPortrait = useIsPortrait();
    
    const {
        attempt,
        quizInfo,
        questions,
        currentQuestion,
        currentQuestionIndex,
        answers,
        currentAnswer,
        loading,
        error,
        timeLeft,
        progress,
        answeredCount,
        visitedQuestions,
        hasTimeLimit,
        startQuizAttempt,
        getAttemptById,
        checkAndRestoreAttempt,
        saveAnswer,
        goToNextQuestion,
        goToPreviousQuestion,
        goToQuestion,
        finishQuizAttempt,
        markQuestionAsVisited,
        cleanup,
        clearAttemptStorage
    } = useQuizAttempt();

    const [submitting, setSubmitting] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // useEffect(() => {
    //     console.log('Таймер обновлен:', timeLeft);
    // }, [timeLeft]);

    // Инициализация попытки при загрузке страницы
    useEffect(() => {
        const initializeAttempt = async () => {
            try {
                const token = await checkToken();
                
                // Пытаемся получить сохраненный ключ доступа
                const storedKey = localStorage.getItem(`quiz_access_${quizId}`);
                const urlAccessKey = new URLSearchParams(window.location.search).get('accessKey');
                const accessKey = storedKey || urlAccessKey;
                
                // Пытаемся восстановить существующую попытку
                const restored = await checkAndRestoreAttempt(quizId, accessKey);
                
                if (!restored) {
                    // Если нет активной попытки, начинаем новую с ключом доступа
                    await startQuizAttempt(token, quizId, accessKey);
                }
                
                setInitialized(true);
            } catch (err) {
                console.error('Ошибка инициализации попытки:', err);
                
                // Если ошибка авторизации, проверяем не приватный ли квиз
                if (err.response?.status === 403 || err.message.includes('доступ')) {
                    message.error('Недостаточно прав для прохождения этого квиза. Возможно, требуется ключ доступа.');
                    // Пробуем получить ключ и перезапустить
                    const storedKey = localStorage.getItem(`quiz_access_${quizId}`);
                    if (storedKey) {
                        message.info('Пробуем с сохраненным ключом...');
                        setTimeout(() => window.location.reload(), 1000);
                    } else {
                        navigate(`/quiz/${quizId}`);
                    }
                } else if (err.message.includes('авторизация') || err.response?.status === 401) {
                    navigate('/login');
                } else {
                    navigate('/');
                }
            }
        };

        if (!initialized) {
            initializeAttempt();
        }

        // Очистка при размонтировании
        return cleanup;
    }, [quizId, initialized]);

    // Проверяем, если время уже истекло при загрузке
    useEffect(() => {
        if (timeLeft === 0 && hasTimeLimit && !submitting) {
          window.alert('Время, отведенное на прохождение викторины, уже истекло. Викторина будет автоматически завершена.');
          handleTimeExpired();
        }
      }, [timeLeft, hasTimeLimit]);

    // Обновляем состояние выбора ответа
    useEffect(() => {
        if (currentQuestion && currentAnswer) {
            const hasAnswer = currentQuestion.type === 0 
                ? currentAnswer.length > 0 
                : currentAnswer.length > 0;
        }
    }, [currentQuestion, currentAnswer]);

    // Отмечаем вопрос как посещенный при загрузке
    useEffect(() => {
        if (currentQuestion) {
            markQuestionAsVisited(currentQuestion.id);
        }
    }, [currentQuestion, markQuestionAsVisited]);

    // Автоматическое завершение при истечении времени
    useEffect(() => {
        if (timeLeft === 0 && hasTimeLimit && initialized && !submitting) {
            handleTimeExpired();
        }
    }, [timeLeft, hasTimeLimit, initialized]);

    // Обработчик выбора ответа
    const handleAnswerSelect = (optionId) => {
        if (!currentQuestion) return;

        let newAnswer;
        
        if (currentQuestion.type === 0) {
            // Одиночный выбор - сохраняем как массив с одним элементом
            newAnswer = [optionId];
        } else {
            // Множественный выбор
            const currentAnswers = currentAnswer || [];
            
            if (currentAnswers.includes(optionId)) {
                // Удаляем, если уже выбран
                newAnswer = currentAnswers.filter(id => id !== optionId);
            } else {
                // Добавляем
                newAnswer = [...currentAnswers, optionId];
            }
        }
        
        saveAnswer(currentQuestion.id, newAnswer);
    };

    // Проверка, выбран ли вариант
    const isOptionSelected = (optionId) => {
        if (!currentAnswer) return false;
        
        if (currentQuestion.type === 0) {
            // Для одиночного выбора проверяем первый элемент массива
            return currentAnswer[0] === optionId;
        } else {
            return currentAnswer.includes(optionId);
        }
    };

    // Обработчик перехода к следующему вопросу
    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            goToNextQuestion();
        } else {
            // Если это последний вопрос, показываем кнопку завершения
            handleFinishQuiz();
        }
    };

    // Обработчик перехода к предыдущему вопросу
    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            goToPreviousQuestion();
        }
    };

    // Завершение квиза (ручное)
    const handleFinishQuiz = async () => {
        if (window.confirm('Вы уверены, что хотите завершить квиз?')) {
            setSubmitting(true);
            try {
                const result = await finishQuizAttempt();
                navigate(`/quiz-result/${result.id}`);
            } catch (err) {
                console.error('Ошибка завершения квиза:', err);
            } finally {
                setSubmitting(false);
            }
        }
    };

    // Автоматическое завершение при истечении времени
    const handleTimeExpired = useCallback(async () => {
        if (submitting) return;
        
        setSubmitting(true);
        try {
          const result = await finishQuizAttempt();
          navigate(`/quiz-result/${result.id}`);
        } catch (err) {
          console.error('Ошибка завершения квиза:', err);
        } finally {
          setSubmitting(false);
        }
      }, [submitting, finishQuizAttempt, navigate]);

      // Кнопка отмены и возврата
    const handleCancelAttempt = () => {
        if (window.confirm('Вы уверены, что хотите прервать прохождение квиза? Все ответы будут потеряны.')) {
            clearAttemptStorage();
            navigate(`/quiz/${quizId}`);
        }
    };

    // Функция для форматирования секунд в ЧЧ:ММ:СС
    const formatTimeToHHMMSS = (seconds) => {
        if (!seconds && seconds !== 0) return "Не ограничено";
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        // Форматируем с ведущими нулями
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = secs.toString().padStart(2, '0');
        
        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    };

    if (loading || !initialized) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh' 
            }}>
                <Spin size="large" tip="Загрузка квиза..." />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 24 }}>
                <Alert
                    title="Ошибка"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <Button size="small" onClick={() => navigate('/')}>
                            На главную
                        </Button>
                    }
                />
            </div>
        );
    }

    if (!currentQuestion && initialized) {
        return (
            <div style={{ padding: 24 }}>
                <Alert
                    title="Нет вопросов"
                    description="В этом квизе пока нет вопросов."
                    type="info"
                    showIcon
                    action={
                        <Button size="small" onClick={() => navigate('/')}>
                            На главную
                        </Button>
                    }
                />
            </div>
        );
    }

    const isLastQuestion = currentQuestionIndex >= questions.length - 1;
    const isQuestionAnswered = currentAnswer && currentAnswer.length > 0;

    // Функция для обрезки названия квиза
    const truncateTitle = (title) => {
        if (!title) return 'Квиз';
        return title.length > 50 ? title.substring(0, 50) + '...' : title;
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* Шапка с таймером и прогрессом */}
            <Header style={{ 
                background: '#ffffff',
                padding: '16px 24px',
                height: 'auto',
                // minHeight: '80px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderBottom: '1px solid #f0f0f0'
            }}>
                <Flex justify="space-between" align='center' style={{ height: '100%' }}>
                    {/* Левая часть - кнопка отмены */}
                    <Button 
                        onClick={handleCancelAttempt}
                        type='link'
                        icon={<ArrowLeftOutlined/>}
                        style={{
                            color: '#8c8c8c',
                            fontWeight: 500,
                            fontSize: '14px',
                            padding: 0,
                            borderRadius: '6px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f5f5f5';
                            e.currentTarget.style.color = '#262626';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#8c8c8c';
                        }}
                    >
                        Вернуться
                    </Button>

                    {/* Центральная часть - название квиза и таймер */}
                    <Flex
                        vertical
                        gap="8px"
                        align="center"
                        style={{
                            textAlign: 'center',
                            flex: 1,
                            minWidth: 0
                        }}
                    >
                        {/* Название квиза */}
                        <Title level={4} style={{ 
                            margin: 0,
                            color: '#262626',
                            fontWeight: 600,
                            fontSize: '20px',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            padding: '0px 8px'
                        }}>
                            {quizInfo?.title || 'Квиз'}
                        </Title>
                        
                        {/* Таймер под названием */}
                        {hasTimeLimit && timeLeft !== null && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <div style={{
                                    fontSize: '18px',
                                    lineHeight: 1,
                                    fontWeight: 600,
                                    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                                    color: timeLeft < 60 ? '#ff4d4f' : 
                                        timeLeft < 300 ? '#faad14' : '#1890ff',
                                    letterSpacing: '0.5px'
                                }}>
                                    {formatTimeToHHMMSS(timeLeft)}
                                </div>
                            </div>
                        )}
                    </Flex>

                    {/* Правая часть - прогресс и отвеченные вопросы */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        background: '#f6ffed',
                        borderRadius: '12px',
                        border: '1px solid #b7eb8f'
                    }}>
                        <CheckCircleOutlined style={{ 
                            color: '#52c41a', 
                            fontSize: '14px' 
                        }} />
                        <Text style={{ 
                            color: '#389e0d',
                            fontSize: '14px',
                            fontWeight: 500 
                        }}>
                            {!isPortrait && 'Отвечено: '} {answeredCount} из {questions.length}
                        </Text>
                    </div>
                </Flex>
            </Header>

            <Layout style={{
                display: 'flex',
                flexDirection: isPortrait ? 'column' : 'row',
                }}>
                {/* Боковая панель с навигацией */}
                <Sider
                    width={isPortrait ? '100%' : 250}
                    style={{
                        background: '#fff',
                        padding: '16px',
                        borderRight: !isPortrait ? '1px solid #f0f0f0' : 'none',
                        borderBottom: isPortrait ? '1px solid #f0f0f0' : 'none',
                    }}
                    >
                    <Title level={5} style={{ marginBottom: 16, marginTop: 0 }}>
                        Навигация по вопросам
                    </Title>
                    
                    <Flex wrap={isPortrait ? 'nowrap' : 'wrap'} 
                        gap='8px' 
                        style={{ 
                            width: '100%',
                            overflowX: isPortrait ? 'auto' : 'visible', // горизонтальная прокрутка
                            paddingBottom: isPortrait ? 8 : 0
                        }}>
                        {questions.map((question, index) => {
                            const isAnswered = answers[question.id] && answers[question.id].length > 0;
                            const isCurrent = currentQuestionIndex === index;
                            // const isVisited = visitedQuestions.has(question.id);
                            
                            let buttonType = "dashed";
                            let backgroundColor = undefined;
                            let borderColor = undefined;
                            
                            if (isCurrent) {
                                buttonType = "primary";
                            } else if (isAnswered) {
                                buttonType = "default";
                                backgroundColor = '#d9f7be';
                                borderColor = '#52c41a';
                            }
                            // } else if (isVisited) {
                            //     buttonType = "default";
                            //     backgroundColor = '#fff7e6';
                            //     borderColor = '#faad14';
                            // }
                            
                            return (
                                <Tooltip 
                                    key={question.id} 
                                    title={
                                        isAnswered ? "Ответ дан" : 
                                        "Ответа нет"
                                    }
                                >
                                    <Button
                                        type={buttonType}
                                        shape="circle"
                                        size="large"
                                        onClick={() => goToQuestion(index)}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            marginBottom: 8,
                                            backgroundColor,
                                            borderColor,
                                            flex: '0 0 auto',
                                        }}
                                    >
                                        {index + 1}
                                        {isAnswered && !isCurrent && (
                                            <CheckOutlined style={{ fontSize: 10, marginLeft: 2 }} />
                                        )}
                                    </Button>
                                </Tooltip>
                            );
                        })}
                    </Flex>
                    
                    {!isPortrait && 
                    <>
                            <Divider style={{ margin: '16px 0' }} />

                            <Space direction="vertical" style={{ width: '100%' }}>
                            {/* <Text type="secondary" style={{ fontSize: 12 }}>
                                <span style={{ color: '#52c41a' }}>●</span> Ответ дан<br />
                                <span style={{ color: '#faad14' }}>●</span> Просмотрен<br />
                                <span style={{ color: '#d9d9d9' }}>●</span> Не просмотрен
                            </Text> */}
                            
                            <Button
                                type="primary"
                                danger
                                size='large'
                                onClick={handleFinishQuiz}
                                loading={submitting}
                                icon={<CheckCircleOutlined />}
                                block
                                style={{ marginTop: 8 }}
                            >
                                Завершить квиз
                            </Button>
                            </Space>
                    </>}
                </Sider>

                {/* Основное содержимое с вопросом */}
                <Content style={{ padding: isPortrait ? '16px': '24px', width: isPortrait && '100%' }}>
                    <Card
                        title={
                            <Space>
                                <QuestionCircleOutlined />
                                <Text strong>Вопрос {progress.current}</Text>
                                <Text type="secondary" style={{ fontSize: 14 }}>
                                    ({currentQuestion?.type === 0 ? 'Одиночный выбор' : 'Множественный выбор'})
                                </Text>
                            </Space>
                        }
                        styles={{
                            body: { padding: isPortrait && 16 }
                        }}
                        extra={
                            <Space>
                                {isQuestionAnswered && (
                                    <Space>
                                        <SaveOutlined style={{ color: '#52c41a' }} />
                                        <Text type="success">{!isPortrait && 'Ответ сохранен'}</Text>
                                    </Space>
                                )}
                            </Space>
                        }
                    >
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <Paragraph style={{ fontSize: '18px', marginBottom: 24 }}>
                                {currentQuestion?.text}
                            </Paragraph>

                            <Space direction="vertical" style={{ width: '100%' }}>
                                {currentQuestion?.options?.map(option => (
                                    <Card
                                        key={option.id}
                                        hoverable
                                        onClick={() => handleAnswerSelect(option.id)}
                                        style={{
                                            marginBottom: 8,
                                            border: isOptionSelected(option.id) 
                                                ? '2px solid #1890ff' 
                                                : '1px solid #d9d9d9',
                                            background: isOptionSelected(option.id) 
                                                ? '#e6f7ff' 
                                                : '#fff',
                                            transition: 'all 0.2s',
                                            cursor: 'pointer'
                                        }}
                                        bodyStyle={{ padding: 12 }}
                                    >
                                        <Space>
                                            {currentQuestion.type === 0 ? (
                                                <Radio checked={isOptionSelected(option.id)} />
                                            ) : (
                                                <Checkbox checked={isOptionSelected(option.id)} />
                                            )}
                                            <Text style={{ fontSize: '16px' }}>
                                                {option.text}
                                            </Text>
                                        </Space>
                                    </Card>
                                ))}
                            </Space>

                            {/* Улучшенные кнопки навигации */}
                            <Row
                                gutter={12}
                                justify="space-between"
                                style={{ marginTop: 32 }}
                            >
                                {/* Назад */}
                                <Col span={isPortrait ? 12 : undefined}>
                                    <Button
                                        icon={<LeftOutlined />}
                                        onClick={handlePreviousQuestion}
                                        disabled={currentQuestionIndex === 0}
                                        size="large"
                                        block={isPortrait}
                                        style={{
                                            borderRadius: 12,
                                            height: isPortrait ? 48 : undefined,
                                        }}
                                    >
                                        Предыдущий
                                    </Button>
                                </Col>

                                {/* Далее / Готово */}
                                <Col span={isPortrait ? 12 : undefined}>
                                    {!isLastQuestion ? (
                                        <Button
                                            type="primary"
                                            onClick={handleNextQuestion}
                                            size="large"
                                            block={isPortrait}
                                            style={{
                                                borderRadius: 12,
                                                height: isPortrait ? 48 : undefined,
                                                fontWeight: 600,
                                            }}
                                        >
                                            Следующий <RightOutlined />
                                        </Button>
                                    ) : (
                                        <Button
                                            type="primary"
                                            icon={<CheckCircleOutlined />}
                                            onClick={handleFinishQuiz}
                                            loading={submitting}
                                            size="large"
                                            block={isPortrait}
                                            style={{
                                                borderRadius: 12,
                                                height: isPortrait ? 48 : undefined,
                                                fontWeight: 600,
                                            }}
                                        >
                                            Завершить
                                        </Button>
                                    )}
                                </Col>
                            </Row>




                            {/* Информация о прогрессе */}
                            <Divider style={{ margin: '16px 0' }} />
                            
                            <Row justify="center">
                                <Col>
                                    <Text type="secondary">
                                        Отвечено вопросов: {answeredCount} из {questions.length}
                                    </Text>
                                </Col>
                            </Row>
                        </Space>

                        
                    </Card>

                    {isPortrait && 
                    <>
                            <Divider style={{ margin: '16px 0' }} />

                            <Space direction="vertical" style={{ width: '100%' }}>
                            {/* <Text type="secondary" style={{ fontSize: 12 }}>
                                <span style={{ color: '#52c41a' }}>●</span> Ответ дан<br />
                                <span style={{ color: '#faad14' }}>●</span> Просмотрен<br />
                                <span style={{ color: '#d9d9d9' }}>●</span> Не просмотрен
                            </Text> */}
                            
                            <Button
                                type="primary"
                                danger
                                size='large'
                                onClick={handleFinishQuiz}
                                loading={submitting}
                                icon={<CheckCircleOutlined />}
                                block
                                style={{ marginTop: 8 }}
                            >
                                Завершить квиз
                            </Button>
                            </Space>
                    </>}
                </Content>
            </Layout>
        </Layout>
    );
}