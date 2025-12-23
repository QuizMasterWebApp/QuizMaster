import React, { useEffect, useState } from 'react';
import { 
    Row, Col, Layout, Typography, Empty, Card, Button, 
    Space, message, Select, Spin, Flex 
} from 'antd';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

import { KeyOutlined } from '@ant-design/icons';

// Компоненты
import QuizCard from '../components/quizCard';
import HeaderComponent from '../components/HeaderComponent';
import { useIsPortrait } from '../hooks/usePortain';
import { useUsers } from '../hooks/useUsers';

// Методы
import { useQuizes } from '../hooks/useQuizes';
import { getCategoryName, formatCategoriesFromApi } from '../utils/categoryUtils';

import { Form, Input, Alert, Modal } from 'antd';
import { InfoCircleOutlined, LinkOutlined } from '@ant-design/icons';
import { usePrivateQuizAccess } from '../hooks/usePrivateQuizAccess';

const { Title } = Typography;
const { Option } = Select;

export default function Catalog() {
    const { quizzes, loading, error, getAllQuizzes, getAllCategories, categories } = useQuizes();
    const navigate = useNavigate();
    const [filteredQuizzes, setFilteredQuizzes] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [availableCategories, setAvailableCategories] = useState([]);
    const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
    const isPortrait = useIsPortrait();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { checkToken } = useUsers()

    useEffect(() => {
        checkAuth();
        loadQuizzes();
        loadCategories();
    }, []);

    const checkAuth = async () => {
        const token = await checkToken();
        if (!token) {
            setIsAuthenticated(false);
        } else {
            setIsAuthenticated(true);
        }
    }

    // Преобразуем категории в нужный формат
    useEffect(() => {
        if (categories && categories.length > 0) {
            console.log('Доступные категории из API (оригинальные):', categories);
            
            // Используем утилиту для форматирования категорий
            const formattedCategories = formatCategoriesFromApi(categories);
            
            console.log('Форматированные категории:', formattedCategories);
            
            // Преобразуем в формат для Select
            const selectCategories = formattedCategories.map(cat => ({
                value: cat.categoryType,
                label: cat.displayName // Используем русские названия из утилиты
            }));
            
            console.log('Категории для Select:', selectCategories);
            setAvailableCategories(selectCategories);
        } else {
            console.log('Категории пустые или не загрузились, используем стандартные');
            // Стандартные категории для fallback - используем русские названия из утилиты
            const defaultCategories = [
                { value: 0, label: 'Общее' },
                { value: 1, label: 'Наука' },
                { value: 2, label: 'История' },
                { value: 3, label: 'Искусство' },
                { value: 4, label: 'География' },
                { value: 5, label: 'Спорт' },
                { value: 7, label: 'Технологии' }
            ];
            setAvailableCategories(defaultCategories);
        }
    }, [categories]);

    // При изменении списка квизов или выбранной категории фильтруем
    useEffect(() => {
        console.log('Фильтрация квизов:', {
            selectedCategory,
            totalQuizzes: quizzes.length,
            firstQuizCategory: quizzes[0]?.category
        });
        
        if (selectedCategory !== null && selectedCategory !== undefined) {
            const filtered = quizzes.filter(quiz => {
                // Проверяем, что у квиза есть категория и она совпадает с выбранной
                const hasCategory = quiz.category !== undefined && quiz.category !== null;
                const matchesCategory = quiz.category === selectedCategory;
                
                console.log(`Квиз ${quiz.id} (${quiz.title}): category=${quiz.category}, matches=${matchesCategory}`);
                return hasCategory && matchesCategory;
            });
            
            console.log('Отфильтрованные квизы:', filtered);
            setFilteredQuizzes(filtered);
        } else {
            console.log('Показываем все квизы:', quizzes.length);
            setFilteredQuizzes(quizzes);
        }
    }, [quizzes, selectedCategory]);

    const loadQuizzes = async () => {
        try {
            await getAllQuizzes();
        } catch (error) {
            console.error("Ошибка при загрузке квизов:", error);
        }
    };

    const loadCategories = async () => {
        setCategoriesLoading(true);
        try {
            console.log('Загрузка категорий...');
            const loadedCategories = await getAllCategories();
            console.log('Загруженные категории в loadCategories:', loadedCategories);
        } catch (error) {
            console.error("Ошибка при загрузке категорий:", error);
        } finally {
            setCategoriesLoading(false);
        }
    };

    const handleCreateQuiz = () => {
        if (!isAuthenticated) {
            message.warning('Для создания квиза необходимо войти в аккаунт');
        } else {
            navigate('/newquiz');
        }
    };

    const handleMyQuizzes = () => {
        if (!isAuthenticated) {
            message.warning('Для просмотра своих квизов необходимо войти в аккаунт');
        } else {
            navigate('/myquizzes');
        }
    };

    const handlePrivateKeyClick = () => {
        setShowPrivateKeyModal(true);
    };

    const handleCategoryChange = (value) => {
        console.log('Выбрана категория:', value, getCategoryName(value));
        setSelectedCategory(value);
    };

    const clearFilter = () => {
        setSelectedCategory(null);
    };

    // Получаем название выбранной категории для отображения
    const getSelectedCategoryName = () => {
        if (selectedCategory === null || selectedCategory === undefined) return null;
        
        // Используем утилиту для получения русского названия
        return getCategoryName(selectedCategory);
    };

    // Для отладки - логируем информацию о категориях квизов
    useEffect(() => {
        if (quizzes.length > 0) {
            console.log('Категории в квизах:');
            const categoryCounts = {};
            quizzes.forEach(quiz => {
                const category = quiz.category !== undefined ? quiz.category : 'undefined';
                if (!categoryCounts[category]) {
                    categoryCounts[category] = 0;
                }
                categoryCounts[category]++;
                
                // Если category это число, получаем его название
                if (typeof category === 'number') {
                    console.log(`  Квиз ${quiz.id}: category=${category} (${getCategoryName(category)})`);
                }
            });
            console.log('Распределение по категориям:', categoryCounts);
        }
    }, [quizzes]);

    return (
        <Layout>
            <Card 
                style={{ 
                    margin: '16px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#f0f2f5'
                }}
                styles={{ body: { padding: '16px 24px' } }}
            >
                <Flex justify="space-between" align="center" wrap="wrap" gap="middle">
                    <Typography.Text style={{ fontSize: '16px' }}>
                        Создание квизов: Вы можете создать свои уникальные викторины и отслеживать статистику прохождения
                    </Typography.Text>
                    <Space>
                        <Button size='large' type="primary" onClick={handleCreateQuiz}>Создать квиз</Button>
                        <Button size='large' onClick={handleMyQuizzes}>Мои квизы</Button>
                    </Space>
                </Flex>
            </Card>

            {/* Новая плашка для приватных квизов */}
            <Card 
                style={{ 
                    margin: '0px 16px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#fff7e6',
                    border: '1px solid #ffd591'
                }}
                styles={{ body: { padding: '12px 24px' } }}
            >
                <Flex justify="space-between" align="center" wrap="wrap" gap="middle">
                    <Space direction="vertical" size="small">
                        <Typography.Text style={{ fontSize: '15px', fontWeight: 500 }}>
                            Доступ к приватным квизам
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
                            Есть ключ доступа? Присоединяйтесь к приватным квизам по приглашению
                        </Typography.Text>
                    </Space>
                    <Button 
                        type="primary" 
                        icon={<KeyOutlined />}
                        onClick={handlePrivateKeyClick}
                        style={{ 
                            backgroundColor: '#fa8c16',
                            borderColor: '#fa8c16'
                        }}
                    >
                        Ввести ключ доступа
                    </Button>
                </Flex>
            </Card>

            <div style={{ padding: isPortrait ? '0px 16px' : '0px 24px' }}>
                <Flex justify="space-between" align="center" wrap="wrap" gap="middle" style={{ marginBottom: 24 }}>
                    <Title level={2} style={{ margin: 0 }}>
                        Все квизы
                        {selectedCategory !== null && selectedCategory !== undefined && (
                            <span style={{ fontSize: '18px', color: '#666', marginLeft: 12 }}>
                                ({getSelectedCategoryName()})
                            </span>
                        )}
                    </Title>
                    
                    <Space>
                        <Select
                            placeholder="Фильтр по категории"
                            style={{ width: 250 }}
                            value={selectedCategory}
                            onChange={handleCategoryChange}
                            loading={categoriesLoading}
                            allowClear
                            onClear={clearFilter}
                        >
                            <Option key="all" value={null}>
                                Все категории
                            </Option>
                            {availableCategories.map(category => (
                                <Option key={`cat-${category.value}`} value={category.value}>
                                    {category.label}
                                </Option>
                            ))}
                        </Select>
                        
                        {selectedCategory !== null && selectedCategory !== undefined && (
                            <Button onClick={clearFilter}>
                                Сбросить фильтр
                            </Button>
                        )}
                    </Space>
                </Flex>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Spin size="large" />
                        <p style={{ marginTop: 16 }}>Загрузка квизов...</p>
                    </div>
                ) : error ? (
                    <Empty description="Ошибка при загрузке квизов" />
                ) : filteredQuizzes.length === 0 ? (
                    <Empty 
                        description={
                            selectedCategory !== null && selectedCategory !== undefined 
                                ? `Нет квизов в категории "${getSelectedCategoryName()}"` 
                                : "Квизов пока нет"
                        } 
                        style={{ marginTop: 40 }}
                    >
                        {selectedCategory !== null && selectedCategory !== undefined && (
                            <Button onClick={clearFilter}>
                                Показать все квизы
                            </Button>
                        )}
                    </Empty>
                ) : (
                    <Row gutter={[24, 24]}>
                        {filteredQuizzes
                            .filter(quiz => quiz.questionsCount > 0)  // Фильтрация
                            .map(quiz => (
                                <Col key={quiz.id} xs={24} sm={12} md={8} lg={6}>
                                    <QuizCard quiz={quiz} />
                                </Col>
                            ))}
                    </Row>
                )}
            </div>

            {/* Модальное окно для ввода ключа приватного квиза */}
            {showPrivateKeyModal && (
                <PrivateQuizKeyModal 
                    visible={showPrivateKeyModal}
                    onClose={() => setShowPrivateKeyModal(false)}
                />
            )}
        </Layout>
    );
}

