import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    useParams, 
    useNavigate, 
    useSearchParams,
    useLocation
} from 'react-router-dom';
import { 
    Layout, Row, Col, Card, Typography, Button, Space, 
    Tag, Divider, Spin, Alert, Collapse, Table, Avatar, 
    message, Skeleton, Flex, Modal, Form, Input, 
    Badge, Tooltip, Progress, Descriptions, Statistic,
    Tabs, Radio, Dropdown, Menu
} from 'antd';
import { 
    ClockCircleOutlined, UserOutlined, QuestionCircleOutlined,
    TrophyOutlined, PlayCircleOutlined, ArrowLeftOutlined,
    CrownOutlined, TeamOutlined, LoadingOutlined, 
    CopyOutlined, LockOutlined, EyeOutlined,
    GlobalOutlined, KeyOutlined, ExclamationCircleOutlined,
    BarChartOutlined, EditOutlined, ShareAltOutlined,
    HeartOutlined, MessageOutlined, DownloadOutlined,
    CheckCircleOutlined,
    AppstoreOutlined
} from '@ant-design/icons';
import Cookies from 'js-cookie';

// Методы
import { useQuizes } from '../hooks/useQuizes';
import { useUsers } from '../hooks/useUsers';
import { useQuestions } from '../hooks/useQuestions';
import { useIsPortrait } from '../hooks/usePortain';
import { useQuizAttempt } from '../hooks/useQuizAttempt';
import { usePrivateQuizAccess } from '../hooks/usePrivateQuizAccess';
import { GetUserIdFromJWT, getUserQuizzes } from '../API methods/usersMethods';
import { getCategoryName, getCategoryColor } from '../utils/categoryUtils'

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

