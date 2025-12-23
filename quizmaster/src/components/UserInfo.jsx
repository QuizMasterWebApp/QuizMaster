import React, { useState, useEffect } from 'react';
import { Avatar, Dropdown, Space, Typography, Button, Modal, Input, Form, message } from 'antd';
import { UserOutlined, SettingOutlined, LogoutOutlined, LoginOutlined, KeyOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';

import { useUsers } from '../hooks/useUsers.jsx';
import ProfileModal from './ProfileModal.jsx';
import * as quizApi from '../API methods/quizMethods.jsx';

const { Text } = Typography;

const UserInfo = () => {
  const navigate = useNavigate();
  const { GetUserIdFromJWT, getUserInfo, logoutUser, userPicture, checkToken } = useUsers();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [privateKeyModalVisible, setPrivateKeyModalVisible] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const token = await checkToken();
    
    if (token) {
      try {
        setIsAuthenticated(true);
        const userid = GetUserIdFromJWT(token);
        const user = await getUserInfo(userid);
  
        setUserName(user?.name || 'Пользователь');
        setUserId(user?.id);
      } catch (error) {
        console.error('Ошибка декодирования токена:', error);
        handleLogout();
      }
    } else {
      setIsAuthenticated(false);
      setUserName('');
      setUserId(null);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = () => {
    logoutUser();
    setIsAuthenticated(false);
    setUserName('');
    setUserId(null);
    navigate('/');
  };

  const handleUpdateUser = (updatedData) => {
    if (updatedData.userName) {
      setUserName(updatedData.userName);
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Настройки профиля',
      onClick: () => setProfileModalVisible(true)
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      danger: true,
      onClick: handleLogout
    },
  ];

  return (
    <>
      {isAuthenticated ? (
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
          <Space style={{ cursor: 'pointer', padding: '0 8px' }}>
            <Avatar 
              icon={<UserOutlined />}
              style={{ 
                backgroundColor: '#1890ff',
                color: '#fff'
              }}
              src={userId ? userPicture(userId) : null}
            />
            <Text strong>{userName}</Text>
          </Space>
        </Dropdown>
      ) : (
        <Button 
          type="primary" 
          icon={<LoginOutlined />}
          onClick={handleLogin}
        >
          Войти
        </Button>
      )}

      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        userId={userId}
        userName={userName}
        onUpdateUser={handleUpdateUser}
      />
    </>
  );
};

export default UserInfo;