import React, { useState } from 'react';
import { Card, Typography, Tag, Space, Modal, message, Button } from 'antd';
import { 
  ClockCircleOutlined, QuestionCircleOutlined, EditOutlined, 
  DeleteOutlined, BarChartOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { useQuizes } from '../hooks/useQuizes';
import { useUsers } from '../hooks/useUsers';

const { Text, Paragraph, Title } = Typography;

function MyQuizCard({ quiz, onDelete }) {
    const navigate = useNavigate();
    const { deleteQuiz } = useQuizes();
    const { checkToken } = useUsers();
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);

    const handleEdit = () => {
        navigate(`/quiz/${quiz.id}/questions`);
    };

    const handleStatistics = () => {
        navigate(`/quiz/${quiz.id}/statistics`);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        setDeleteModalVisible(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            const token = await checkToken();
            if (!token) {
                message.error('Ошибка авторизации');
                return;
            }
            
            await deleteQuiz(token, quiz.id);
            message.success('Квиз успешно удален');
            setDeleteModalVisible(false);
            
            if (onDelete) {
                onDelete(quiz.id);
            }
        } catch (error) {
            console.error('Ошибка при удалении квиза:', error);
            message.error(error.message || 'Не удалось удалить квиз');
        }
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
    
    const cardActions = [
        <Button 
            type="text" 
            icon={<BarChartOutlined />}
            onClick={(e) => {
                e.stopPropagation();
                handleStatistics();
            }}
            title="Статистика"
        />,
        <Button 
            type="text" 
            icon={<EditOutlined />}
            onClick={(e) => {
                e.stopPropagation();
                handleEdit();
            }}
            title="Редактировать"
        />,
        <Button 
            type="text" 
            danger
            icon={<DeleteOutlined />}
            onClick={handleDeleteClick}
            title="Удалить"
        />
    ];

    return (
        <>
            <Card
                hoverable
                actions={cardActions}
                onClick={() => navigate(`/quiz/${quiz.id}`)}
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
                    },
                    actions: {
                        padding: '0px 16px',
                        borderTop: '1px solid #f0f0f0',
                        background: '#fafafa'
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
                    
                    <Paragraph 
                        ellipsis={{ rows: 2 }} 
                        style={{ 
                            margin: 0, 
                            color: 'rgba(0, 0, 0, 0.65)',
                            fontSize: '13px',
                            lineHeight: 1.4,
                            flex: 1
                        }}
                    >
                        {quiz.description || 'Описание отсутствует'}
                    </Paragraph>
                    
                    <div style={{ 
                        marginTop: 'auto', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                    }}>
                        {/* Количество вопросов */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <QuestionCircleOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                {quiz.questionsCount || '?'} вопросов
                            </Text>
                        </div>
                        
                        {/* Ограничение по времени */}
                        {getTimeDisplay()}
                    </div>
                </div>
            </Card>

            {/* Модальное окно подтверждения удаления */}
            <Modal
                title="Подтверждение удаления"
                open={deleteModalVisible}
                onOk={handleDeleteConfirm}
                onCancel={() => setDeleteModalVisible(false)}
                okText="Удалить"
                cancelText="Отмена"
                okButtonProps={{ danger: true }}
            >
                <p>Вы уверены, что хотите удалить квиз &quot;{quiz.title}&quot;?</p>
                <p style={{ color: 'rgba(0, 0, 0, 0.45)' }}>Это действие нельзя отменить.</p>
            </Modal>
        </>
    );
}

export default MyQuizCard;