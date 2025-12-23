import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
// Убираем этот импорт, если он не нужен: import '@ant-design/v5-patch-for-react-19';

// Методы
import { useUsers } from '../hooks/useUsers.jsx';

// Компоненты
import AuthForm from '../components/AuthForm.jsx';
import { usePrivateQuizAccess } from '../hooks/usePrivateQuizAccess.jsx';

function Login() {
    const navigate = useNavigate();
    const { loading, loginUser, GetUserIdFromJWT, getUserInfo, checkToken, getUserQuizzes} = useUsers();
    const { setSavedAccessKey } = usePrivateQuizAccess();

    const saveAccessKeys = async (token, userId) => {
        try {
            const quizzes = await getUserQuizzes(token, userId);
            if (!Array.isArray(quizzes)) return;

            const privateQuizzes = quizzes.filter(
                quiz => quiz.privateAccessKey
            );

            for (const quiz of privateQuizzes) {
                try {
                    setSavedAccessKey(quiz.id, quiz.privateAccessKey);
                } catch (err) {
                    console.warn(
                        `Не удалось сохранить ключ для квиза ${quiz.id}`,
                        err
                    );
                }
            }
        } catch (error) {
            console.error('Ошибка при сохранении ключей доступа к приватным квизам:', error);
        }
    };

    // Авторизация
    const onFinish = async (values) => {
        try {
            await loginUser(values, false);
            
            // Получаем информацию о пользователе для приветствия
            const token = await checkToken();
            const userId = GetUserIdFromJWT(token);
            let username = 'Пользователь';
            
            if (userId) {
                const userInfo = await getUserInfo(userId);
                username = userInfo?.username || userInfo?.name || 'Пользователь';
            }
            
            message.success(`Добро пожаловать, ${username}!`);
            
            // Перенаправляем на главную страницу
            navigate('/');
            await saveAccessKeys(token, userId)
        } catch (error) {
            console.error('Ошибка входа:', error);
            message.error(error.response?.data?.message || 'Неверный логин или пароль');
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                    title="Авторизация"
                    onFinish={onFinish}
                    buttonText="Войти"
                    linkText="Нет аккаунта? Зарегистрироваться"
                    linkTo="/register"
                    loading={loading}
                />
            </div>
        </div>
    );
}

export default Login;