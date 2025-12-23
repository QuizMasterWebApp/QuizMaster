import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Layout, Card, Form, Input, Radio, Button, Space, Typography,
    Checkbox, message, Row, Col, Divider, List, Empty,
    TimePicker, Switch, Collapse, Modal,
    Alert, Spin, Select, Tag
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, SaveOutlined,
    CheckCircleOutlined, ArrowLeftOutlined, CheckOutlined,
    ClockCircleOutlined, LockOutlined, GlobalOutlined, EditOutlined,
    AppstoreOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import Cookies from 'js-cookie';
import dayjs from 'dayjs';
import HeaderComponent from '../components/HeaderComponent';
import { useQuizes } from '../hooks/useQuizes';
import { useQuestions } from '../hooks/useQuestions';
import { 
    getCategoryName, 
    getCategoryColor, 
    getCategoryOriginalName,
    formatCategoriesFromApi,
    getDefaultCategories 
} from '../utils/categoryUtils';
import apiClient from '../API methods/.APIclient';
import '../App.css';
import { useUsers } from '../hooks/useUsers';
import { usePrivateQuizAccess } from '../hooks/usePrivateQuizAccess';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function CreateQuestions() {
    const {getQuizById, updateQuiz, getQuizQuestions} = useQuizes();
    const {createQuestion, updateQuestion, updateOption, getQuestionById, createOption, deleteOption, deleteQuestion} = useQuestions();
    const { checkToken, GetUserIdFromJWT } = useUsers();
    const { checkAccess } = usePrivateQuizAccess();
    const { quizId } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [quizForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [quiz, setQuiz] = useState(null);
    const [userId, setUserId] = useState();

    const [questions, setQuestions] = useState([]);
    const [loadingQuiz, setLoadingQuiz] = useState(true);
    const [questionType, setQuestionType] = useState(0);
    const [hasTimeLimit, setHasTimeLimit] = useState(false);
    const [savingQuiz, setSavingQuiz] = useState(false);
    
    // Состояния для редактирования вопроса
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [editForm] = Form.useForm();
    const [editQuestionType, setEditQuestionType] = useState(0);
    const [loadingEdit, setLoadingEdit] = useState(false);

    // Состояния для категорий
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);

    useEffect(() => {
        checkAuth()
        loadCategories();
        loadQuizData();
    }, [quizId]);

    const checkAuth = async () => {
        const token = await checkToken();
        if (!token) {
            navigate('/'); 
        } else {
            const userIdData = GetUserIdFromJWT(token)
            setUserId(userIdData)
        }
    }

    const loadCategories = async () => {
        setCategoriesLoading(true);
        try {
            console.log('Загрузка категорий для редактирования квиза...');
            
            const token = await checkToken();
            const response = await apiClient.get('/Category', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            console.log('Категории от API:', response.data);
            
            if (response.data && Array.isArray(response.data)) {
                const formattedCategories = formatCategoriesFromApi(response.data);
                console.log('Форматированные категории:', formattedCategories);
                setCategories(formattedCategories);
            } else {
                console.error('Некорректный формат данных категорий:', response.data);
                setCategories([]);
            }
        } catch (error) {
            console.error('Ошибка при загрузке категорий:', error);
            message.warning('Не удалось загрузить список категорий');
            setCategories([]);
        } finally {
            setCategoriesLoading(false);
        }
    };

    const loadQuizData = async () => {
        try {
            setLoadingQuiz(true);
            const token = await checkToken();
            const savedAccessKey = await checkAccess(quizId);
            const quizData = await getQuizById(quizId, token, savedAccessKey);
            setQuiz(quizData);

            // Устанавливаем значения в форму редактирования
            const timeLimitValue = quizData.timeLimit;
            const hasLimit = timeLimitValue && 
                            timeLimitValue !== '00:00:00' && 
                            timeLimitValue !== null && 
                            timeLimitValue !== '';
            setHasTimeLimit(hasLimit);
            
            // Устанавливаем категорию (если нет категории, используем значение по умолчанию)
            const categoryValue = quizData.category !== undefined && quizData.category !== null 
                ? quizData.category 
                : 7; // По умолчанию "Другое"
            
            quizForm.setFieldsValue({
                title: quizData.title,
                description: quizData.description || '',
                accessMode: quizData.isPublic ? 'public' : 'private',
                timeLimit: hasLimit && timeLimitValue ? dayjs(timeLimitValue, 'HH:mm:ss') : null,
                category: categoryValue
            });

            // Загружаем существующие вопросы
            try {
                const questionsData = await getQuizQuestions(quizId, quizData.privateAccessKey);
                setQuestions(questionsData || []);
            } catch (error) {
                console.error('Ошибка при загрузке вопросов:', error);
                setQuestions([]);
            }
        } catch (error) {
            console.error('Ошибка при загрузке квиза:', error);
            message.error('Не удалось загрузить данные квиза');
        } finally {
            setLoadingQuiz(false);
        }
    };

    const onQuizUpdate = async (values) => {
        setSavingQuiz(true);
        
        try {
            const token = await checkToken();
            
            if (!token) {
                message.error('Требуется авторизация');
                navigate('/login');
                return;
            }

            // Получаем числовое значение категории
            const categoryValue = parseInt(values.category) || 7;

            // Формируем данные для отправки
            const quizData = {
                title: values.title,
                description: values.description || '',
                category: categoryValue,
                timeLimit: hasTimeLimit && values.timeLimit 
                    ? dayjs(values.timeLimit).format('HH:mm:ss')
                    : '00:00:00'
            };

            // Если квиз приватный, добавляем isPublic: false
            if (!quiz.isPublic) {
                quizData.isPublic = false;
            }

            console.log('Данные для обновления квиза:', quizData);

            // Отправляем запрос на обновление квиза
            const response = await updateQuiz(token, quizId, quizData);

            if (response?.status === 200 || response?.data) {
                message.success('Информация о квизе успешно обновлена!');
                await loadQuizData();
            } else {
                throw new Error('Неизвестная ошибка при обновлении квиза');
            }
            
        } catch (error) {
            console.error('Ошибка при обновлении квиза:', error);
            
            if (error.response?.status === 401) {
                message.error('Ошибка авторизации. Пожалуйста, войдите снова.');
                navigate('/login');
            } else if (error.response?.status === 400) {
                message.error(error.response.data?.message || 'Неверные данные для обновления квиза');
            } else {
                message.error(error.message || 'Ошибка при обновлении квиза. Попробуйте еще раз.');
            }
        } finally {
            setSavingQuiz(false);
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

            // Проверяем, что есть хотя бы один правильный ответ
            const correctOptions = values.options.filter(opt => opt.isCorrect);
            if (correctOptions.length === 0) {
                message.error('Выберите хотя бы один правильный ответ!');
                setLoading(false);
                return;
            }

            // Для одиночного выбора (type 0) должен быть только один правильный ответ
            if (questionType === 0 && correctOptions.length > 1) {
                message.error('Для вопроса с одним вариантом ответа выберите только один правильный ответ!');
                setLoading(false);
                return;
            }

            // Формируем данные для отправки
            const questionData = {
                text: values.text,
                quizId: parseInt(quizId),
                type: questionType,
                options: values.options.map(opt => ({
                    text: opt.text,
                    isCorrect: opt.isCorrect || false
                }))
            };

            // Отправляем запрос на создание вопроса
            const response = await createQuestion(questionData, token);

            message.success('Вопрос успешно создан!');
            
            // Очищаем форму и сбрасываем начальные значения
            form.resetFields();
            form.setFieldsValue({
                options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }]
            });
            setQuestionType(0);
            
            // Обновляем список вопросов
            await loadQuizData();
        } catch (error) {
            console.error('Ошибка при создании вопроса:', error);
            
            if (error.response?.status === 401) {
                message.error('Ошибка авторизации. Пожалуйста, войните снова.');
                navigate('/login');
            } else if (error.response?.status === 400) {
                message.error(error.response.data?.message || error.message || 'Неверные данные для создания вопроса');
            } else {
                message.error(error.message || 'Ошибка при создании вопроса. Попробуйте еще раз.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Функция для открытия модального окна редактирования
    const handleEditQuestion = async (questionId) => {
        try {
            setLoadingEdit(true);
            const questionData = await getQuestionById(questionId);
            setEditingQuestion(questionData);
            setEditQuestionType(questionData.type);
            
            // Заполняем форму данными вопроса
            editForm.setFieldsValue({
                text: questionData.text,
                options: questionData.options.map(option => ({
                    text: option.text,
                    isCorrect: option.isCorrect || false
                }))
            });
            
            setEditModalVisible(true);
        } catch (error) {
            console.error('Ошибка при загрузке вопроса:', error);
            message.error('Не удалось загрузить данные вопроса');
        } finally {
            setLoadingEdit(false);
        }
    };

    // Функция для сохранения изменений вопроса
    const handleSaveEdit = async () => {
        try {
            const values = await editForm.validateFields();
            const token = await checkToken();

            if (!token) {
                message.error('Требуется авторизация');
                navigate('/login');
                return;
            }

            setLoadingEdit(true);

            // Проверяем минимальное количество опций
            if (!values.options || values.options.length < 2) {
                message.error('Вопрос должен содержать минимум 2 варианта ответа!');
                setLoadingEdit(false);
                return;
            }

            // Проверяем, что есть хотя бы один правильный ответ
            const correctOptions = values.options.filter(opt => opt.isCorrect);
            if (correctOptions.length === 0) {
                message.error('Выберите хотя бы один правильный ответ!');
                setLoadingEdit(false);
                return;
            }

            // Для одиночного выбора (type 0) должен быть только один правильный ответ
            if (editQuestionType === 0 && correctOptions.length > 1) {
                message.error('Для вопроса с одним вариантом ответа выберите только один правильный ответ!');
                setLoadingEdit(false);
                return;
            }

            // Обновляем вопрос
            await updateQuestion(editingQuestion.id, {
                text: values.text,
                type: editQuestionType
            }, token);

            // Обрабатываем опции
            const existingOptions = editingQuestion.options || [];
            const newOptions = values.options || [];
            
            // Обновляем существующие опции
            for (let i = 0; i < Math.min(existingOptions.length, newOptions.length); i++) {
                const option = newOptions[i];
                const existingOption = existingOptions[i];
                
                if (existingOption && existingOption.id) {
                    await updateOption(existingOption.id, {
                        text: option.text,
                        isCorrect: option.isCorrect || false
                    }, token);
                }
            }
            
            // Удаляем лишние опции (если новых опций меньше, чем было)
            if (newOptions.length < existingOptions.length) {
                for (let i = newOptions.length; i < existingOptions.length; i++) {
                    if (existingOptions[i] && existingOptions[i].id) {
                        await deleteOption(existingOptions[i].id, token);
                    }
                }
            }
            
            // Создаем новые опции (если новых опций больше, чем было)
            if (newOptions.length > existingOptions.length) {
                for (let i = existingOptions.length; i < newOptions.length; i++) {
                    const option = newOptions[i];
                    await createOption(editingQuestion.id, {
                        text: option.text,
                        isCorrect: option.isCorrect || false
                    }, token);
                }
            }

            message.success('Вопрос успешно обновлен!');
            setEditModalVisible(false);
            setEditingQuestion(null);
            editForm.resetFields();
            
            // Обновляем список вопросов
            await loadQuizData();
        } catch (error) {
            console.error('Ошибка при обновлении вопроса:', error);
            
            if (error.response?.status === 401) {
                message.error('Ошибка авторизации. Пожалуйста, войните снова.');
                navigate('/login');
            } else if (error.response?.status === 400) {
                message.error(error.response.data?.message || error.message || 'Неверные данные для обновления вопроса');
            } else {
                message.error(error.message || 'Ошибка при обновлении вопроса. Попробуйте еще раз.');
            }
        } finally {
            setLoadingEdit(false);
        }
    };

    const handleDeleteWithConfirm = (questionId, text) => {      
        Modal.confirm({
          title: 'Удалить вопрос?',
          icon: <ExclamationCircleOutlined />,
          content: `"${text}" будет удалён, если на него ещё не отвечали пользователи. Иначе удалить не получится.`,
          okText: 'Удалить',
          cancelText: 'Отмена',
          okButtonProps: { danger: true },
          onOk: () => handleDeleteQuestion(questionId),
        });
      };

    // Функция для удаления вопроса
    const handleDeleteQuestion = async (questionId) => {
        try {
            const token = await checkToken();
            
            if (!token) {
                message.error('Требуется авторизация');
                navigate('/login');
                return;
            }

            const response = await deleteQuestion(questionId, token);
            // Проверяем ответ от сервера
            if (response?.status !== 200) {
                message.error('Невозможно удалить вопрос, поскольку на него есть ответы пользователя');
                return;
            }
            else
                message.success('Вопрос успешно удален!');
            
            // Обновляем список вопросов
            await loadQuizData();
        } catch (error) {
            console.error('Ошибка при удалении вопроса:', error);
            
            if (error.response?.status === 401) {
                message.error('Ошибка авторизации. Пожалуйста, войдите снова.');
                navigate('/login');
            } else if (error.response?.status === 403) {
                message.error('У вас нет прав на удаление этого вопроса');
            } else if (error.response?.status === 409) {
                message.error('Невозможно удалить вопрос, поскольку на него есть ответы пользователя');
            } else {
                message.error(error.message || 'Ошибка при удалении вопроса. Попробуйте еще раз.');
            }
        }
    };

    // Функция для перемещения вопроса вверх
    const handleMoveQuestionUp = (index) => {
        if (index === 0) return; // Уже первый
        
        const newQuestions = [...questions];
        [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
        setQuestions(newQuestions);
    };

    // Функция для перемещения вопроса вниз
    const handleMoveQuestionDown = (index) => {
        if (index === questions.length - 1) return; // Уже последний
        
        const newQuestions = [...questions];
        [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
        setQuestions(newQuestions);
    };

    if (!loadingEdit && !quiz) {
        return (
            <Layout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <Spin size="large" tip="Загрузка информации о квизе..." />
                </div>
            </Layout>
        );
    }

    if (!quiz && !loadingQuiz) {
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

    if (quiz && userId && quiz.authorId !== userId) {
    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Content style={{ 
                padding: '24px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                minHeight: 'calc(100vh - 64px)'
            }}>
                <Card style={{ width: '100%', maxWidth: 600 }}>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <ExclamationCircleOutlined style={{ fontSize: 64, color: '#ff4d4f', marginBottom: 24 }} />
                        <Title level={3} style={{ marginBottom: 16 }}>
                            Доступ запрещен
                        </Title>
                        <Paragraph style={{ marginBottom: 24, fontSize: 16 }}>
                            Вы пытаетесь редактировать квиз другого пользователя.<br />
                            Редактировать можно только свои собственные квизы.
                        </Paragraph>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button 
                                type="primary" 
                                size="large" 
                                block
                                onClick={() => navigate('/my-quizzes')}
                            >
                                Перейти к моим квизам
                            </Button>
                            <Button 
                                size="large" 
                                block
                                onClick={() => navigate('/')}
                            >
                                На главную страницу
                            </Button>
                        </Space>
                    </div>
                </Card>
            </Content>
        </Layout>
    );
}

    if (quiz?.isDeleted) {
        return (
            <Layout>
                <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
                    <Alert
                        title="Квиз удалён"
                        description="Этот квиз был удалён, поэтому изменить его уже не получится."
                        type="error"
                        showIcon
                        action={
                            <Space orientation="vertical">
                                <Button type="primary" onClick={() => navigate('/')}>
                                    На главную
                                </Button>
                            </Space>
                        }
                    />
                </div>
            </Layout>
        );
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                {loadingQuiz ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Spin/>
                    </div>
                ) : (
                    <>
                        {/* Форма редактирования квиза */}
                        <Collapse 
                            style={{ marginBottom: '24px', background: '#fff', border: '1px solid #f0f0f0'}}
                            bordered={true}
                            defaultActiveKey={[]}
                            items={[{
                                key: '1',
                                label: (
                                    <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                                        <Col>
                                            <Title level={3} style={{ margin: 0 }}>
                                                Изменение квиза
                                            </Title>
                                        </Col>
                                        <Col>
                                            <Button
                                                type="primary"
                                                loading={savingQuiz}
                                                icon={<SaveOutlined />}
                                                size="large"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    quizForm.submit();
                                                }}
                                            >
                                                Сохранить
                                            </Button>
                                        </Col>
                                    </Row>
                                ),
                                children: (
                                    <Form
                                        form={quizForm}
                                        layout="vertical"
                                        onFinish={onQuizUpdate}
                                        autoComplete="off"
                                    >
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
                                            style={{ marginTop: 16 }}
                                        >
                                            <TextArea 
                                                placeholder="Введите описание квиза (необязательно)"
                                                rows={3}
                                                showCount
                                                maxLength={1000}
                                            />
                                        </Form.Item>
                                        
                                        <Form.Item
                                            name="category"
                                            label="Категория"
                                            style={{ marginTop: 16 }}
                                        >
                                            <Select
                                                placeholder="Выберите категорию"
                                                size="large"
                                                loading={categoriesLoading}
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
                                        <Form.Item label="Лимит времени" style={{ marginBottom: 16 }}>
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
                                                        style={{ marginBottom: 0 }}
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

                                        {quiz.isPublic ? (
                                            <Alert type="success" showIcon icon={<GlobalOutlined />}
                                                title="Публичный квиз - все пользователи могут его пройти"
                                                description={
                                                <Space orientation="vertical" size={4}>
                                                    <Text type="secondary">
                                                     Доступ к квизу нельзя изменить после создания.
                                                    </Text>
                                                </Space>
                                                }
                                            />
                                            ) : (
                                            <Alert type="warning" showIcon icon={<LockOutlined />}
                                                title="Приватный квиз - могут пройти пользователи, знающие код доступа"
                                                description={
                                                <Space orientation="vertical" size={4}>
                                                    <Text type="secondary">
                                                    Доступ к квизу нельзя изменить после создания.
                                                    </Text>
                                                </Space>
                                                }
                                            />
                                            )}
                                    </Form>
                                )
                            }]
                        } />

                        <Row gutter={[24, 24]}>
                            {/* Форма создания вопроса */}
                            <Col xs={24} lg={14}>
                                <Card>
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                        <div>
                                            <Title level={4} style={{margin: 0}}>
                                                Создать новый вопрос
                                            </Title>
                                            <Text type="secondary">
                                                Заполните форму для добавления вопроса в квиз
                                            </Text>
                                        </div>

                                        <Divider />

                                        <Form
                                            form={form}
                                            layout="vertical"
                                            onFinish={onFinish}
                                            autoComplete="off"
                                            initialValues={{
                                                options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }]
                                            }}
                                        >
                                            {/* Текст вопроса */}
                                            <Form.Item
                                                name="text"
                                                label="Текст вопроса"
                                                rules={[
                                                    { required: true, message: 'Введите текст вопроса!' },
                                                    { max: 500, message: 'Текст не должен превышать 500 символов' }
                                                ]}
                                            >
                                                <TextArea
                                                    placeholder="Введите текст вопроса"
                                                    rows={3}
                                                    showCount
                                                    maxLength={500}
                                                />
                                            </Form.Item>

                                            {/* Тип вопроса */}
                                            <Form.Item
                                                label="Тип вопроса"
                                            >
                                                <Radio.Group
                                                    value={questionType}
                                                    onChange={(e) => {
                                                        setQuestionType(e.target.value);
                                                        // Сбрасываем выбор правильных ответов при смене типа
                                                        const options = form.getFieldValue('options') || [];
                                                        form.setFieldsValue({
                                                            options: options.map(opt => ({ ...opt, isCorrect: false }))
                                                        });
                                                    }}
                                                >
                                                    <Radio value={0}>
                                                        <Space>
                                                            <CheckCircleOutlined />
                                                            <Text>Один вариант ответа</Text>
                                                        </Space>
                                                    </Radio>
                                                    <Radio value={1}>
                                                        <Space>
                                                            <CheckOutlined />
                                                            <Text>Несколько верных вариантов</Text>
                                                        </Space>
                                                    </Radio>
                                                </Radio.Group>
                                            </Form.Item>

                                            {/* Варианты ответа */}
                                            <Form.Item
                                                label="Варианты ответа"
                                                required
                                            >
                                                <Form.List name="options">
                                                    {(fields, { add, remove }) => (
                                                        <>
                                                            {fields.map(({ key, name, ...restField }) => (
                                                                <Card
                                                                    key={key}
                                                                    size="small"
                                                                    style={{ marginBottom: 8 }}
                                                                    extra={
                                                                        fields.length > 2 && (
                                                                            <Button
                                                                                type="text"
                                                                                danger
                                                                                icon={<DeleteOutlined />}
                                                                                onClick={() => remove(name)}
                                                                                size="small"
                                                                            />
                                                                        )
                                                                    }
                                                                >
                                                                    <Row gutter={8} align="middle">
                                                                        <Col flex="auto">
                                                                            <Form.Item
                                                                                {...restField}
                                                                                name={[name, 'text']}
                                                                                rules={[
                                                                                    { required: true, message: 'Введите вариант ответа!' }
                                                                                ]}
                                                                                style={{ marginBottom: 0 }}
                                                                            >
                                                                                <Input
                                                                                    placeholder={`Вариант ответа ${name + 1}`}
                                                                                />
                                                                            </Form.Item>
                                                                        </Col>
                                                                        <Col>
                                                                            <Form.Item
                                                                                {...restField}
                                                                                name={[name, 'isCorrect']}
                                                                                valuePropName="checked"
                                                                                style={{ marginBottom: 0 }}
                                                                            >
                                                                                <Checkbox>
                                                                                    {questionType === 0 ? 'Правильный' : 'Верный'}
                                                                                </Checkbox>
                                                                            </Form.Item>
                                                                        </Col>
                                                                    </Row>
                                                                </Card>
                                                            ))}
                                                            <Button
                                                                type="dashed"
                                                                onClick={() => add()}
                                                                block
                                                                icon={<PlusOutlined />}
                                                                style={{ marginTop: 8 }}
                                                            >
                                                                Добавить вариант ответа
                                                            </Button>
                                                        </>
                                                    )}
                                                </Form.List>
                                            </Form.Item>

                                            <Divider />

                                            {/* Кнопка сохранения */}
                                            <Form.Item>
                                                <Button
                                                    type="primary"
                                                    htmlType="submit"
                                                    loading={loading}
                                                    icon={<SaveOutlined />}
                                                    block
                                                    size="large"
                                                >
                                                    Сохранить вопрос
                                                </Button>
                                            </Form.Item>
                                        </Form>
                                    </Space>
                                </Card>
                            </Col>

                            {/* Список существующих вопросов */}
                            <Col xs={24} lg={10}>
                                <Card>
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                        <div>
                                            <Title level={4} style={{ margin: 0 }}>
                                                Вопросы квиза
                                            </Title>
                                            <Text type="secondary">
                                                вопросов: {questions.length}
                                            </Text>
                                        </div>

                                        <Divider style={{ margin: '16px 0' }} />

                                        {questions.length === 0 ? (
                                            <Empty
                                                description="Вопросов пока нет"
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            />
                                        ) : (
                                            <List
                                                dataSource={questions}
                                                renderItem={(question, index) => (
                                                    <List.Item>
                                                        <Card
                                                            size="small"
                                                            style={{ width: '100%' }}
                                                            title={
                                                                <Space>
                                                                    <Text strong>Вопрос {index + 1}</Text>
                                                                </Space>
                                                            }
                                                            extra={
                                                                <Space>
                                                                    <Button
                                                                        type="default"
                                                                        icon={<EditOutlined />}
                                                                        size="middle"
                                                                        onClick={() => handleEditQuestion(question.id)}
                                                                    >
                                                                        Редактировать
                                                                    </Button>
                                                                    <Button
                                                                        type="primary"
                                                                        danger
                                                                        icon={<DeleteOutlined />}
                                                                        size="middle"
                                                                        onClick={() => handleDeleteWithConfirm(question.id, question.text)}
                                                                    />
                                                                </Space>
                                                            }
                                                        >
                                                            <Paragraph style={{ marginBottom: 8 }}>
                                                                {question.text}
                                                            </Paragraph>
                                                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                                                {question.options?.map((option, optIndex) => (
                                                                    <Text
                                                                        key={option.id || optIndex}
                                                                        style={{
                                                                            display: 'block',
                                                                            padding: '4px 8px',
                                                                            backgroundColor: '#f5f5f5',
                                                                            borderRadius: '4px'
                                                                        }}
                                                                    >
                                                                        {optIndex + 1}. {option.text}
                                                                    </Text>
                                                                ))}
                                                            </Space>
                                                        </Card>
                                                    </List.Item>
                                                )}
                                            />
                                        )}
                                    </Space>
                                </Card>
                            </Col>
                        </Row>

                        {/* Модальное окно редактирования вопроса */}
                        <Modal
                            title="Редактировать вопрос"
                            open={editModalVisible}
                            onCancel={() => {
                                setEditModalVisible(false);
                                setEditingQuestion(null);
                                editForm.resetFields();
                            }}
                            onOk={handleSaveEdit}
                            confirmLoading={loadingEdit}
                            width={800}
                            okText="Сохранить"
                            cancelText="Отмена"
                        >
                            {editingQuestion && (
                                <Form
                                    form={editForm}
                                    layout="vertical"
                                    autoComplete="off"
                                >
                                    {/* Текст вопроса */}
                                    <Form.Item
                                        name="text"
                                        label="Текст вопроса"
                                        rules={[
                                            { required: true, message: 'Введите текст вопроса!' },
                                            { max: 500, message: 'Текст не должен превышать 500 символов' }
                                        ]}
                                    >
                                        <TextArea
                                            placeholder="Введите текст вопроса"
                                            rows={3}
                                            showCount
                                            maxLength={500}
                                        />
                                    </Form.Item>

                                    {/* Тип вопроса */}
                                    <Form.Item
                                        label="Тип вопроса"
                                    >
                                        <Radio.Group
                                            value={editQuestionType}
                                            onChange={(e) => {
                                                setEditQuestionType(e.target.value);
                                                // Сбрасываем выбор правильных ответов при смене типа
                                                const options = editForm.getFieldValue('options') || [];
                                                editForm.setFieldsValue({
                                                    options: options.map(opt => ({ ...opt, isCorrect: false }))
                                                });
                                            }}
                                        >
                                            <Radio value={0}>
                                                <Space>
                                                    <CheckCircleOutlined />
                                                    <Text>Один вариант ответа</Text>
                                                </Space>
                                            </Radio>
                                            <Radio value={1}>
                                                <Space>
                                                    <CheckOutlined />
                                                    <Text>Несколько верных вариантов</Text>
                                                </Space>
                                            </Radio>
                                        </Radio.Group>
                                    </Form.Item>

                                    {/* Варианты ответа */}
                                    <Form.Item
                                        label="Варианты ответа"
                                        required
                                    >
                                        <Form.List name="options">
                                            {(fields, { add, remove }) => (
                                                <>
                                                    {fields.map(({ key, name, ...restField }) => (
                                                        <Card
                                                            key={key}
                                                            size="small"
                                                            style={{ marginBottom: 8 }}
                                                            extra={
                                                                fields.length > 2 && (
                                                                    <Button
                                                                        type="text"
                                                                        danger
                                                                        icon={<DeleteOutlined />}
                                                                        onClick={() => remove(name)}
                                                                        size="small"
                                                                    />
                                                                )
                                                            }
                                                        >
                                                            <Row gutter={8} align="middle">
                                                                <Col flex="auto">
                                                                    <Form.Item
                                                                        {...restField}
                                                                        name={[name, 'text']}
                                                                        rules={[
                                                                            { required: true, message: 'Введите вариант ответа!' }
                                                                        ]}
                                                                        style={{ marginBottom: 0 }}
                                                                    >
                                                                        <Input
                                                                            placeholder={`Вариант ответа ${name + 1}`}
                                                                        />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col>
                                                                    <Form.Item
                                                                        {...restField}
                                                                        name={[name, 'isCorrect']}
                                                                        valuePropName="checked"
                                                                        style={{ marginBottom: 0 }}
                                                                    >
                                                                        <Checkbox>
                                                                            {editQuestionType === 0 ? 'Правильный' : 'Верный'}
                                                                        </Checkbox>
                                                                    </Form.Item>
                                                                </Col>
                                                            </Row>
                                                        </Card>
                                                    ))}
                                                    <Button
                                                        type="dashed"
                                                        onClick={() => add()}
                                                        block
                                                        icon={<PlusOutlined />}
                                                        style={{ marginTop: 8 }}
                                                    >
                                                        Добавить вариант ответа
                                                    </Button>
                                                </>
                                            )}
                                        </Form.List>
                                    </Form.Item>
                                </Form>
                            )}
                        </Modal>
                    </>
                )}
            </Content>
        </Layout>
    );
}