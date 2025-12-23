import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import { useIsPortrait } from './hooks/usePortain';

import HeaderComponent from './components/HeaderComponent';

import Catalog from './pages/Catalog';
import Login from './pages/Login';
import Register from './pages/Register';
import QuizAttempt from './pages/QuizAttempt';
import QuizResult from './pages/QuizResult';
import CreateQuiz from './pages/CreateQuiz';
import CreateQuestions from './pages/CreateQuestions';
import MyQuizzes from './pages/MyQuizzes';
import CompletedQuizzes from './pages/CompletedQuizzes';
import QuizDetail from './pages/QuizDetail';
import QuizStatistics from './pages/QuizStatistics';
import MenuMobile from './components/MenuMobile';

const { Content } = Layout;

const MainLayout = () => {
  const isPortrait = useIsPortrait();
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Хэдер только на десктопе */}
      {!isPortrait && <HeaderComponent />}

      <Content style={{ paddingBottom: isPortrait ? 56 : 0 }}>
        <Outlet />
      </Content>

      {/* Мобильное меню только в портретной ориентации */}
      {isPortrait && <MenuMobile />}
    </Layout>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Страницы БЕЗ хедера */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/quiz/:quizId/attempt" element={<QuizAttempt />} />

        {/* Страницы С хедером */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Catalog />} />
          <Route path="/newquiz" element={<CreateQuiz />} />
          <Route path="/quiz/:quizId/questions" element={<CreateQuestions />} />
          <Route path="/quiz/:quizId" element={<QuizDetail />} />
          <Route path="/quiz/:quizId/statistics" element={<QuizStatistics />} />
          <Route path="/quiz-result/:attemptId" element={<QuizResult />} />
          <Route path="/myquizzes" element={<MyQuizzes />} />
          <Route path="/completedquizzes" element={<CompletedQuizzes />} />
        </Route>
      </Routes>
    </Router>
  );
}
