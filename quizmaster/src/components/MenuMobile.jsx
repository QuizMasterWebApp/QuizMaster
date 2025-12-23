import React, { useEffect, useState } from 'react';
import { Layout, Flex, Dropdown, Avatar, Button } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  TrophyOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  KeyOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import { useUsers } from '../hooks/useUsers';
import ProfileModal from './ProfileModal';

const { Footer } = Layout;

const FooterStyle = {
  background: '#282828',
  height: '56px',
  position: 'sticky',
  bottom: 0,
  padding: 0,
};

const MenuMobile = () => {
  const navigate = useNavigate();
  const { userPicture, GetUserIdFromJWT, getUserInfo, logoutUser, checkToken } = useUsers();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [profileModalVisible, setProfileModalVisible] = useState(false);

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
    
          setUserName(user.name || 'Профиль');
          setUserId(user.id);
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

  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveTab('home');
    else if (path === '/myquizzes') setActiveTab('myquizzes');
    else if (path === '/completedquizzes') setActiveTab('completedquizzes');
    else setActiveTab('');
  }, [location.pathname]);

  const handleNavigate = (key) => {
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

  // Функция обновления данных пользователя после изменения профиля
  const handleUpdateUser = (updatedData) => {
    if (updatedData.userName) {
      setUserName(updatedData.userName);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setIsAuthenticated(false);
    setUserName('');
    setUserId(null);
    navigate('/');
  };

  const profileMenuItems = [
    // {
    //   key: 'join',
    //   icon: <KeyOutlined style={{fontSize: 14}}/>,
    //   label: <span style={{ fontSize: 16}}>Ввести ключ приватного квиза</span>,
    //   onClick: () => navigate('/settings')
    // },
    {
      key: 'profile',
      icon: <UserOutlined style={{fontSize: 14}}/>,
      label: <span style={{ fontSize: 16 }}>Настройки профиля</span>,
      onClick: () => setProfileModalVisible(true)
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{fontSize: 14}}/>,
      danger: true,
      label: <span style={{ fontSize: 16 }}>Выйти</span>,
      onClick: () => handleLogout(),
    },
  ];

  const renderTab = (key, icon, label) => (
    <Flex
      vertical
      align="center"
      justify="center"
      onClick={() => handleNavigate(key)}
      style={{
        flex: 1,
        height: '100%',
        opacity: activeTab === key ? 1 : 0.6,
        cursor: 'pointer',
      }}
    >
      {React.cloneElement(icon, { style: { fontSize: 20, color: '#fff' } })}
      <span style={{ color: '#fff', fontSize: 12 }}>{label}</span>
    </Flex>
  );

  return (
    <Footer style={FooterStyle}>
      <Flex justify="space-between" align="center" style={{ height: '100%' }}>
        {renderTab('home', <HomeOutlined />, 'Главная')}

        {isAuthenticated &&
          renderTab('myquizzes', <FileTextOutlined />, 'Мои квизы')}

        {isAuthenticated &&
          renderTab('completedquizzes', <TrophyOutlined />, 'История')}

        {/* НЕ АВТОРИЗОВАН */}
        {!isAuthenticated && (
        <Button 
            type="primary" 
            size='large'
            icon={<LoginOutlined />}
            onClick={() => navigate('/login')}
            style={{
              flex: 1,
              cursor: 'pointer',
              margin: '6px',
              backgroundColor: '#fff',
              color: 'black'
            }}
        >
            Войти
        </Button>
        //   <Flex
        //     vertical
        //     align="center"
        //     justify="center"
        //     onClick={() => navigate('/login')}
        //     style={{
        //       flex: 1,
        //       height: '100%',
        //       cursor: 'pointer',
        //     }}
        //   >
        //     <LoginOutlined style={{ fontSize: 20, color: '#fff' }} />
        //     <span style={{ color: '#fff', fontSize: 12 }}>Войти</span>
        //   </Flex>
        )}

        {/* АВТОРИЗОВАН */}
        {isAuthenticated && (
          <Dropdown
            menu={{ items: profileMenuItems }}
            trigger={['click']}
            placement="topRight"
            style={{
              minWidth: 260,
            }}
          >
            <Flex
              vertical
              align="center"
              justify="center"
              style={{
                flex: 1, 
                height: '100%',
                cursor: 'pointer',
              }}
            >
              <Avatar
                size={28}
                icon={<UserOutlined />}
                src={userId ? userPicture(userId) : null}
                style={{ backgroundColor: '#1890ff' }}
              />
              <span style={{ opacity: 0.6, color: '#fff', fontSize: 12, marginTop: 2 }}>
                {userName ? userName : 'Профиль'}
              </span>
            </Flex>
          </Dropdown>
        )}
      </Flex>

      {/* Модальное окно профиля */}
    <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        userId={userId}
        userName={userName}
        onUpdateUser={handleUpdateUser}
      />
    </Footer>
  );
};

export default MenuMobile;
