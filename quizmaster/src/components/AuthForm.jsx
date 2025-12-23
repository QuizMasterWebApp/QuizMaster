import React from 'react';
import { Form, Input, Button, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

const AuthForm = ({ 
    title, 
    onFinish, 
    buttonText, 
    linkText, 
    linkTo,
    isRegistration = false,
    loading = false 
}) => {
    const [form] = Form.useForm();

    const onFinishFailed = (errorInfo) => {
        console.log('Failed:', errorInfo);
    };

    return (
        <div style={{ width: '100%' }}>
            <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
                {title}
            </Title>
            
            <Form
                form={form}
                name="auth-form"
                initialValues={{ remember: true }}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
                layout="vertical"
            >
                <Form.Item
                    name="username"
                    rules={[
                        { required: true, message: 'Введите имя пользователя!' },
                        { min: 3, message: 'Минимум 3 символа' },
                        { max: 20, message: 'Максимум 20 символов' }
                    ]}
                >
                    <Input 
                        prefix={<UserOutlined />} 
                        placeholder="Имя пользователя" 
                        size="large"
                    />
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[
                        { required: true, message: 'Введите пароль!' },
                        { min: 6, message: 'Минимум 6 символов' }
                    ]}
                >
                    <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="Пароль"
                        size="large"
                    />
                </Form.Item>

                {isRegistration && (
                    <Form.Item
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Подтвердите пароль!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Пароли не совпадают!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Подтвердите пароль"
                            size="large"
                        />
                    </Form.Item>
                )}

                <Form.Item>
                    <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={loading}
                        size="large"
                        block
                        style={{ marginTop: 8 }}
                    >
                        {buttonText}
                    </Button>
                </Form.Item>
            </Form>

            <Divider style={{ margin: '16px 0' }} />
            
            <div style={{ textAlign: 'center' }}>
                <Text>
                    <Link to={linkTo}>{linkText}</Link>
                </Text>
            </div>
        </div>
    );
};

export default AuthForm;