import React, { useState, useEffect } from 'react';
import { 
    Modal, Form, Input, Button, message, Avatar, Space, 
    Typography, Divider, Alert, Tabs, Card,
    Flex
} from 'antd';
import { 
    UserOutlined, LockOutlined, SaveOutlined, 
    CheckCircleOutlined, KeyOutlined, SafetyOutlined,
    CloseOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import apiClient from '../API methods/.APIclient';
import { useUsers } from '../hooks/useUsers';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ProfileModal = ({ 
    visible, 
    onClose, 
    userId, 
    userName, 
    onUpdateUser 
}) => {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [userData, setUserData] = useState(null);
    const { checkToken, changeUsername, changePassword, getUserInfo } = useUsers();

    // Загружаем данные пользователя при открытии модального окна
    useEffect(() => {
        if (visible && userId) {
            loadUserData();
        }
    }, [visible, userId]);

    // Сброс форм при закрытии модального окна
    useEffect(() => {
        if (!visible) {
            form.resetFields();
            passwordForm.resetFields();
        }
    }, [visible]);

    const loadUserData = async () => {
        try {
            const token = await checkToken();
            if (!token) return;

            const userdata = await getUserInfo(userId);
            setUserData(userdata);
            form.setFieldsValue({
                userName: userdata.name || userName || ''
            });
        } catch (error) {
            console.error('Ошибка загрузки данных пользователя:', error);
            message.error('Не удалось загрузить данные профиля');
        }
    };

    // Обработчик изменения профиля (только имя пользователя)
    const handleProfileUpdate = async (values) => {
        setLoading(true);
        try {
            const token = await checkToken();
            if (!token) {
                message.error('Требуется авторизация');
                return;
            }

            // Проверяем, действительно ли изменилось имя
            const newUserName = values.userName?.trim();
            if (!newUserName || newUserName === userName) {
                message.info('Нет изменений для сохранения');
                return;
            }

            // Подготавливаем данные для отправки
            const updateData = {
                userName: newUserName
            };

            console.log('Обновление профиля:', {
                userId,
                updateData,
                currentName: userName
            });

            // Используем метод из usersMethods
            const response = await changeUsername(token, userId, newUserName);

            message.success('Профиль успешно обновлен!');
            
            // Обновляем данные в родительском компоненте
            if (onUpdateUser) {
                onUpdateUser({ 
                    userName: newUserName 
                });
            }
            
            // Обновляем локальное состояние
            setUserData(prev => ({
                ...prev,
                userName: newUserName
            }));

            // Закрываем модальное окно
            setTimeout(() => {
                onClose();
                form.resetFields();
            }, 500);

        } catch (error) {
            console.error('Полная ошибка обновления профиля:', error);
            
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                if (errorData.includes('UserName') || errorData.includes('username')) {
                    message.error('Этот никнейм уже занят. Выберите другой.');
                } else {
                    message.error('Некорректные данные. Проверьте введенные значения.');
                }
            } else if (error.response?.status === 401) {
                message.error('Ошибка авторизации. Пожалуйста, войдите снова.');
                Cookies.remove('token');
                window.location.href = '/login';
            } else if (error.response?.status === 404) {
                message.error('Пользователь не найден.');
            } else if (error.response?.status === 500) {
                message.error('Ошибка сервера. Попробуйте позже.');
            } else {
                message.error('Не удалось обновить профиль');
            }
        } finally {
            setLoading(false);
        }
    };

    // Обработчик изменения пароля с проверкой старого пароля
    const handlePasswordChange = async (values) => {
        console.log('handlePasswordChange вызван с значениями:', values);
        setPasswordLoading(true);
        try {
            const token = await checkToken();
            if (!token) {
                message.error('Требуется авторизация');
                setPasswordLoading(false);
                return;
            }

            // Проверяем обязательные поля
            if (!values.oldPassword) {
                message.error('Введите текущий пароль');
                setPasswordLoading(false);
                return;
            }

            if (!values.newPassword || values.newPassword.length < 6) {
                message.error('Новый пароль должен содержать минимум 6 символов');
                setPasswordLoading(false);
                return;
            }

            // Проверяем, что новый пароль отличается от старого
            if (values.oldPassword === values.newPassword) {
                message.error('Новый пароль должен отличаться от старого');
                setPasswordLoading(false);
                return;
            }

            // Подготавливаем данные согласно API спецификации
            const updateData = {
                oldPassword: values.oldPassword,
                password: values.newPassword
            };

            console.log('Изменение пароля для пользователя:', userId, updateData);

            // Используем метод обновления профиля
            const response = await changePassword(token, userId, values.oldPassword, values.newPassword);

            message.success('Пароль успешно изменен!');
            
            // Сбрасываем форму
            passwordForm.resetFields();
            
            // Закрываем модальное окно
            onClose();
            
            // Рекомендуется выйти пользователя после смены пароля
            setTimeout(() => {
                // message.info('Для безопасности, пожалуйста, войдите с новым паролем.');
                Cookies.remove('token');
                navigate('/login');
            }, 100);

        } catch (error) {
            console.error('Ошибка смены пароля:', error);
            
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                if (typeof errorData === 'string') {
                    if (errorData.includes('OldPassword') || errorData.includes('старый пароль') || errorData.includes('неверный')) {
                        message.error('Неверный текущий пароль');
                    } else if (errorData.includes('Password') || errorData.includes('пароль')) {
                        message.error('Новый пароль не соответствует требованиям');
                    } else {
                        message.error(errorData);
                    }
                } else if (errorData.errors) {
                    // Если ошибки в виде объекта
                    const errorMessages = Object.values(errorData.errors).flat();
                    message.error(errorMessages[0] || 'Ошибка при смене пароля');
                } else {
                    message.error('Некорректные данные пароля');
                }
            } else if (error.response?.status === 401) {
                message.error('Сессия истекла. Пожалуйста, войдите снова.');
                Cookies.remove('token');
                window.location.href = '/login';
            } else if (error.response?.status === 500) {
                message.error('Ошибка сервера при изменении пароля');
            } else {
                message.error('Не удалось изменить пароль');
            }
        } finally {
            setPasswordLoading(false);
        }
    };

    // Валидация пароля
    const validatePassword = (_, value) => {
        if (!value || value.length >= 6) {
            return Promise.resolve();
        }
        return Promise.reject(new Error('Пароль должен содержать минимум 6 символов'));
    };

    const validateConfirmPassword = ({ getFieldValue }) => ({
        validator(_, value) {
            if (!value || getFieldValue('newPassword') === value) {
                return Promise.resolve();
            }
            return Promise.reject(new Error('Пароли не совпадают'));
        },
    });

    // Проверка, что новый пароль отличается от старого
    const validateNewPasswordDifferent = ({ getFieldValue }) => ({
        validator(_, value) {
            if (!value) {
                return Promise.resolve();
            }
            const oldPassword = getFieldValue('oldPassword');
            if (!oldPassword) {
                return Promise.resolve();
            }
            if (oldPassword === value) {
                return Promise.reject(new Error('Новый пароль должен отличаться от старого'));
            }
            return Promise.resolve();
        },
    });

    // Обработчик закрытия модального окна
    const handleCancel = () => {
        form.resetFields();
        passwordForm.resetFields();
        onClose();
    };

    // Обработчик отмены на вкладке безопасности
    const handleSecurityCancel = () => {
        passwordForm.resetFields();
        onClose();
    };

    // Обработчик отмены на вкладке профиля
    const handleProfileCancel = () => {
        form.resetFields();
        onClose();
    };

    return (
        <Modal
            title={
                <Space>
                    <UserOutlined />
                    <span>Профиль пользователя</span>
                </Space>
            }
            open={visible}
            onCancel={handleCancel}
            footer={null}
            width={600}
            centered
            destroyOnHidden
            maskClosable={false}
        >
            <div style={{ padding: '10px 0' }}>
                {/* Аватар и основная информация */}
                <Card 
                    style={{ 
                        marginBottom: 20,
                        backgroundColor: '#fafafa',
                        border: '1px solid #e8e8e8'
                    }}
                    bodyStyle={{ padding: '16px' }}
                >
                    <Space align="center" style={{ width: '100%' }}>
                        <Avatar 
                            size={64}
                            icon={<UserOutlined />}
                            src={userId ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}` : null}
                            style={{ 
                                backgroundColor: '#1890ff',
                                color: '#fff',
                                fontSize: '28px'
                            }}
                        />
                        <Space direction="vertical" size={0}>
                            <Text strong style={{ fontSize: '18px' }}>
                                {userName || 'Пользователь'}
                            </Text>
                            <Text type="secondary">
                                ID: {userId}
                            </Text>
                        </Space>
                    </Space>
                </Card>

                {/* Табы для навигации */}
                <Tabs 
                    activeKey={activeTab} 
                    onChange={setActiveTab}
                    centered
                    style={{ marginBottom: 20 }}
                    destroyOnHidden={true}
                >
                    <TabPane 
                        tab={
                            <Flex gap='6px'>
                                <UserOutlined />
                                Профиль
                            </Flex>
                        } 
                        key="profile"
                    />
                    <TabPane 
                        tab={
                            <Flex gap='6px'>
                                <LockOutlined />
                                Безопасность
                            </Flex>
                        } 
                        key="security"
                    />
                </Tabs>

                {/* Вкладка профиля */}
                {activeTab === 'profile' && (
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleProfileUpdate}
                        initialValues={{
                            userName: userName || ''
                        }}
                    >
                        <Form.Item
                            label="Имя пользователя (никнейм)"
                            name="userName"
                            rules={[
                                { required: true, message: 'Введите имя пользователя' },
                                { min: 3, message: 'Минимум 3 символа' },
                                { max: 50, message: 'Максимум 50 символов' }
                            ]}
                        >
                            <Input 
                                prefix={<UserOutlined />}
                                placeholder="Введите новый никнейм"
                                size="large"
                            />
                        </Form.Item>

                        <Alert
                            title="Информация"
                            description="После изменения никнейма вы будете отображаться с новым именем во всех квизах и результатах."
                            type="info"
                            showIcon
                            style={{ marginBottom: 20 }}
                        />

                        <div style={{ textAlign: 'right', marginTop: 20 }}>
                            <Space>
                                <Button 
                                    onClick={handleProfileCancel}
                                    icon={<CloseOutlined />}
                                >
                                    Отмена
                                </Button>
                                <Button 
                                    type="primary" 
                                    htmlType="submit"
                                    loading={loading}
                                    icon={<SaveOutlined />}
                                >
                                    Сохранить изменения
                                </Button>
                            </Space>
                        </div>
                    </Form>
                )}

                {/* Вкладка безопасности */}
                {activeTab === 'security' && (
                    <Form
                        form={passwordForm}
                        layout="vertical"
                        onFinish={handlePasswordChange}
                        onFinishFailed={(errorInfo) => {
                            console.log('Ошибка валидации формы пароля:', errorInfo);
                            message.error('Пожалуйста, заполните все поля корректно');
                        }}
                    >
                        <Form.Item
                            label="Текущий пароль"
                            name="oldPassword"
                            rules={[
                                { required: true, message: 'Введите текущий пароль' }
                            ]}
                        >
                            <Input.Password 
                                prefix={<LockOutlined />}
                                placeholder="Введите текущий пароль"
                                size="large"
                            />
                        </Form.Item>

                        <Divider />

                        <Form.Item
                            label="Новый пароль"
                            name="newPassword"
                            dependencies={['oldPassword']}
                            rules={[
                                { required: true, message: 'Введите новый пароль' },
                                { validator: validatePassword }
                            ]}
                        >
                            <Input.Password 
                                prefix={<KeyOutlined />}
                                placeholder="Введите новый пароль"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Подтвердите новый пароль"
                            name="confirmPassword"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true, message: 'Подтвердите новый пароль' },
                                validateConfirmPassword
                            ]}
                        >
                            <Input.Password 
                                prefix={<CheckCircleOutlined />}
                                placeholder="Повторите новый пароль"
                                size="large"
                            />
                        </Form.Item>

                        <Alert
                            title="Информация"
                            description={<>
                                <p style={{marginBottom: 0}}>Пароль должен содержать минимум 6 символов. Рекомендуем использовать комбинацию букв, цифр и специальных символов.</p>
                                <p style={{marginBottom: 0}}>После успешной смены пароля вы будете перенаправлены на страницу входа для повторной авторизации.</p></>
                            }
                            type="info"
                            showIcon
                            style={{ marginBottom: 20 }}
                        />

                        <div style={{ textAlign: 'right', marginTop: 20 }}>
                            <Space>
                                <Button 
                                    onClick={handleSecurityCancel}
                                    icon={<CloseOutlined />}
                                >
                                    Отмена
                                </Button>
                                <Button 
                                    type="primary" 
                                    htmlType="submit"
                                    loading={passwordLoading}
                                    icon={<SafetyOutlined />}
                                    danger
                                >
                                    Изменить пароль
                                </Button>
                            </Space>
                        </div>
                    </Form>
                )}
            </div>
        </Modal>
    );
};

export default ProfileModal;