// Компонент модального окна для ввода ключа приватного квиза
const PrivateQuizKeyModal = ({ visible, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { connectToQuizByCode } = useQuizes();
    const { setSavedAccessKey } = usePrivateQuizAccess();

    // Автофокус при открытии
    useEffect(() => {
        if (visible) {
            setTimeout(() => {
                const input = document.querySelector('#quiz-key-input');
                if (input) input.focus();
            }, 100);
        } else {
            form.resetFields();
        }
    }, [visible]);

    const handleConnect = async (values) => {
        setLoading(true);
        try {
            const { key } = values;
            
            // Проверяем валидность ключа (5 символов)
            if (!key || key.length !== 5) {
                message.error('Ключ должен состоять из 5 символов');
                return;
            }

            // Используем метод подключения по коду
            const quizInfo = await connectToQuizByCode(key.toUpperCase());
            setSavedAccessKey(quizInfo.quizId, key)
            message.success('Подключение успешно!');
            onClose();
            
            // Перенаправляем на страницу квиза
            navigate(`/quiz/${quizInfo.quizId}`);
            
        } catch (error) {
            console.error('Ошибка подключения:', error);
            
            if (error.response?.status === 404) {
                message.error('Квиз с таким ключом не найден');
            } else if (error.response?.status === 403) {
                message.error('Нет доступа к этому квизу');
            } else {
                message.error(error.response?.data || 'Неверный ключ доступа');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain').toUpperCase();
        form.setFieldValue('key', text.slice(0, 5));
    };

    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <KeyOutlined style={{ color: '#1890ff' }} />
                    <span>Подключиться к приватному квизу</span>
                </div>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            width={500}
            centered
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleConnect}
                autoComplete="off"
            >
                <Form.Item
                    name="key"
                    label="Ключ доступа"
                    rules={[
                        { required: true, message: 'Введите ключ доступа' },
                        { len: 5, message: 'Ключ должен содержать 5 символов' },
                        {
                            pattern: /^[A-Z0-9]+$/,
                            message: 'Только заглавные буквы и цифры'
                        }
                    ]}
                >
                    <Input
                        id="quiz-key-input"
                        placeholder="ABCDE"
                        maxLength={5}
                        style={{ 
                            textTransform: 'uppercase',
                            fontFamily: 'monospace',
                            fontSize: '18px',
                            letterSpacing: '4px',
                            textAlign: 'center'
                        }}
                        onPaste={handlePaste}
                        suffix={
                            <Button 
                                type="text" 
                                size="small"
                                onClick={() => {
                                    const text = form.getFieldValue('key') || '';
                                    navigator.clipboard.writeText(text);
                                    message.success('Скопировано в буфер обмена');
                                }}
                            >
                                Копировать
                            </Button>
                        }
                    />
                </Form.Item>

                <Form.Item>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button onClick={onClose} style={{ flex: 1 }}>
                            Отмена
                        </Button>
                        <Button 
                            type="primary" 
                            htmlType="submit"
                            loading={loading}
                            style={{ flex: 1 }}
                        >
                            Подключиться
                        </Button>
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    );
};