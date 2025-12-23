import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Layout, Card, Form, Input, Radio, Button, Space, Typography, 
    TimePicker, Switch, message, Row, Col, Divider, Select, Tag
} from 'antd';
import { 
    SaveOutlined, ClockCircleOutlined, LockOutlined, 
    GlobalOutlined, AppstoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../API methods/.APIclient';
import { 
    getCategoryName, 
    getCategoryColor,
    formatCategoriesFromApi 
} from '../utils/categoryUtils';
import { useUsers } from '../hooks/useUsers';
import { usePrivateQuizAccess } from '../hooks/usePrivateQuizAccess';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function CreateQuiz() {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [quizId, setQuizId] = useState();
    const { checkToken } = useUsers();
    const { setSavedAccessKey } = usePrivateQuizAccess();
    const [loading, setLoading] = useState(false);
    const [hasTimeLimit, setHasTimeLimit] = useState(false);
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);

    // Загружаем категории при монтировании компонента
    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setCategoriesLoading(true);
        try {
            console.log('Загрузка категорий...');
            
            const token = await checkToken();
            const response = await apiClient.get('/Category', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            console.log('Ответ от API /Category:', response.data);
            
            if (response.data && Array.isArray(response.data)) {
                const formattedCategories = formatCategoriesFromApi(response.data);
                console.log('Форматированные категории:', formattedCategories);
                
                if (formattedCategories.length === 0) {
                    message.warning('Список категорий пуст. Проверьте подключение к серверу.');
                }
                
                setCategories(formattedCategories);
            } else {
                console.error('Некорректный формат данных категорий:', response.data);
                message.error('Не удалось загрузить список категорий');
                setCategories([]);
            }
        } catch (error) {
            console.error('Ошибка при загрузке категорий:', error);
            message.error('Ошибка при загрузке категорий. Пожалуйста, проверьте подключение к серверу.');
            setCategories([]);
        } finally {
            setCategoriesLoading(false);
        }
    };

    const onFinish = async (values) => {
        setLoading(true);
        
        try {
            const token = await checkToken();
            
            if (!token) {
                message.error('Требуется авторизация');
                navigate('/login');
                return;
            }

            // Получаем числовое значение категории
            const categoryValue = parseInt(values.category);
            if (isNaN(categoryValue)) {
                message.error('Некорректное значение категории');
                setLoading(false);
                return;
            }

            // Проверяем, что категория допустима
            const validCategories = [0, 1, 2, 3, 4, 5, 7];
            if (!validCategories.includes(categoryValue)) {
                message.error('Выбрана недопустимая категория');
                setLoading(false);
                return;
            }

            // Формируем данные для отправки
            const quizData = {
                title: values.title,
                description: values.description || '',
                isPublic: values.accessMode === 'public',
                category: categoryValue  // Поле должно называться "category"
            };

            // Добавляем timeLimit только если установлен лимит времени
            if (hasTimeLimit && values.timeLimit) {
                quizData.timeLimit = dayjs(values.timeLimit).format('HH:mm:ss');
            }

            console.log('Отправка данных квиза:', quizData);

            // Отправляем запрос на создание квиза
            const response = await apiClient.post('/Quiz', quizData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            message.success('Квиз успешно создан!');
            
            // Перенаправляем на страницу создания вопросов
            if (response.data?.id) {
                setQuizId(response.data.id);
                if (response.data.privateAccessKey)
                    setSavedAccessKey(response.data.id, response.data.privateAccessKey);
                navigate(`/quiz/${response.data.id}/questions`);
            } else {
                navigate('/');
            }
        } catch (error) {
            console.error('Ошибка при создании квиза:', error);
            
            if (error.response?.status === 401) {
                message.error('Ошибка авторизации. Пожалуйста, войдите снова.');
                navigate('/login');
            } else if (error.response?.status === 400) {
                const errorMessage = error.response.data?.message || error.response.data || 'Неверные данные для создания квиза';
                message.error(errorMessage);
            } else {
                message.error('Ошибка при создании квиза. Попробуйте еще раз.');
            }
        } finally {
            setLoading(false);
        }
    };

    const onFinishFailed = (errorInfo) => {
        console.log('Validation failed:', errorInfo);
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Content style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                <Card>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div>
                            <Title level={2} style={{margin: 0}}>Создание нового квиза</Title>
                            <Text type="secondary">
                                Заполните форму ниже, чтобы создать новый квиз
                            </Text>
                        </div>

                        <Divider />

                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            onFinishFailed={onFinishFailed}
                            autoComplete="off"
                            initialValues={{
                                accessMode: 'public',
                                category: 7 // По умолчанию "Другое"
                            }}
                        >
                            {/* Название квиза */}
                            <Form.Item
                                name="title"
                                label="Название квиза"
                                rules={[
                                    { required: true, message: 'Введите название квиза!' },
                                    { max: 200, message: 'Название не должно превышать 200 символов' }
                                ]}
                            >
                                <Input 
                                    placeholder="Введите название квиза"
                                    size="large"
                                />
                            </Form.Item>

                            {/* Описание */}
                            <Form.Item
                                name="description"
                                label="Описание"
                            >
                                <TextArea 
                                    placeholder="Введите описание квиза (необязательно)"
                                    rows={4}
                                    showCount
                                    maxLength={1000}
                                />
                            </Form.Item>

                            {/* Категория */}
                            <Form.Item
                                name="category"
                                label="Категория"
                                rules={[
                                    { required: true, message: 'Выберите категорию для квиза!' }
                                ]}
                            >
                                <Select
                                    placeholder="Выберите категорию"
                                    size="large"
                                    loading={categoriesLoading}
                                    notFoundContent={categoriesLoading ? "Загрузка категорий..." : "Категории не найдены"}
                                    suffixIcon={<AppstoreOutlined />}
                                >
                                    {categories.map(category => (
                                        <Option 
                                            key={category.categoryType} 
                                            value={category.categoryType}
                                        >
                                            <Space>
                                                <Tag color={category.color}>
                                                    {category.displayName}
                                                </Tag>
                                                <Text type="secondary">
                                                    ({category.originalName})
                                                </Text>
                                            </Space>
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            {/* Лимит времени */}
                            <Form.Item label="Лимит времени">
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Switch
                                        checked={hasTimeLimit}
                                        onChange={setHasTimeLimit}
                                        checkedChildren={<ClockCircleOutlined />}
                                        unCheckedChildren="Без времени"
                                    />
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {hasTimeLimit 
                                            ? 'Установите лимит времени для прохождения квиза'
                                            : 'Квиз можно проходить без ограничения по времени'
                                        }
                                    </Text>
                                    
                                    {hasTimeLimit && (
                                        <Form.Item
                                            name="timeLimit"
                                            rules={[
                                                { required: true, message: 'Выберите лимит времени!' }
                                            ]}
                                        >
                                            <TimePicker
                                                format="HH:mm:ss"
                                                placeholder="Выберите время"
                                                style={{ width: '100%' }}
                                                size="large"
                                                showNow={false}
                                            />
                                        </Form.Item>
                                    )}
                                </Space>
                            </Form.Item>

                            {/* Режим доступа */}
                            <Form.Item
                                name="accessMode"
                                label="Режим доступа"
                                rules={[
                                    { required: true, message: 'Выберите режим доступа!' }
                                ]}
                            >
                                <Radio.Group>
                                    <Space direction="vertical">
                                        <Radio value="public">
                                            <Space>
                                                <GlobalOutlined />
                                                <Text>Публичный</Text>
                                            </Space>
                                            <br />
                                            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 24 }}>
                                                Квиз будет доступен всем пользователям
                                            </Text>
                                        </Radio>
                                        <Radio value="private">
                                            <Space>
                                                <LockOutlined />
                                                <Text>Приватный</Text>
                                            </Space>
                                            <br />
                                            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 24 }}>
                                                Квиз будет доступен только по коду доступа
                                            </Text>
                                        </Radio>
                                    </Space>
                                </Radio.Group>
                            </Form.Item>

                            <Divider />

                            {/* Кнопки действий */}
                            <Form.Item>
                                <Row justify="space-between">
                                    <Col>
                                        <Button 
                                            onClick={() => navigate('/')}
                                            size="large"
                                        >
                                            Отмена
                                        </Button>
                                    </Col>
                                    <Col>
                                        <Button 
                                            type="primary" 
                                            htmlType="submit"
                                            loading={loading}
                                            icon={<SaveOutlined />}
                                            size="large"
                                        >
                                            Создать квиз
                                        </Button>
                                    </Col>
                                </Row>
                            </Form.Item>
                        </Form>
                    </Space>
                </Card>
            </Content>
        </Layout>
    );
}