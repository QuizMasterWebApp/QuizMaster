import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthForm from '../AuthForm';

// Исправленные моки для antd
jest.mock('antd', () => {
    const React = require('react');
    
    return {
        Form: Object.assign(({ children, onFinish, onFinishFailed, layout, autoComplete }) => {
            const handleSubmit = (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const values = Object.fromEntries(formData.entries());
                
                // Эмуляция логики валидации antd для тестов
                let hasError = false;
                if (!values.username || values.username.length < 3 || values.username.length > 20) hasError = true;
                if (!values.password || values.password.length < 6) hasError = true;
                if (values.confirmPassword !== undefined && values.confirmPassword !== values.password) hasError = true;

                if (hasError) {
                    onFinishFailed?.({ errorFields: [{ name: ['error'] }] });
                } else {
                    onFinish?.(values);
                }
            };

            return (
                <form 
                    data-testid="form" 
                    onSubmit={handleSubmit} 
                    data-layout={layout} 
                    autoComplete={autoComplete}
                >
                    {children}
                </form>
            );
        }, {
            useForm: () => [ { resetFields: jest.fn(), setFieldsValue: jest.fn() } ],
            Item: ({ name, children, label }) => {
                // Клонируем дочерний элемент и ПЕРЕДАЕМ ему name, чтобы FormData его нашла
                return (
                    <div data-testid={`form-item-${name}`}>
                        {label && <label>{label}</label>}
                        {React.isValidElement(children) 
                            ? React.cloneElement(children, { name }) 
                            : children}
                    </div>
                );
            }
        }),
        Input: Object.assign(({ name, placeholder, size, onChange, type = 'text' }) => (
            <input
                name={name}
                data-testid="input"
                data-size={size}
                placeholder={placeholder}
                onChange={onChange}
                type={type}
            />
        ), {
            Password: ({ name, placeholder, size, onChange }) => (
                <input
                    name={name}
                    data-testid="input-password"
                    data-size={size}
                    type="password"
                    placeholder={placeholder}
                    onChange={onChange}
                />
            )
        }),
        Button: ({ type, htmlType, loading, children, block }) => (
            <button
                data-testid="button"
                data-type={type}
                data-loading={loading?.toString()}
                data-block={block?.toString()}
                type={htmlType || 'button'}
            >
                {children}
            </button>
        ),
        Typography: {
            Title: ({ children }) => <h3 data-testid="title">{children}</h3>,
            Text: ({ children }) => <span data-testid="text">{children}</span>,
        },
        Divider: () => <hr data-testid="divider" />,
    };
});

jest.mock('@ant-design/icons', () => ({
    UserOutlined: () => <span data-testid="user-icon" />,
    LockOutlined: () => <span data-testid="lock-icon" />,
    MailOutlined: () => <span data-testid="mail-icon" />,
}));

describe('AuthForm Component', () => {
    const mockOnFinish = jest.fn();
    const mockOnFinishFailed = jest.fn();

    const defaultProps = {
        title: 'Test Form',
        onFinish: mockOnFinish,
        onFinishFailed: mockOnFinishFailed,
        buttonText: 'Submit',
        linkText: 'Go to link',
        linkTo: '/test',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderForm = (props = {}) => render(
        <BrowserRouter>
            <AuthForm {...defaultProps} {...props} />
        </BrowserRouter>
    );

    test('вызывает onFinish при валидных данных', async () => {
        renderForm();
        
        fireEvent.change(screen.getByPlaceholderText('Имя пользователя'), { target: { value: 'testuser', name: 'username' } });
        fireEvent.change(screen.getByPlaceholderText('Пароль'), { target: { value: 'password123', name: 'password' } });
        
        fireEvent.submit(screen.getByTestId('form'));

        await waitFor(() => {
            expect(mockOnFinish).toHaveBeenCalledWith(expect.objectContaining({
                username: 'testuser',
                password: 'password123'
            }));
        });
    });
});