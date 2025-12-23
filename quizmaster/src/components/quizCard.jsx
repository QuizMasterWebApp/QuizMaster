import React, { useState, useEffect } from 'react';
import { Card, Typography, Tag, Space, Skeleton } from 'antd';
import { ClockCircleOutlined, UserOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getUserInfo } from '../API methods/usersMethods';
import { getCategoryName, getCategoryColor } from '../utils/categoryUtils';
import { useQuestions } from '../hooks/useQuestions';

const { Text, Paragraph, Title } = Typography;

function QuizCard({ quiz }) {
    const navigate = useNavigate();
    const { pluralize } = useQuestions();
    const [authorName, setAuthorName] = useState('');
    const [loadingAuthor, setLoadingAuthor] = useState(false);

    useEffect(() => {
        loadAuthorInfo();
    }, [quiz.authorId]);

    const loadAuthorInfo = async () => {
        const authorId = quiz.authorId;
        
        if (!authorId) {
            setAuthorName('Неизвестный автор');
            return;
        }

        setLoadingAuthor(true);
        try {
            const authorInfo = await getUserInfo(authorId);
            setAuthorName(authorInfo?.name || authorInfo?.userName || authorInfo?.username || 'Неизвестный автор');
        } catch (error) {
            console.warn('Не удалось загрузить информацию об авторе:', error);
            setAuthorName('Неизвестный автор');
        } finally {
            setLoadingAuthor(false);
        }
    };

    const handleCardClick = () => {
        navigate(`/quiz/${quiz.id}`);
    };

    const formatTime = (timeString) => {
        if (!timeString || timeString === "00:00:00") return null;
        
        try {
            const parts = timeString.split(':');
            if (parts.length === 3) {
                const hours = parseInt(parts[0]);
                const minutes = parseInt(parts[1]);
                const seconds = parseInt(parts[2]);
                
                if (hours > 0) {
                    return `${hours}ч ${minutes}м`;
                } else if (minutes > 0) {
                    return `${minutes}м ${seconds}с`;
                } else {
                    return `${seconds}с`;
                }
            }
            return timeString;
        } catch (error) {
            return timeString;
        }
    };

    const getTimeDisplay = () => {
        if (!quiz.timeLimit || quiz.timeLimit === "00:00:00") {
            return null;
        }
        const formatted = formatTime(quiz.timeLimit);
        if (!formatted) return null;
        
        return (
            <Tag 
                icon={<ClockCircleOutlined />} 
                color="blue"
                style={{ margin: 0, fontSize: '12px' }}
            >
                {formatted}
            </Tag>
        );
    };

    const getCategoryDisplay = () => {
        // Проверяем наличие категории в данных квиза
        const categoryValue = quiz.category !== undefined && quiz.category !== null 
            ? quiz.category 
            : (quiz.categoryId !== undefined && quiz.categoryId !== null 
                ? quiz.categoryId 
                : null);
        
        if (categoryValue === null || categoryValue === undefined) return null;
        
        // // Проверяем, что это допустимое значение категории
        // const validCategories = [0, 1, 2, 3, 4, 5, 7];
        // if (!validCategories.includes(categoryValue)) return null;
        
        return (
            <Tag 
                color={getCategoryColor(categoryValue)}
                style={{ margin: 0, fontSize: '12px' }}
            >
                {getCategoryName(categoryValue)}
            </Tag>
        );
    };
    
    return (
        <Card
            hoverable
            onClick={handleCardClick}
            style={{
                width: '100%',
                height: '180px',
                borderRadius: 8,
                transition: 'all 0.3s',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column'
            }}
            styles={{ 
                body: { 
                    padding: 16,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                } 
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
                <Title 
                    level={5} 
                    style={{ 
                        margin: 0, 
                        lineHeight: 1.3,
                        fontSize: '16px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                    }}
                >
                    {quiz.title}
                </Title>
                
                {/* Автор */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
                    {loadingAuthor ? (
                        <Skeleton.Input active size="small" style={{ width: 100, height: 14 }} />
                    ) : (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {authorName}
                        </Text>
                    )}
                </div>
                
                <div style={{ 
                    height: '36px', // Фиксированная высота для 2 строк
                    overflow: 'hidden',
                    flex: 1
                }}>
                    <Paragraph 
                        ellipsis={{ rows: 2 }}
                        style={{ 
                            margin: 0, 
                            color: 'rgba(0, 0, 0, 0.65)',
                            fontSize: '13px',
                            lineHeight: 1.4
                        }}
                    >
                        {quiz.description || ''}
                    </Paragraph>
                </div>
                
                <div style={{ 
                    marginTop: 'auto', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 4
                }}>
                    {/* Количество вопросов */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: '100px' }}>
                        <QuestionCircleOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {quiz.questionsCount || '?'} вопрос{pluralize(quiz.questionsCount)}
                        </Text>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Категория */}
                        {getCategoryDisplay()}
                        
                        {/* Ограничение по времени */}
                        {getTimeDisplay()}
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default QuizCard;