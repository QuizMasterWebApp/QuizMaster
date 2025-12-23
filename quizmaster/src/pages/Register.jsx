import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
// Убираем этот импорт: import '@ant-design/v5-patch-for-react-19';

// Методы
import { useUsers } from '../hooks/useUsers.jsx';

// Компоненты
import AuthForm from '../components/AuthForm.jsx';

function Register() {
    const navigate = useNavigate();
    const { loading, registerUser } = useUsers();

    // Регистрация
    const onFinish = async (values) => {
        try {
            // Проверяем совпадение паролей
            if (values.password !== values.confirmPassword) {
                message.error('Пароли не совпадают!');
                return;
            }

            await registerUser(values);
            
            message.success('Регистрация успешна! Добро пожаловать!');
            
            // Перенаправляем на главную страницу
            navigate('/');
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            
            let errorMessage = 'Ошибка регистрации';
            
            if (error.response?.status === 400) {
                errorMessage = error.response.data?.message || 'Пользователь с таким именем уже существует';
            } else if (error.response?.status === 409) {
                errorMessage = 'Пользователь с таким именем уже существует';
            }
            
            message.error(errorMessage);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: 400,
                background: 'white',
                padding: 40,
                borderRadius: 12,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
                <AuthForm 
                    title="Регистрация" 
                    onFinish={onFinish}
                    buttonText="Зарегистрироваться" 
                    linkText="Уже есть аккаунт? Войти" 
                    linkTo="/login"
                    isRegistration={true}
                    loading={loading}
                /> 
            </div> 
        </div>
    );
}

export default Register;