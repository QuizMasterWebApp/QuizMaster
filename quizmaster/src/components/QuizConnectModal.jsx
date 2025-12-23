import React, { useState } from 'react';
import { Modal, Input, Button, Form, message, Typography } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import * as api from '../API methods/quizMethods.jsx';

const { Text } = Typography;

const QuizConnectModal = ({ visible, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const handleConnect = async (values) => {
        setLoading(true);
        try {
            const quizInfo = await api.connectToQuizByCode(values.code);
            message.success('Подключение успешно!');
            onClose();
            navigate(`/quiz/${quizInfo.quizId}?accessKey=${quizInfo.accessKey}`);
        } catch (error) {
            message.error(error.response?.data || 'Неверный код доступа');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={
                <span>
                    <LinkOutlined /> Подключиться к квизу
                </span>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleConnect}
            >
                <Form.Item
                    name="code"
                    label="Введите код доступа"
                    rules={[
                        { required: true, message: 'Введите код доступа' },
                        { len: 5, message: 'Код должен содержать 5 символов' }
                    ]}
                >
                    <Input
                        placeholder="ABCDE"
                        maxLength={5}
                        style={{ textTransform: 'uppercase' }}
                    />
                </Form.Item>

                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Код доступа должен состоять из 5 символов (буквы и цифры)
                </Text>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                    >
                        Подключиться
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default QuizConnectModal;