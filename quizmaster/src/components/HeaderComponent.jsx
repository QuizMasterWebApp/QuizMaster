import React, { useState, useEffect } from 'react';
import { Layout, Flex, Button, Avatar, Dropdown, Space, Typography } from 'antd';
import { 
    HomeOutlined, FileTextOutlined, TrophyOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';

// Методы
import { useUsers } from '../hooks/useUsers.jsx'; 
import UserInfo from './UserInfo.jsx';

const { Header } = Layout;

const HeaderStyle = {
  backgroundColor: '#fff',
  padding: '0 24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  height: '64px',
  lineHeight: '64px',
  position: 'sticky',
  top: 0,
  zIndex: 1000,
};

const HeaderComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkToken } = useUsers();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // Проверяем наличие токена и декодируем его при загрузке
  useEffect(() => {
     checkAuthentication()
  }, []);

  const checkAuthentication = async () => {
    const token = await checkToken();
     if (token)
      setIsAuthenticated(true);
  }

  // Определяем активную вкладку на основе текущего пути
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setActiveTab('home');
    } else if (path === '/myquizzes') {
      setActiveTab('myquizzes');
    } else if (path === '/completedquizzes') {
      setActiveTab('completedquizzes');
    } else {
      setActiveTab('');
    }
  }, [location.pathname]);

  // Стили для активной вкладки
  const getTabStyle = (key) => ({
    height: '64px',
    lineHeight: '64px',
    padding: '0 16px',
    border: 'none',
    borderBottom: activeTab === key ? '2px solid #1890ff' : '2px solid transparent',
    borderRadius: 0,
    backgroundColor: 'transparent',
    color: activeTab === key ? '#1890ff' : 'rgba(0, 0, 0, 0.85)',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontWeight: activeTab === key ? 500 : 400,
  });

  const handleTabClick = (key) => {
    switch (key) {
      case 'home':
        navigate('/');
        break;
      case 'myquizzes':
        navigate('/myquizzes');
        break;
      case 'completedquizzes':
        navigate('/completedquizzes');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <Header style={HeaderStyle}>
        <Flex justify='space-between' align='center' style={{ width: '100%', height: '100%' }}>
          <Space size="small" style={{ flex: 1 }}>
            <Space size="small">
              <Button
                type="text"
                icon={<HomeOutlined />}
                style={getTabStyle('home')}
                onClick={() => handleTabClick('home')}
              >
                Главная
              </Button>
              {isAuthenticated && (
                <Button
                  type="text"
                  icon={<FileTextOutlined />}
                  style={getTabStyle('myquizzes')}
                  onClick={() => handleTabClick('myquizzes')}
                >
                  Мои квизы
                </Button>
              )}
              {isAuthenticated && (
                <Button
                  type="text"
                  icon={<TrophyOutlined />}
                  style={getTabStyle('completedquizzes')}
                  onClick={() => handleTabClick('completedquizzes')}
                >
                  Пройденные квизы
                </Button>
              )}
            </Space>
          </Space>
          
          {/* Кнопка пользователя */}
          <UserInfo/>

        </Flex>
      </Header>
    </>
  );
};

export default HeaderComponent;