const QuizDetail = () => {
    const { quizId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { getQuizById, connectToQuizByCode } = useQuizes();
    const { getUserInfo, userPicture, checkToken } = useUsers();
    const { pluralize } = useQuestions();
    const { getLeaderboard } = useQuizAttempt();
    const isPortrait = useIsPortrait();
    
    // Основные состояния
    const [quiz, setQuiz] = useState(null);
    const [author, setAuthor] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingAuthor, setLoadingAuthor] = useState(false);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    
    // Состояния для приватных квизов
    const [accessKeyInput, setAccessKeyInput] = useState('');
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [accessKeyLoading, setAccessKeyLoading] = useState(false);
    
    // Используем хук для управления доступом
    const { 
        hasAccess, 
        accessKey, 
        loading: accessLoading, 
        grantAccess, 
        revokeAccess,
        copyAccessKey
    } = usePrivateQuizAccess();
    
    // Вкладки
    const [activeTab, setActiveTab] = useState('overview');
    const [userId, setUserId] = useState(null);

    // Проверяем авторизацию и загружаем данные
    useEffect(() => {
        checkAuth();
        loadQuizDetails();
    }, [quizId]);

    const checkAuth = async () => {
        const token = await checkToken();
        console.log("токен", token)
        if (token) {
            const userIdData = GetUserIdFromJWT(token);
            // console.log("CERRFFF", userIdData)
            setIsAuthenticated(true);
            setUserId(userIdData)
        } else {
            setIsAuthenticated(false);
        }
    }

    const loadAuthorInfo = async (userId) => {
        if (!userId) {
            setAuthor(null);
            return;
        }

        setLoadingAuthor(true);
        try {
            const authorInfo = await getUserInfo(userId);
            setAuthor(authorInfo);
        } catch (error) {
            console.warn('Не удалось загрузить информацию об авторе:', error);
            setAuthor(null);
        } finally {
            setLoadingAuthor(false);
        }
    };

    const loadQuizDetails = async () => {
    setLoading(true);
    try {
        const token = await checkToken();
        let myAccessKey

        const userIdData = GetUserIdFromJWT(token);
        if (userIdData) {
            const quizzes = await getUserQuizzes(token, userIdData);
            const quiz = quizzes.find(q => q.id == quizId);
            // const quiz = await getQuizById(quizId, token);
            console.log("Q ID", userIdData  )
            console.log("НАЙДЕНЫЙ", quiz)

            if (quiz && userIdData == quiz.authorId) {
                myAccessKey = quiz.privateAccessKey
            }
        } 
        
        // if (quiz) {
            
        //     myAccessKey = quiz.privateAccessKey
        // }

        // ШАГ 1: Проверяем, есть ли уже сохраненный ключ в хуке или в localStorage
        // В вашем хуке usePrivateQuizAccess ключ лежит в переменной accessKey
        const currentKey = myAccessKey || accessKey || localStorage.getItem(`quiz_access_${quizId}`);
        
        let quizData;
        
        // ШАГ 2: Вызываем getQuizById, ОБЯЗАТЕЛЬНО передавая currentKey третьим аргументом
        // Если ключ есть — сервер отдаст полные данные, если нет — только заглушку
        if (currentKey) {
            console.log("КВИЗ ПО КОДУ", currentKey)
            quizData = await getQuizById(quizId, token, currentKey);
        }
        else {
            quizData = await getQuizById(quizId, token);
        }
        
        console.log('Данные квиза:', quizData);
        
        // Если сервер всё равно говорит, что квиз приватный и данных нет (hasAccess еще не обновился)
        if (quizData && !quizData.isPublic && !currentKey) {
            setQuiz({
                id: quizData.id,
                isPublic: false,
                isDeleted: false,
                title: 'Приватный квиз',
                description: 'Для просмотра этого квиза требуется специальный доступ',
                questionsCount: 0,
                timeLimit: quizData.timeLimit || null
            });
            setLeaderboard([]);
            setLoading(false);
            return;
        }
        
        // Если ключ сработал или квиз публичный — сохраняем полные данные
        setQuiz(quizData);
        
        // Теперь автор и лидерборд загрузятся правильно, так как у нас есть данные из quizData
        const authorId = quizData.authorId;
        if (authorId) {
            await loadAuthorInfo(authorId);
        }
        
        if (quizData.isPublic || currentKey) {
            await loadLeaderboard();
        }
            
        } catch (error) {
            console.error('Ошибка при загрузке квиза:', error);
            
            if (error.response?.status === 403 || error.response?.status === 401) {
                message.error('Нет доступа к этому квизу');
                // Создаем объект квиза для отображения
                setQuiz({
                    id: quizId,
                    title: 'Приватный квиз',
                    description: 'Для просмотра этого квиза требуется специальный доступ',
                    isPublic: false,
                    isDeleted: false,
                    questionsCount: 0
                });
                setLeaderboard([]);
            } else {
                message.error('Не удалось загрузить информацию о квизе');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadLeaderboard = async () => {
        setLeaderboardLoading(true);
        try {
            const token = await checkToken();
            const guestSessionId = Cookies.get('guestSessionId');
            setSessionId(guestSessionId)
            
            // Для приватных квизов передаем ключ доступа
            let leaderboardData;
            if (quiz && !quiz.isPublic) {
                // Используем специальный endpoint или параметр
                leaderboardData = await getLeaderboard(quizId, token, guestSessionId);
            } else {
                leaderboardData = await getLeaderboard(quizId, token, guestSessionId);
            }
            
            console.log('Лидерборд загружен:', leaderboardData);
            setLeaderboard(leaderboardData);
        } catch (error) {
            console.error('Ошибка при загрузке лидерборда:', error);
            setLeaderboard([]);
        } finally {
            setLeaderboardLoading(false);
        }
    };

   const handleStartQuiz = () => {
        // 1. Базовая проверка на существование квиза
        if (!quiz || quiz.isDeleted) {
            message.error('Невозможно начать прохождение квиза');
            return;
        }
        
        // 2. Получаем актуальный ключ (из состояния хука или напрямую из хранилища)
        const currentKey = accessKey || localStorage.getItem(`quiz_access_${quizId}`);
        
        // 3. Проверяем доступ для приватных квизов
        // Если квиз приватный и у нас нет ключа ни в памяти, ни в localStorage
        if (!quiz.isPublic && !hasAccess && !currentKey) {
            message.warning('Для прохождения этого квиза требуется ключ доступа');
            setShowAccessModal(true);
            return;
        }
        
        // 4. Выполняем переход
        if (!quiz.isPublic && currentKey) {
            // Если квиз приватный, обязательно прокидываем ключ в URL
            navigate(`/quiz/${quizId}/attempt?accessKey=${currentKey}`);
        } else {
            // Если публичный — обычный переход
            navigate(`/quiz/${quizId}/attempt`);
        }
    };

    const formatTime = (timeString) => {
        if (!timeString || timeString === "00:00:00") {
            return "—";
        }
        
        try {
            if (typeof timeString === 'string' && timeString.includes(':')) {
                const parts = timeString.split(':');
                if (parts.length === 3) {
                    const hours = parseInt(parts[0]) || 0;
                    const minutes = parseInt(parts[1]) || 0;
                    const seconds = parseInt(parts[2]) || 0;
                    
                    if (hours > 0) {
                        return `${hours}ч ${minutes}м ${seconds}с`;
                    } else if (minutes > 0) {
                        return `${minutes}м ${seconds}с`;
                    } else {
                        return `${seconds} сек`;
                    }
                }
            }
            
            return timeString.toString();
        } catch (error) {
            console.error('Ошибка форматирования времени:', error);
            return "Без ограничений по времени";
        }
    };

    const handleCopy = async (text) => {
        await navigator.clipboard.writeText(text);
        message.success('Текст скопирован');
    };

    // Функции для работы с ключами доступа
    const handleGrantAccess = async (key = null) => {
    const keyToUse = key || accessKeyInput;
    
    setAccessKeyLoading(true);
    try {
        const success = await grantAccess(keyToUse.toUpperCase());
        if (success) {
            message.success('Доступ предоставлен!');
            setShowAccessModal(false);
            setAccessKeyInput('');
            
            // Перезагружаем данные квиза с новым доступом
            await loadQuizDetails();
        }
        } catch (error) {
            console.error('Ошибка предоставления доступа:', error);
            message.error('Ошибка предоставления доступа. Проверьте ключ.');
        } finally {
            setAccessKeyLoading(false);
        }
    };

    const handleRevokeAccess = () => {
        Modal.confirm({
            title: 'Отозвать доступ?',
            icon: <ExclamationCircleOutlined />,
            content: 'Вы потеряете доступ к этому приватному квизу. Для повторного доступа потребуется ключ.',
            okText: 'Отозвать',
            cancelText: 'Отмена',
            okButtonProps: { danger: true },
            onOk: () => {
                revokeAccess();
                message.success('Доступ отозван');
                loadQuizDetails();
            }
        });
    };

    const handleShare = async () => {
        try {
            const shareData = {
                title: quiz?.title || 'Квиз',
                text: quiz?.description || 'Интересный квиз',
                url: window.location.href,
            };
            
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                message.success('Ссылка скопирована в буфер обмена');
            }
        } catch (error) {
            console.error('Ошибка при попытке поделиться:', error);
        }
    };

    // Столбцы для таблицы лидерборда
    const leaderboardColumns = [
        {
            title: 'Место',
            key: 'position',
            render: (_, __, index) => {
                const position = index + 1;
                if (position === 1) {
                    return <CrownOutlined style={{ color: '#FFD700', fontSize: '20px' }} />;
                } else if (position === 2) {
                    return <CrownOutlined style={{ color: '#C0C0C0', fontSize: '18px' }} />;
                } else if (position === 3) {
                    return <CrownOutlined style={{ color: '#CD7F32', fontSize: '16px' }} />;
                }
                return <span style={{ fontWeight: 'bold' }}>{position}</span>;
            },
            width: 100,
            align: 'center',
        },
        {
            title: 'Участник',
            key: 'user',
            render: (record) => (
                <Space>
                    <div>
                        <div style={{ fontWeight: '500', fontSize: '16px' }}>
                            {record.userName === 'Guest' ? 'Гость' : record.userName}
                        </div>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Результат',
            key: 'score',
            dataIndex: 'score',
            render: (score) => {
                let color = 'default';
                if (score === 0) color = 'red';
                
                return (
                    <Tag 
                        color={color} 
                        style={{ 
                            fontSize: '14px', 
                            fontWeight: 'bold',
                            minWidth: '60px',
                            textAlign: 'center'
                        }}
                    >
                        {score}
                    </Tag>
                );
            },
            align: 'center',
        },
        {
            title: 'Время',
            key: 'time',
            dataIndex: 'timeSpent',
            render: (time) => (
                <Space>
                    <span>{formatTime(time)}</span>
                </Space>
            ),
            align: 'center',
        },
    ];

    if (loading) {
        return (
            <Layout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <Spin size="large" tip="Загрузка информации о квизе..." />
                </div>
            </Layout>
        );
    }

    if (!quiz) {
        return (
            <Layout>
                <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
                    <Alert
                        title="Квиз не найден"
                        description="Возможно, квиз был удален или у вас нет к нему доступа. Проверьте, правильно ли указан URL или вернитесь на главную страницу."
                        type="error"
                        showIcon
                        action={
                            <Space orientation="vertical">
                                <Button type="primary" onClick={() => navigate('/')}>
                                    На главную
                                </Button>
                                <Button onClick={() => window.location.reload()}>
                                    Обновить страницу
                                </Button>
                            </Space>
                        }
                    />
                </div>
            </Layout>
        );
    }

    const isOwner = userId && quiz.authorId === userId;

    // Рендер кнопки "Начать прохождение"
    const renderStartButton = () => {
        if (quiz.isDeleted) {
            return (
                <Button
                    type="primary"
                    disabled
                    size="large"
                    icon={<PlayCircleOutlined />}
                >
                    Квиз удалён
                </Button>
            );
        }

        if (!quiz.isPublic && !hasAccess) {
            return (
                <Button
                    type="primary"
                    size="large"
                    icon={<LockOutlined />}
                    onClick={() => setShowAccessModal(true)}
                    style={{ 
                        backgroundColor: '#ff4d4f',
                        borderColor: '#ff4d4f',
                        boxShadow: '0 4px 12px rgba(255, 77, 79, 0.4)'
                    }}
                >
                    Получить доступ
                </Button>
            );
        }

        return (
            <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleStartQuiz}
                style={{ 
                    boxShadow: '0 4px 12px rgba(24, 144, 255, 0.4)'
                }}
            >
                Начать прохождение
            </Button>
        );
    };

    // Рендер информации о доступе
    const renderAccessInfo = () => {
        if (!quiz.isPublic && hasAccess) {
            return (
                <Alert
                    message="Доступ предоставлен по ключу"
                    description={
                        <Space direction="vertical" size="small">
                            <Space>
                                <Tag icon={<KeyOutlined />} color="green">
                                    Ключ: {accessKey}
                                </Tag>
                                <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<CopyOutlined />}
                                    onClick={() => {
                                        if (copyAccessKey()) {
                                            message.success('Ключ скопирован');
                                        }
                                    }}
                                >
                                    Копировать
                                </Button>
                                <Button 
                                    type="text" 
                                    size="small" 
                                    danger
                                    icon={<LockOutlined />}
                                    onClick={handleRevokeAccess}
                                >
                                    Отозвать доступ
                                </Button>
                            </Space>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                Ключ сохранен в вашем браузере
                            </Text>
                        </Space>
                    }
                    type="success"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            );
        }

        // if (!quiz.isPublic && !hasAccess) {
        //     return (
        //         <Alert
        //             message="Приватный квиз"
        //             description={
        //                 <Space direction="vertical" size="small">
        //                     <Text>Для доступа к этому квизу требуется специальный ключ.</Text>
        //                     <Button 
        //                         type="dashed" 
        //                         size="small"
        //                         icon={<KeyOutlined />}
        //                         onClick={() => setShowAccessModal(true)}
        //                     >
        //                         Ввести ключ доступа
        //                     </Button>
        //                 </Space>
        //             }
        //             type="warning"
        //             showIcon
        //             style={{ marginBottom: 16 }}
        //         />
        //     );
        // }

        return null;
    };

    return (
        <Layout>
            <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                {/* Кнопка назад */}
                <Button 
                    type="link" 
                    icon={<ArrowLeftOutlined />} 
                    onClick={() => navigate('/')}
                    style={{ marginBottom: 16, paddingLeft: 0 }}
                >
                    Вернуться к каталогу
                </Button>

                {/* Информация о доступе */}
                {renderAccessInfo()}

                {/* Основная информация о квизе */}
                <Card 
                    style={{ 
                        marginBottom: 24,
                        borderRadius: 12,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                    styles={{
                        body: { padding: isPortrait && 16 }
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                                <Flex justify='space-between' wrap gap='middle'>
                                    <Title level={2} style={{ margin: 0 }}>
                                        {quiz.title}
                                        {!quiz.isPublic && (
                                            <Tag 
                                                color="orange"
                                                icon={<LockOutlined />}
                                                style={{ fontSize: 14, marginLeft: 8, padding: 6 }}
                                            >
                                                Приватный
                                            </Tag>
                                        )}
                                    </Title>
                                </Flex>
                                
                                {/* Предупреждение, что квиз удалён */}
                                {quiz.isDeleted && 
                                    <Alert
                                        title="Квиз удалён"
                                        description="Этот квиз был удалён, поэтому пройти его уже не получится."
                                        type='error'
                                        showIcon
                                    />
                                }

                                {/* Описание */}
                                {quiz.description && 
                                    <Collapse 
                                        bordered={false} 
                                        defaultActiveKey={['1']}
                                        style={{ padding: '0'}}
                                    >
                                        <Panel 
                                            header={
                                                <Text strong style={{ fontSize: '16px' }}>
                                                    Описание квиза
                                                </Text>
                                            } 
                                            key="1"
                                            style={{ padding: 0, border: 'none' }}
                                        >
                                            <Paragraph style={{ margin: 0, fontSize: '15px', lineHeight: 1.6 }}>
                                                {quiz.description}
                                            </Paragraph>
                                        </Panel>
                                    </Collapse>
                                }
                            </Space>
                        </div>
                        
                        {/* Начать прохождение */}
                        {!quiz.isDeleted && <Button
                                type="primary"
                                size="large"
                                icon={<PlayCircleOutlined />}
                                onClick={handleStartQuiz}
                                style={{ 
                                    // height: '56px', 
                                    // padding: '0 48px',
                                    // fontSize: '18px',
                                    boxShadow: '0 4px 12px rgba(24, 144, 255, 0.4)'
                                }}
                            >
                                Начать прохождение
                            </Button>}
                        
                        <Row gutter={[16, 16]}>
                            {/* Информация об авторе */}
                            <Col xs={24} sm={12} md={6}>
                                <Card 
                                    size="small" 
                                    style={{ 
                                        height: '100%',
                                        border: '1px solid #e8e8e8',
                                        borderRadius: 8
                                    }}
                                >
                                    <Space orientation="vertical" size="small">
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            <UserOutlined style={{ marginRight: 4 }} />
                                            Автор квиза
                                        </Text>
                                        <Space align="center">
                                            <Avatar 
                                                size="middle"
                                                src={author?.id ? userPicture(author.id) : null}
                                                icon={<UserOutlined />}
                                                style={{ 
                                                    backgroundColor: author?.id ? '#1890ff' : '#ccc',
                                                    fontSize: '20px'
                                                }}
                                            />
                                            <div>
                                                <Text strong style={{ display: 'block', fontSize: '16px' }}>
                                                    {author?.name || 'Неизвестный автор'}
                                                </Text>
                                            </div>
                                        </Space>
                                    </Space>
                                </Card>
                            </Col>
                            
                            {/* Количество вопросов */}
                            <Col xs={24} sm={12} md={6}>
                                <Card 
                                    size="small" 
                                    style={{ 
                                        height: '100%',
                                        border: '1px solid #e8e8e8',
                                        borderRadius: 8
                                    }}
                                >
                                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            <QuestionCircleOutlined style={{ marginRight: 4 }} />
                                            Количество вопросов
                                        </Text>
                                        <Space align='baseline' style={{ justifyContent: 'left', width: '100%' }}>
                                            {quiz.questionsCount !== 0 ? <>
                                                <Text strong style={{ fontSize: '24px' }}>
                                                    {quiz.questionsCount}
                                                </Text>
                                                <Text style={{ fontSize: '14px' }}>
                                                    вопрос{pluralize(quiz.questionsCount)}
                                                </Text></> 
                                            : <Text style={{ fontSize: '18px' }}>
                                                Нет вопросов
                                            </Text>}
                                        </Space>
                                    </Space>
                                </Card>
                            </Col>
                            
                            {/* Тайм-лимит */}
                            <Col xs={24} sm={12} md={6}>
                                <Card 
                                    size="small" 
                                    style={{ 
                                        height: '100%',
                                        border: '1px solid #e8e8e8',
                                        borderRadius: 8
                                    }}
                                >
                                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                                            Ограничение по времени
                                        </Text>
                                        <Space align="center" style={{ justifyContent: 'left', width: '100%' }}>
                                            <Text style={{ margin: 0, fontSize: quiz.timeLimit && quiz.timeLimit !== "00:00:00" ? '24px' : '18px' }}>
                                                {quiz.timeLimit === '00:00:00' ? 'Без ограничений' : formatTime(quiz.timeLimit)}
                                            </Text>
                                        </Space>
                                    </Space>
                                </Card>
                            </Col>
                            
                            {/* Ключ доступа */}
                            {userId === quiz.authorId && quiz.privateAccessKey && (
                            <Col xs={24} sm={12} md={6}>
                                <Card
                                    size="small"
                                    style={{
                                        height: '100%',
                                        border: '1px solid #e8e8e8',
                                        borderRadius: 8
                                    }}
                                >
                                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            <LockOutlined style={{ marginRight: 4 }} />
                                            Ключ доступа
                                        </Text>

                                        <Space align="center" style={{ width: '100%' }}>
                                            <Text
                                                style={{
                                                    fontSize: '22px',
                                                    fontWeight: 600,
                                                    letterSpacing: '1px',
                                                    fontFamily: "'JetBrains Mono', monospace"
                                                }}
                                            >
                                                {quiz.privateAccessKey}
                                            </Text>

                                            <Tooltip title="Скопировать">
                                                <Button
                                                    type="text"
                                                    icon={<CopyOutlined />}
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(quiz.privateAccessKey);
                                                        message.success('Ключ скопирован');
                                                    }}
                                                />
                                            </Tooltip>
                                        </Space>
                                    </Space>
                                </Card>
                            </Col>
                        )}
                        </Row>
                        
                        <Flex gap={8}>
                            {!quiz.isPublic ? (
                            <Tag 
                                color="orange"
                                icon={<LockOutlined />}
                                style={{ fontSize: 14, padding: 6 }}
                            >
                                Приватный
                            </Tag>
                            ) : (
                            <Tag
                                color="green"
                                icon={<GlobalOutlined />}
                                style={{ fontSize: 14, padding: 6 }}
                            >
                                Публичный
                            </Tag>
                            )}
                            <Tag 
                                color={getCategoryColor(quiz.category)}
                                icon={<AppstoreOutlined />}
                                style={{ fontSize: 14, padding: 6 }}
                            >
                                {getCategoryName(quiz.category)}
                            </Tag>
                        </Flex>
                    </div>
                </Card>

                {/* Лидерборд */}
                <Card
                    title={
                        <Space>
                            <TrophyOutlined style={{ color: '#faad14', fontSize: '20px' }} />
                            <Title level={4} style={{ margin: 0 }}>
                                Таблица лидеров
                            </Title>
                            <Tag icon={<TeamOutlined />} color="gold">
                                {leaderboard.length} участник{pluralize(leaderboard.length)}
                            </Tag>
                        </Space>
                    }
                    style={{
                        borderRadius: 12,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                    styles={{
                        body: { padding: 16 }
                    }}
                    extra={
                        <Button 
                            type="link" 
                            onClick={loadLeaderboard}
                            loading={leaderboardLoading}
                            icon={<TrophyOutlined />}
                        >
                            Обновить
                        </Button>
                    }
                >
                    {(!sessionId && !isAuthenticated) ? (
                        <Alert
                            title="Таблица лидеров недоступна"
                            description="Чтобы увидеть таблицу лидеров, необходимо сначала пройти этот квиз."
                            type="warning"
                            showIcon
                            icon={<LockOutlined />}
                        />
                    ) : (leaderboard.length > 0) ? (
                        <Table
                            columns={leaderboardColumns}
                            dataSource={leaderboard}
                            loading={leaderboardLoading}
                            rowKey={(record, index) => record.id || index}
                            pagination={{
                                pageSize: 10,
                                // showSizeChanger: true,
                                // showQuickJumper: true,
                                showTotal: (total, range) => 
                                    `${range[1]} из ${total} записей`
                            }}
                            scroll={{ x: true }}
                            style={{ marginTop: 16 }}
                        />
                    ) : (
                        <Alert
                            title="Таблица лидеров пуста"
                            description="Будьте первым, кто пройдет этот квиз и попадет в историю! Пройдите квиз, чтобы ваш результат появился здесь."
                            type="info"
                            showIcon
                            icon={<TrophyOutlined />}
                        />
                    )}
                    <div style={{ 
                        marginTop: 24, 
                        padding: 16, 
                        backgroundColor: '#fafafa', 
                        borderRadius: 8,
                        border: '1px dashed #d9d9d9'
                    }}>
                        <Space orientation="vertical" size="small">
                            <Text strong>Как попасть в таблицу лидеров?</Text>
                            <Text type="secondary">
                                1. Пройдите квиз полностью<br/>
                                2. Наберите как можно больше правильных ответов<br/>
                                3. Постарайтесь пройти квиз быстрее других<br/>
                                4. Ваш результат автоматически появится в таблице
                            </Text>
                        </Space>
                    </div>
                </Card>
            </div>

            {/* Модальное окно для ввода ключа доступа */}
            <Modal
                title={
                    <Space>
                        <KeyOutlined style={{ color: '#1890ff' }} />
                        <span>Доступ к приватному квизу</span>
                    </Space>
                }
                open={showAccessModal}
                onCancel={() => {
                    setShowAccessModal(false);
                    setAccessKeyInput('');
                }}
                footer={null}
                width={500}
                centered
            >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Alert
                        message="Требуется ключ доступа"
                        description="Этот квиз доступен только по специальному приглашению. Получите ключ у автора квиза."
                        type="warning"
                        showIcon
                    />
                    
                    <Form
                        onFinish={() => handleGrantAccess()}
                        layout="vertical"
                    >
                        <Form.Item
                            label="Ключ доступа (5 символов)"
                            required
                        >
                            <Input
                                value={accessKeyInput}
                                onChange={(e) => setAccessKeyInput(e.target.value.toUpperCase())}
                                placeholder="ABCDE"
                                maxLength={5}
                                style={{ 
                                    textTransform: 'uppercase',
                                    fontFamily: 'monospace',
                                    fontSize: '18px',
                                    letterSpacing: '4px',
                                    textAlign: 'center'
                                }}
                            />
                        </Form.Item>
                        
                        <Form.Item>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button 
                                    onClick={() => setShowAccessModal(false)}
                                    style={{ flex: 1 }}
                                >
                                    Отмена
                                </Button>
                                <Button 
                                    type="primary" 
                                    htmlType="submit"
                                    loading={accessKeyLoading}
                                    icon={<CheckCircleOutlined />}
                                    style={{ flex: 1 }}
                                >
                                    Получить доступ
                                </Button>
                            </div>
                        </Form.Item>
                    </Form>
                    
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        Ключ будет сохранен в вашем браузере для будущих посещений
                    </Text>
                </Space>
            </Modal>
        </Layout>
    );
};

export default QuizDetail;