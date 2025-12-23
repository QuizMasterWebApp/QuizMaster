import React, { useEffect, useState, useCallback } from 'react';
import { 
    Row, Col, Layout, Typography, Empty, Card, Button, Space, 
    message, Spin, Alert, Tag, Statistic, Descriptions
} from 'antd';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { 
    TrophyOutlined, ClockCircleOutlined, CheckCircleOutlined,
    EyeOutlined, FileTextOutlined, CrownOutlined,
    AppstoreAddOutlined,
    AppstoreOutlined
} from '@ant-design/icons';
import * as api from '../API methods/attemptMethods.jsx';
import * as quizApi from '../API methods/quizMethods.jsx';
import HeaderComponent from '../components/HeaderComponent';
import { useUsers } from '../hooks/useUsers.jsx';
import { useIsPortrait } from '../hooks/usePortain.jsx';

const { Title, Text } = Typography;

export default function CompletedQuizzes() {
    const [bestAttempts, setBestAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const {GetUserIdFromJWT, checkToken} = useUsers();
    const isPortrait = useIsPortrait();

    // Функция для получения лучших попыток
    const getBestAttempts = useCallback((attemptsData) => {
        if (!attemptsData || !Array.isArray(attemptsData)) {
            console.log('Нет данных попыток или не массив:', attemptsData);
            return [];
        }

        // Группируем попытки по quizId
        const attemptsByQuiz = {};
        
        attemptsData.forEach(attempt => {
            const quizId = attempt.quizId;
            
            if (!quizId) {
                console.warn('Попытка без quizId:', attempt);
                return;
            }
            
            if (!attemptsByQuiz[quizId]) {
                attemptsByQuiz[quizId] = [];
            }
            
            attemptsByQuiz[quizId].push(attempt);
        });

        console.log('Сгруппированные попытки по квизам:', attemptsByQuiz);

        // Для каждого квиза находим лучшую попытку
        const bestAttemptsArray = [];
        
        Object.keys(attemptsByQuiz).forEach(quizId => {
            const quizAttempts = attemptsByQuiz[quizId];
            
            if (quizAttempts.length === 0) return;
            
            // Находим лучшую попытку по баллам, а при равных баллах - по дате
            const bestAttempt = quizAttempts.reduce((best, current) => {
                if (!best) return current;

                // Сравниваем баллы (score может быть undefined)
                const bestScore = best.score !== undefined ? best.score : 0;
                const currentScore = current.score !== undefined ? current.score : 0;

                console.log(`Сравнение попыток для quizId ${quizId}:`, {
                    best: {id: best.id, score: bestScore, date: best.completedAt},
                    current: {id: current.id, score: currentScore, date: current.completedAt}
                });

                if (currentScore > bestScore) return current;
                if (currentScore < bestScore) return best;

                // При равных баллах берем самую свежую
                const bestDate = best.completedAt ? new Date(best.completedAt) : new Date(0);
                const currentDate = current.completedAt ? new Date(current.completedAt) : new Date(0);

                return currentDate > bestDate ? current : best;
            }, null);

            if (bestAttempt) {
                bestAttemptsArray.push(bestAttempt);
            }
        });

        console.log('Лучшие попытки:', bestAttemptsArray);

        // Сортируем по дате завершения (самые свежие первыми)
        return bestAttemptsArray.sort((a, b) => {
            const dateA = a.completedAt ? new Date(a.completedAt) : new Date(0);
            const dateB = b.completedAt ? new Date(b.completedAt) : new Date(0);
            return dateB - dateA;
        });
    }, []);


    // Функция для получения сохраненного ключа доступа
    const getSavedAccessKey = (quizId) => {
        return localStorage.getItem(`quiz_access_${quizId}`);
    };

    // Функция для загрузки информации о квизе с учетом приватных ключей
    const loadQuizInfoWithAccess = async (quizId, token) => {
        try {
            // Проверяем, есть ли сохраненный ключ доступа
            const savedAccessKey = getSavedAccessKey(quizId);
            
            if (savedAccessKey) {
                // Пробуем загрузить с сохраненным ключом
                try {
                    const quizInfo = await quizApi.getQuizById(quizId, token, savedAccessKey);
                    console.log(`Квиз ${quizId} загружен с сохраненным ключом`);
                    return { ...quizInfo, hasAccess: true };
                } catch (accessError) {
                    console.warn(`Не удалось загрузить квиз ${quizId} с сохраненным ключом:`, accessError);
                    // Пробуем загрузить без ключа
                }
            }
            
            // Загружаем без ключа (или если ключ не сработал)
            const quizInfo = await quizApi.getQuizById(quizId, token);
            return { ...quizInfo, hasAccess: !quizInfo.isPublic ? false : true };
            
        } catch (error) {
            console.error(`Ошибка загрузки квиза ${quizId}:`, error);
            
            // Если 403 ошибка и есть сохраненный ключ, всё равно создаем базовую информацию
            if (error.response?.status === 403) {
                return {
                    id: quizId,
                    title: `Приватный квиз`,
                    description: 'Доступ ограничен',
                    isPublic: false,
                    questionsCount: 0,
                    timeLimit: null,
                    hasAccess: false
                };
            }
            
            throw error;
        }
    };

    useEffect(() => {
        loadBestAttempts();
    }, []);

    const loadBestAttempts = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await checkToken();
            if (!token) {
                message.warning('Для просмотра пройденных квизов необходимо войти в аккаунт');
                navigate('/login');
                return;
            }
            
            const userId = GetUserIdFromJWT(token);
            if (!userId) {
                throw new Error('Не удалось получить ID пользователя');
            }
            
            console.log('Загрузка попыток для пользователя:', userId);
            
            // Используем правильный метод для получения попыток пользователя
            const attemptsData = await api.getUserAttempts(token, userId);
            console.log('Полученные попытки:', attemptsData);
            
            if (!attemptsData || !Array.isArray(attemptsData)) {
                console.warn('Нет попыток или неправильный формат данных:', attemptsData);
                setBestAttempts([]);
                return;
            }
            
            // Фильтруем только завершенные попытки
            const completedAttempts = attemptsData.filter(attempt => 
                attempt.completedAt && 
                attempt.completedAt !== null &&
                attempt.timeSpent !== '00:00:00'
            );
            
            console.log('Завершенные попытки:', completedAttempts);
            
            if (completedAttempts.length === 0) {
                setBestAttempts([]);
                return;
            }
            
            // Получаем только лучшие попытки для каждого квиза
            const bestAttemptsData = getBestAttempts(completedAttempts);
            
            console.log('Лучшие попытки после фильтрации:', bestAttemptsData);
            
            // Загружаем дополнительную информацию о квизах для каждой лучшей попытки
            const bestAttemptsWithQuizInfo = await Promise.all(
                bestAttemptsData.map(async (attempt) => {
                    try {
                        const savedAccessKey = getSavedAccessKey(attempt.quizId);
                        const quizInfo = await quizApi.getQuizById(attempt.quizId, token, savedAccessKey);
                        return { ...attempt, quizInfo };
                    } catch (err) {
                        console.error(`Ошибка загрузки квиза ${attempt.quizId}:`, err);
                        // Возвращаем попытку без информации о квизе
                        return attempt;
                    }
                })
            );
            
            console.log('Лучшие попытки с информацией о квизах:', bestAttemptsWithQuizInfo);
            setBestAttempts(bestAttemptsWithQuizInfo);
            
        } catch (err) {
            console.error("Ошибка при загрузке попыток:", err);
            setError(err.message || 'Не удалось загрузить пройденные квизы');
            message.error('Не удалось загрузить пройденные квизы');
        } finally {
            setLoading(false);
        }
    };

    const formatTimeSpan = (timeSpan) => {
        if (!timeSpan) return "00:00:00";
        
        if (typeof timeSpan === 'string') {
            const timeWithoutFraction = timeSpan.split('.')[0];
            return timeWithoutFraction;
        }
        
        return "00:00:00";
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Неизвестно";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const getScoreColor = (score, totalQuestions) => {
        if (!totalQuestions || totalQuestions === 0) return '#595959';
        const percentage = (score / totalQuestions) * 100;
        if (percentage >= 80) return '#52c41a';
        if (percentage >= 60) return '#1890ff';
        if (percentage >= 40) return '#faad14';
        return '#ff4d4f';
    };

    return (
        <Layout>
            <div style={{ padding: isPortrait ? '16px 16px' : '24px 24px' }}>
                {/* <Card 
                    style={{ 
                        marginBottom: 24,
                        borderRadius: '8px',
                        backgroundColor: '#f0f2f5'
                    }}
                    bodyStyle={{ padding: '16px 24px' }}
                >
                    <Space>
                        <FileTextOutlined style={{ fontSize: '20px' }} />
                        <Typography.Text style={{ fontSize: '16px' }}>
                            Ваши лучшие результаты по квизам. Показывается только лучшая попытка для каждого квиза.
                        </Typography.Text>
                    </Space>
                </Card> */}

                <Title level={2} style={{marginTop: 0}}>
                    <Space>
                        <CrownOutlined />
                        Лучшие результаты
                    </Space>
                </Title>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Spin size="large" />
                    </div>
                ) : error ? (
                    <Alert
                        message="Ошибка"
                        description={error}
                        type="error"
                        showIcon
                        action={
                            <Button size="small" onClick={loadBestAttempts}>
                                Попробовать снова
                            </Button>
                        }
                    />
                ) : bestAttempts.length === 0 ? (
                    <Empty 
                        description="Вы еще не проходили квизы" 
                        style={{ marginTop: 40 }}
                    >
                        <Button type="primary" onClick={() => navigate('/')}>
                            Перейти к каталогу квизов
                        </Button>
                    </Empty>
                ) : (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Text type="secondary">
                            Ваши лучшие результаты по квизам. Показывается лучшая попытка для каждого квиза.
                        </Text>
                        
                        <Row gutter={[24, 24]}>
                            {bestAttempts.map((attempt, index) => {
                                const quizInfo = attempt.quizInfo;
                                const totalQuestions = quizInfo?.questionsCount || 0;
                                const score = attempt.score !== undefined ? attempt.score : 0;
                                const percentage = totalQuestions 
                                    ? (score / totalQuestions) * 100 
                                    : 0;
                                
                                return (
                                    <Col key={`${attempt.quizId}-${attempt.id}-${index}`} xs={24} sm={12} lg={8}>
                                        <Card
                                            hoverable
                                            style={{ height: '100%' }}
                                            actions={[
                                                <Button
                                                    type="link"
                                                    icon={<EyeOutlined />}
                                                    onClick={() => navigate(`/quiz-result/${attempt.id}`)}
                                                >
                                                    Детали
                                                </Button>,
                                                <Button
                                                    type="link"
                                                    icon={<AppstoreOutlined />}
                                                    onClick={() => navigate(`/quiz/${attempt.quizId}`)}
                                                >
                                                    Квиз
                                                </Button>
                                            ]}
                                            // extra={
                                            //     <Tag color="gold" icon={<CrownOutlined />}>
                                            //         Лучшая попытка
                                            //     </Tag>
                                            // }
                                        >
                                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                                {quizInfo ? (
                                                    <>
                                                        <Title level={4} style={{ margin: 0 }}>
                                                            {quizInfo.title}
                                                        </Title>
                                                        
                                                        {/* {quizInfo.description && (
                                                            <Text type="secondary" ellipsis={{ rows: 2 }}>
                                                                {quizInfo.description}
                                                            </Text>
                                                        )} */}
                                                    </>
                                                ) : (
                                                    <Title level={4} style={{ margin: 0 }}>
                                                        Квиз #{attempt.quizId}
                                                    </Title>
                                                )}
                                                
                                                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                                    <Row gutter={16}>
                                                        <Col span={12}>
                                                            <Statistic
                                                                title="Результат"
                                                                value={score}
                                                                suffix={totalQuestions ? `из ${totalQuestions}` : ''}
                                                                prefix={<TrophyOutlined />}
                                                                valueStyle={{ 
                                                                    color: getScoreColor(score, totalQuestions),
                                                                    fontSize: '24px'
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col span={12}>
                                                            <Statistic
                                                                title="Процент"
                                                                value={percentage.toFixed(1)}
                                                                suffix="%"
                                                                valueStyle={{ 
                                                                    color: getScoreColor(score, totalQuestions),
                                                                    fontSize: '24px'
                                                                }}
                                                            />
                                                        </Col>
                                                    </Row>
                                                    
                                                    <Descriptions column={1} size="small" bordered>
                                                        <Descriptions.Item 
                                                            label={<><ClockCircleOutlined /> Время</>}
                                                        >
                                                            {formatTimeSpan(attempt.timeSpent)}
                                                        </Descriptions.Item>
                                                        <Descriptions.Item 
                                                            label={<><CheckCircleOutlined /> Дата</>}
                                                        >
                                                            {formatDate(attempt.completedAt)}
                                                        </Descriptions.Item>
                                                    </Descriptions>
                                                </Space>
                                            </Space>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    </Space>
                )}
            </div>
        </Layout>
    );
}