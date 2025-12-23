import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout, Card, Row, Col, Typography, Statistic, Table, Space,
  Tag, Progress, Button, Select, DatePicker, Divider, Alert,
  Spin, Empty, Tooltip, Modal, List, Descriptions, Badge, message,
  Tabs, Radio, Dropdown, Menu,
  Flex
} from 'antd';
import {
  ArrowLeftOutlined, BarChartOutlined, UserOutlined,
  TrophyOutlined, ClockCircleOutlined,
  EyeOutlined, DownloadOutlined, CalendarOutlined, FilterOutlined,
  TeamOutlined, PercentageOutlined, DashboardOutlined,
  CheckCircleOutlined, NumberOutlined, HourglassOutlined,
  QuestionCircleOutlined, PieChartOutlined, SortAscendingOutlined,
  SortDescendingOutlined, MoreOutlined, AppstoreOutlined,
  OrderedListOutlined, CheckOutlined, CloseOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuizes } from '../hooks/useQuizes';
import { useQuestions } from '../hooks/useQuestions';
import { useQuizAttempt } from '../hooks/useQuizAttempt';
import { getCategoryName, getCategoryColor } from '../utils/categoryUtils';
import * as statsApi from '../API methods/statisticsMethods';
import { useUsers } from '../hooks/useUsers';
import { usePrivateQuizAccess } from '../hooks/usePrivateQuizAccess';
import { useIsPortrait } from '../hooks/usePortain';

const { Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// Выносим вспомогательные функции вне компонента
const formatSeconds = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatTimeShort = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  } else if (minutes > 0) {
    return `${minutes}м ${secs}с`;
  } else {
    return `${secs}с`;
  }
};

// Простая круговая диаграмма на CSS
const SimplePieChart = ({ correct, total, size = 100 }) => {
  const percentage = total > 0 ? (correct / total) * 100 : 0;
  const circumference = 2 * Math.PI * (size / 2 - 5);
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Фон */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 5}
          fill="transparent"
          stroke="#f0f0f0"
          strokeWidth="10"
        />
        {/* Прогресс */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 5}
          fill="transparent"
          stroke="#52c41a"
          strokeWidth="10"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: size / 5, fontWeight: 'bold' }}>
          {Math.round(percentage)}%
        </div>
        <div style={{ fontSize: size / 10, color: '#666' }}>
          {correct}/{total}
        </div>
      </div>
    </div>
  );
};

// Простая столбчатая диаграмма
const SimpleBarChart = ({ data, height = 200 }) => {
  const maxValue = Math.max(...data.map(item => item.value));
  
  return (
    <div style={{ height, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
      {data.map((item, index) => (
        <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: '80%',
              height: `${(item.value / maxValue) * 100}%`,
              backgroundColor: item.color,
              borderRadius: '4px 4px 0 0',
              minHeight: 2
            }}
          />
          <div style={{ marginTop: 4, fontSize: 10, textAlign: 'center', color: '#666' }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function QuizStatistics() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { getQuizById, checkQuizOwnership, getQuizQuestions } = useQuizes();
  const { getQuestionOptions, getQuestionById } = useQuestions();
  const { getLeaderboardSimple } = useQuizAttempt();
  const { } = useQuizAttempt();
  const { checkToken } = useUsers();
  const isPortrait = useIsPortrait();
  const { getSavedAccessKey } = usePrivateQuizAccess();
  
  const [quiz, setQuiz] = useState(null);
  const [statistics, setStatistics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionStats, setQuestionStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingQuestionStats, setLoadingQuestionStats] = useState(false);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [attemptAnswers, setAttemptAnswers] = useState([]);
  
  // Фильтры
  const [dateRange, setDateRange] = useState(null);
  
  // Для статистики по вопросам
  const [activeTab, setActiveTab] = useState('general');
  const [questionSort, setQuestionSort] = useState('difficulty'); // difficulty, order, correct
  const [questionView, setQuestionView] = useState('cards'); // cards, list
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionDetailsModal, setQuestionDetailsModal] = useState(false);

  useEffect(() => {
    loadQuizAndStatistics();
  }, [quizId]);

  // Загружаем статистику по вопросам, когда загружены statistics и questions
  useEffect(() => {
    if (statistics.length > 0 && questions.length > 0) {
      console.log('Данные загружены, анализируем статистику вопросов...');
      console.log('Количество попыток:', statistics.length);
      console.log('Количество вопросов:', questions.length);
      analyzeQuestionStatistics();
    }
  }, [statistics, questions]);

  const loadQuizAndStatistics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await checkToken();
      if (!token) {
        navigate('/login');
        return;
      }

      // Проверяем права доступа
      const savedKey = getSavedAccessKey(quizId)
      const access = await checkQuizOwnership(quizId, token, savedKey);
      if (!access) {
        setError('У вас нет доступа к статистике этого квиза');
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setHasAccess(true);
      
      // Загружаем информацию о квизе
      const quizData = await getQuizById(quizId, token, savedKey);
      setQuiz(quizData);
      setLoadingQuiz(false);

      // Загружаем статистику попыток и вопросы параллельно
      await Promise.all([
        loadStatistics(),
        loadQuestions()
      ]);
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
      setError(err.message || 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const token = await checkToken();

      console.log('Загрузка статистики для квиза', quizId);
      const attemptsData = await getLeaderboardSimple(quizId, token);
      console.log('Получено попыток:', attemptsData.length);
      if (attemptsData.length > 0) {
        console.log('Пример попытки:', attemptsData[0]);
      }
      setStatistics(attemptsData);
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
      throw err;
    }
  };

  const loadQuestions = async () => {
    setLoadingQuestions(true);
    try {
      console.log('Загрузка вопросов для квиза', quizId);
      const token = await checkToken();
      
      let quizQuestions = [];
      
      try {
        // Способ 1: Через getQuizQuestions
        const savedKey = getSavedAccessKey(quizId)
        quizQuestions = await getQuizQuestions(quizId, savedKey);
        console.log('Вопросы загружены через getQuizQuestions:', quizQuestions?.length);
      } catch (err1) {
        console.error('Ошибка при загрузке через getQuizQuestions:', err1);
        
        try {
          // Способ 2: Через getQuizById (может содержать вопросы)
          const savedKey = getSavedAccessKey(quizId)
          const quizWithQuestions = await getQuizById(quizId, token, savedKey);
          quizQuestions = quizWithQuestions.questions || [];
          console.log('Вопросы загружены из quizWithQuestions:', quizQuestions?.length);
        } catch (err2) {
          console.error('Ошибка при загрузке через getQuizById:', err2);
        }
      }
      
      if (quizQuestions && Array.isArray(quizQuestions)) {
        console.log('Структура первого вопроса:', quizQuestions[0]);
        setQuestions(quizQuestions);
      } else {
        console.log('Вопросы не загружены или не в правильном формате:', quizQuestions);
        setQuestions([]);
      }
    } catch (err) {
      console.error('Общая ошибка загрузки вопросов:', err);
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const analyzeQuestionStatistics = async () => {
    setLoadingQuestionStats(true);
    try {
      console.log('Начинаем анализ статистики вопросов...');
      console.log('Количество попыток:', statistics.length);
      console.log('Количество вопросов:', questions.length);
      
      if (statistics.length === 0) {
        console.log('Нет попыток для анализа');
        setQuestionStats([]);
        return;
      }
      
      if (questions.length === 0) {
        console.log('Нет вопросов для анализа');
        setQuestionStats([]);
        return;
      }
      
      // Собираем ответы для всех попыток
      const allAnswers = [];
      
      console.log('Сбор ответов для попыток...');
      for (const attempt of statistics) {
        try {
          console.log(`Загружаем ответы для попытки ${attempt.attemptId}...`);
          const answers = await statsApi.getAttemptAnswersForAnalysis(attempt.attemptId);
          console.log(`Получено ${answers.length} ответов для попытки ${attempt.attemptId}`);
          
          if (answers.length > 0) {
            console.log('Пример ответа:', answers[0]);
          }
          
          allAnswers.push(...answers.map(answer => ({
            ...answer,
            attemptId: attempt.attemptId
          })));
        } catch (err) {
          console.error(`Ошибка загрузки ответов для попытки ${attempt.attemptId}:`, err);
        }
      }
      
      console.log('Всего собрано ответов:', allAnswers.length);
      
      setAttemptAnswers(allAnswers);
      
      if (allAnswers.length === 0) {
        console.log('Нет ответов для анализа. Создаем статистику на основе количества попыток...');
        createQuestionStatsBasedOnAttempts();
        return;
      }
      
      // Группируем ответы по вопросам
      const questionStatsMap = {};
      
      console.log('Группировка ответов по вопросам...');
      for (const answer of allAnswers) {
        const questionId = answer.questionId || answer.question?.id;
        
        if (!questionId) {
          console.warn('Ответ без questionId:', answer);
          continue;
        }
        
        if (!questionStatsMap[questionId]) {
          questionStatsMap[questionId] = {
            questionId: questionId,
            totalAttempts: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            answerDetails: []
          };
        }
        
        questionStatsMap[questionId].totalAttempts++;
        if (answer.isCorrect) {
          questionStatsMap[questionId].correctAnswers++;
        } else {
          questionStatsMap[questionId].incorrectAnswers++;
        }
        
        questionStatsMap[questionId].answerDetails.push({
          attemptId: answer.attemptId,
          isCorrect: answer.isCorrect,
          chosenOptionId: answer.chosenOptionId
        });
      }
      
      console.log('Статистика по вопросам (группировка):', Object.keys(questionStatsMap).length);
      
      // Объединяем статистику с информацией о вопросах
      const questionStatsArray = [];
      
      console.log('Создание финальной статистики...');
      for (const question of questions) {
        const questionId = question.id;
        const stats = questionStatsMap[questionId];
        
        if (stats) {
          // Получаем варианты ответов
          let options = question.options || [];
          if (!options || options.length === 0) {
            try {
              options = await getQuestionOptions(questionId);
              console.log(`Варианты для вопроса ${questionId}:`, options.length);
            } catch (err) {
              console.error(`Ошибка загрузки вариантов для вопроса ${questionId}:`, err);
            }
          }
          
          // Определяем наиболее часто выбираемые неправильные варианты
          const wrongChoiceStats = {};
          stats.answerDetails
            .filter(detail => !detail.isCorrect && detail.chosenOptionId)
            .forEach(detail => {
              wrongChoiceStats[detail.chosenOptionId] = (wrongChoiceStats[detail.chosenOptionId] || 0) + 1;
            });
          
          const mostCommonWrongChoices = Object.entries(wrongChoiceStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([optionId, count]) => ({ optionId, count }));
          
          questionStatsArray.push({
            id: questionId,
            text: question.text || `Вопрос #${questionId}`,
            order: question.order || 0,
            totalAttempts: stats.totalAttempts,
            correctAnswers: stats.correctAnswers,
            incorrectAnswers: stats.incorrectAnswers,
            correctRate: stats.totalAttempts > 0 ? (stats.correctAnswers / stats.totalAttempts) * 100 : 0,
            options: options,
            mostCommonWrongChoices,
            answerDetails: stats.answerDetails
          });
        } else {
          // Вопрос есть, но нет статистики
          console.log(`Для вопроса ${questionId} нет статистики`);
          let options = question.options || [];
          
          questionStatsArray.push({
            id: questionId,
            text: question.text || `Вопрос #${questionId}`,
            order: question.order || 0,
            totalAttempts: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            correctRate: 0,
            options: options,
            mostCommonWrongChoices: [],
            answerDetails: []
          });
        }
      }
      
      // Сортируем вопросы по порядку
      questionStatsArray.sort((a, b) => (a.order || 0) - (b.order || 0));
      console.log('Итоговая статистика вопросов:', questionStatsArray.length);
      
      setQuestionStats(questionStatsArray);
      
    } catch (err) {
      console.error('Ошибка анализа статистики вопросов:', err);
      // Создаем статистику на основе попыток при ошибке
      createQuestionStatsBasedOnAttempts();
    } finally {
      setLoadingQuestionStats(false);
    }
  };

  // Функция для создания статистики на основе попыток
  const createQuestionStatsBasedOnAttempts = () => {
    console.log('Создаем статистику на основе попыток...');
    
    if (questions.length === 0) {
      console.log('Нет вопросов для создания статистики');
      setQuestionStats([]);
      return;
    }
    
    const questionStatsArray = [];
    
    for (const question of questions) {
      // Для каждого вопроса считаем статистику на основе попыток
      let totalAttempts = statistics.length;
      let correctAnswers = 0;
      
      // Оцениваем процент правильных ответов на основе среднего score
      if (statistics.length > 0) {
        const avgScore = statistics.reduce((sum, a) => sum + (a.score || 0), 0) / statistics.length;
        const totalQuestions = questions.length;
        const avgCorrectRate = avgScore / totalQuestions;
        
        // Предполагаем, что правильные ответы распределены равномерно
        correctAnswers = Math.round(totalAttempts * avgCorrectRate);
      }
      
      const incorrectAnswers = totalAttempts - correctAnswers;
      const correctRate = totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0;
      
      questionStatsArray.push({
        id: question.id,
        text: question.text || `Вопрос #${question.id}`,
        order: question.order || 0,
        totalAttempts,
        correctAnswers,
        incorrectAnswers,
        correctRate,
        options: question.options || [],
        mostCommonWrongChoices: [],
        answerDetails: []
      });
    }
    
    // Сортируем вопросы по порядку
    questionStatsArray.sort((a, b) => (a.order || 0) - (b.order || 0));
    console.log('Создана статистика на основе попыток:', questionStatsArray.length);
    
    setQuestionStats(questionStatsArray);
  };

  // Применяем фильтры к данным
  const getFilteredStatistics = () => {
    let filtered = [...statistics];

    // Фильтр по дате
    if (dateRange && dateRange.length === 2) {
      const [startDate, endDate] = dateRange;
      filtered = filtered.filter(attempt => {
        const attemptDate = dayjs(attempt.completedAt);
        return attemptDate.isAfter(startDate) && attemptDate.isBefore(endDate);
      });
    }

    return filtered;
  };

  const filteredStats = getFilteredStatistics();

  // Рассчитываем общую статистику
  const calculateOverallStats = () => {
    if (filteredStats.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        averageTime: '00:00:00',
        averageTimeSeconds: 0,
        perfectAttempts: 0,
        perfectAttemptsPercentage: 0,
        uniqueUsers: 0
      };
    }

    const totalAttempts = filteredStats.length;
    
    // Средний балл
    const totalScore = filteredStats.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
    const averageScore = totalAttempts > 0 ? (totalScore / totalAttempts).toFixed(1) : 0;
    
    // Количество идеальных попыток
    const perfectAttempts = filteredStats.filter(attempt => 
      attempt.score >= (quiz?.questionsCount || 0)
    ).length;
    const perfectAttemptsPercentage = totalAttempts > 0 ? 
      Math.round((perfectAttempts / totalAttempts) * 100) : 0;
    
    // Уникальные пользователи
    const userIds = filteredStats
      .map(a => a.userId)
      .filter((value, index, self) => value && self.indexOf(value) === index);
    
    const uniqueUsers = userIds.length;

    // Среднее время
    const totalSeconds = filteredStats.reduce((sum, attempt) => {
      if (!attempt.timeSpent) return sum;
      const timeParts = attempt.timeSpent.split(':');
      if (timeParts.length === 3) {
        const hours = parseInt(timeParts[0]) || 0;
        const minutes = parseInt(timeParts[1]) || 0;
        const seconds = parseInt(timeParts[2]) || 0;
        return sum + (hours * 3600 + minutes * 60 + seconds);
      }
      return sum;
    }, 0);

    const avgSeconds = totalAttempts > 0 ? Math.round(totalSeconds / totalAttempts) : 0;

    return {
      totalAttempts,
      averageScore: parseFloat(averageScore),
      averageTime: formatSeconds(avgSeconds),
      averageTimeSeconds: avgSeconds,
      perfectAttempts,
      perfectAttemptsPercentage,
      uniqueUsers
    };
  };

  const overallStats = calculateOverallStats();

  // Сортировка вопросов
  const getSortedQuestions = () => {
    let sorted = [...questionStats];
    
    switch (questionSort) {
      case 'difficulty':
        // Сортировка по сложности (процент правильных ответов)
        sorted.sort((a, b) => {
          const aRate = a.correctRate || 0;
          const bRate = b.correctRate || 0;
          return aRate - bRate; // Самые сложные вопросы первыми
        });
        break;
      case 'correct':
        // Сортировка по количеству правильных ответов
        sorted.sort((a, b) => b.correctAnswers - a.correctAnswers);
        break;
      case 'order':
        // Сортировка по порядку в квизе
        sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
        break;
      default:
        sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    return sorted;
  };

  const sortedQuestions = getSortedQuestions();

  const formatDate = (dateString) => {
    if (!dateString) return 'Не завершена';
    return dayjs(dateString).format('DD.MM.YYYY HH:mm');
  };

  const formatTime = (timeString) => {
    if (!timeString || timeString === "00:00:00") {
        return "—";
    }
    
    try {
        if (typeof timeString === 'string' && timeString.includes(':')) {
            const parts = timeString.split(':');
            if (parts.length === 3) {
                const hours = parseInt(parts[0]) || 0;
                const minutes = parseInt(parts[1]) || 0;
                const seconds = parseInt(parts[2]) || 0;
                
                if (hours > 0) {
                    return `${hours}ч ${minutes}м ${seconds}с`;
                } else if (minutes > 0) {
                    return `${minutes}м ${seconds}с`;
                } else {
                    return `${seconds} сек`;
                }
            }
        }
        
        return timeString.toString();
    } catch (error) {
        console.error('Ошибка форматирования времени:', error);
        return "Без ограничений по времени";
    }
};

  const getScorePercentage = (score) => {
    const totalQuestions = quiz?.questionsCount || 1;
    return Math.round((score / totalQuestions) * 100);
  };

  const getScoreColor = (score) => {
    const percentage = getScorePercentage(score);
    if (percentage >= 80) return 'green';
    if (percentage >= 60) return 'blue';
    if (percentage >= 40) return 'orange';
    return 'red';
  };

  const handleViewQuestionDetails = (question) => {
    setSelectedQuestion(question);
    setQuestionDetailsModal(true);
  };

  // Данные для простой столбчатой диаграммы всех вопросов
  const getQuestionsBarData = () => {
    return sortedQuestions.map((question, index) => {
      const correctRate = Math.round(question.correctRate || 0);
      
      return {
        label: `В ${question.order || index + 1}`,
        value: correctRate,
        color: correctRate >= 70 ? '#52c41a' : 
               correctRate >= 50 ? '#faad14' : 
               '#f5222d',
        question
      };
    });
  };

  // Меню сортировки для вопросов
  const questionSortMenu = (
    <Menu onClick={({ key }) => setQuestionSort(key)}>
      <Menu.Item key="difficulty" icon={<SortAscendingOutlined />}>
        По сложности (сначала сложные)
      </Menu.Item>
      <Menu.Item key="correct" icon={<SortDescendingOutlined />}>
        По количеству правильных ответов
      </Menu.Item>
      <Menu.Item key="order" icon={<OrderedListOutlined />}>
        По порядку в квизе
      </Menu.Item>
    </Menu>
  );

  // Меню вида отображения
  const questionViewMenu = (
    <Menu onClick={({ key }) => setQuestionView(key)}>
      <Menu.Item key="cards" icon={<AppstoreOutlined />}>
        Карточки
      </Menu.Item>
      <Menu.Item key="list" icon={<OrderedListOutlined />}>
        Список
      </Menu.Item>
    </Menu>
  );

  const columns = [
    // {
    //   title: 'ID',
    //   dataIndex: 'id',
    //   key: 'id',
    //   width: 80,
    // },
    {
      title: 'Пользователь',
      key: 'user',
      render: (_, record) => (
        <Space>
          {record.userId ? (
            <>
              <UserOutlined style={{ color: '#1890ff' }} />
              <Text>{record.userName}</Text>
            </>
          ) : (
            <>
              <UserOutlined style={{ color: '#8c8c8c' }} />
              <Text type="secondary">Гость</Text>
            </>
          )}
        </Space>
      ),
    },
    {
      title: 'Результат',
      key: 'score',
      render: (_, record) => {
        const percentage = getScorePercentage(record.score);
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <Text strong>{record.score}</Text>
              <Text type="secondary">из {quiz?.questionsCount || '?'}</Text>
            </Space>
            <Progress 
              percent={percentage} 
              size="small" 
              status={percentage >= 50 ? 'normal' : 'exception'}
              strokeColor={getScoreColor(record.score)}
              style={{ width: 100 }}
            />
          </Space>
        );
      },
      sorter: (a, b) => a.score - b.score,
    },
    {
      title: 'Время',
      dataIndex: 'timeSpent',
      key: 'timeSpent',
      width: 100,
      render: (time) => (
        <Text>{formatTime(time)}</Text>
      ),
    },
    {
      title: 'Завершено',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.completedAt) - new Date(b.completedAt),
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Spin size="large" tip="Загрузка статистики..." />
        </div>
      </Layout>
    );
  }

  if (error && !hasAccess) {
    return (
      <Layout>
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
          <Alert
            title="Доступ запрещен"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => navigate(`/quiz/${quizId}`)}>
                Вернуться к квизу
              </Button>
            }
          />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
          <Alert
            title="Ошибка"
            description={error}
            type="error"
            showIcon
            action={
              <Space>
                <Button size="small" onClick={() => navigate('/')}>
                  На главную
                </Button>
                <Button size="small" onClick={loadQuizAndStatistics}>
                  Попробовать снова
                </Button>
              </Space>
            }
          />
        </div>
      </Layout>
    );
  }

  if (!quiz) {
    return (
      <Layout>
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
          <Alert
            title="Квиз не найден"
            description="Возможно, квиз был удален или у вас нет к нему доступа."
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => navigate('/')}>
                На главную
              </Button>
            }
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: isPortrait ? '16px' : '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Заголовок и навигация */}
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/quiz/${quizId}`)}
                style={{ paddingLeft: 0 }}
              >
                Вернуться к квизу
              </Button>
            </Col>
          </Row>

          {/* Информация о квизе */}
          <Card>
            <Row gutter={[24, 16]}>
              <Col span={24}>
                <Title level={4} style={{ margin: 0 }}>
                  {quiz.title}
                </Title>
                {quiz.description && (
                  <Text type="secondary">{quiz.description}</Text>
                )}
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space direction="vertical" size={4}>
                  <Text type="secondary">Категория</Text>
                  <Tag color={getCategoryColor(quiz.category)}>
                    {getCategoryName(quiz.category)}
                  </Tag>
                </Space>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space direction="vertical" size={4}>
                  <Text type="secondary">Вопросов</Text>
                  <Text strong>{quiz.questionsCount || questions.length || 0}</Text>
                </Space>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space direction="vertical" size={4}>
                  <Text type="secondary">Тип доступа</Text>
                  <Tag color={quiz.isPublic ? 'green' : 'orange'}>
                    {quiz.isPublic ? 'Публичный' : 'Приватный'}
                  </Tag>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Вкладки */}
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane 
              tab={
                <Flex gap='6px'>
                  <BarChartOutlined />
                  Общая статистика
                </Flex>
              } 
              key="general"
            >
              {/* Общая статистика */}
              <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 16 }}>
                {/* Фильтр по дате */}
                <Card
                  title={
                    <Space>
                      <FilterOutlined />
                      <Text strong>Фильтр по дате</Text>
                    </Space>
                  }
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Text type="secondary">Период</Text>
                        <RangePicker
                          style={{ width: '100%' }}
                          onChange={setDateRange}
                          placeholder={['Начало', 'Конец']}
                        />
                      </Space>
                    </Col>
                    <Col xs={24} md={12}>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Text type="secondary">Всего попыток в выбранном периоде</Text>
                        <Text strong>{filteredStats.length} из {statistics.length}</Text>
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* Основные метрики */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="Уникальных пользователей"
                        value={overallStats.uniqueUsers}
                        prefix={<UserOutlined />}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="Всего попыток"
                        value={overallStats.totalAttempts}
                        prefix={<TeamOutlined />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="Средний балл"
                        value={overallStats.averageScore}
                        suffix={`/ ${quiz?.questionsCount || questions.length || 0}`}
                        prefix={<BarChartOutlined />}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                  
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="Среднее время"
                        value={formatTimeShort(overallStats.averageTimeSeconds)}
                        prefix={<ClockCircleOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Таблица всех попыток */}
                <Card
                  title={
                    <Space>
                      <BarChartOutlined />
                      <Text strong>Все попытки прохождения</Text>
                      <Tag color="blue">{filteredStats.length}</Tag>
                    </Space>
                  }
                  styles={{
                    body: { padding: isPortrait && '16px'}
                  }}
                >
                  {filteredStats.length === 0 ? (
                    <Empty
                      description="Нет данных о попытках прохождения"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ) : (
                    <Table
                      columns={columns}
                      dataSource={filteredStats}
                      rowKey="id"
                      pagination={{
                        pageSize: 10,
                        // showSizeChanger: true,
                        // showQuickJumper: true,
                        showTotal: (total, range) => 
                          `${range[0]}-${range[1]} из ${total} записей`
                      }}
                      scroll={{ x: true }}
                    />
                  )}
                </Card>
              </Space>
            </TabPane>

            <TabPane 
              tab={
                <Flex gap='6px'>
                  <QuestionCircleOutlined />
                  Статистика по вопросам
                </Flex>
              } 
              key="questions"
            >
              {/* Статистика по вопросам */}
              <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 16 }}>
                

                {loadingQuestionStats ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin tip="Анализ статистики по вопросам..." />
                  </div>
                ) : questionStats.length === 0 ? (
                  <Card>
                    <Empty
                      description={
                        <Space direction="vertical">
                          <Text>Нет данных по вопросам</Text>
                          <Text type="secondary">
                            {statistics.length === 0 
                              ? "Еще никто не проходил этот квиз" 
                              : "Не удалось загрузить статистику по ответам"}
                          </Text>
                          {statistics.length > 0 && (
                            <Button 
                              type="primary" 
                              onClick={() => analyzeQuestionStatistics()}
                              loading={loadingQuestionStats}
                            >
                              Попробовать снова
                            </Button>
                          )}
                        </Space>
                      }
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </Card>
                ) : (
                  <>
                    {/* Карточки/список вопросов */}
                    {questionView === 'cards' ? (
                      <Row gutter={[16, 16]}>
                        {sortedQuestions.map((question, index) => {
                          const totalAttempts = question.totalAttempts || 0;
                          const correctAnswers = question.correctAnswers || 0;
                          const incorrectAnswers = question.incorrectAnswers || 0;
                          const correctRate = Math.round(question.correctRate || 0);
                          
                          return (
                            <Col key={question.id} xs={24} sm={12} md={8} lg={6}>
                              <Card
                                hoverable
                                onClick={() => handleViewQuestionDetails(question)}
                                style={{ height: '100%' }}
                              >
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                  {/* Заголовок вопроса */}
                                  <div>
                                    <Text strong>Вопрос {index + 1}</Text>
                                    <div style={{ marginTop: 4 }}>
                                      <Text type="secondary" ellipsis style={{ fontSize: '12px' }}>
                                        {question.text || `Вопрос ${index + 1}`}
                                      </Text>
                                    </div>
                                  </div>

                                  {/* Простая круговая диаграмма */}
                                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <SimplePieChart 
                                      correct={correctAnswers}
                                      total={totalAttempts}
                                      size={100}
                                    />
                                  </div>

                                  {/* Показатель эффективности */}
                                  {/* <div>
                                    <Progress 
                                      percent={correctRate} 
                                      size="small" 
                                      status={correctRate >= 70 ? 'success' : 
                                              correctRate >= 50 ? 'normal' : 'exception'}
                                      strokeColor={correctRate >= 70 ? '#52c41a' : 
                                                   correctRate >= 50 ? '#faad14' : 
                                                   '#f5222d'}
                                    />
                                    {/* <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
                                      {correctRate}% правильных ответов
                                    </Text> */}
                                  {/* </div> */}

                                  {/* Цифровая статистика */}
                                  <Row gutter={8}>
                                    <Col span={12}>
                                      <Space direction="vertical" size={2} align="center">
                                        <CheckOutlined style={{ color: '#52c41a' }} />
                                        <Text strong>{correctAnswers}</Text>
                                        <Text type="secondary" style={{ fontSize: '10px' }}>Правильно</Text>
                                      </Space>
                                    </Col>
                                    <Col span={12}>
                                      <Space direction="vertical" size={2} align="center">
                                        <CloseOutlined style={{ color: '#f5222d' }} />
                                        <Text strong>{incorrectAnswers}</Text>
                                        <Text type="secondary" style={{ fontSize: '10px' }}>Неправильно</Text>
                                      </Space>
                                    </Col>
                                  </Row>
                                </Space>
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                    ) : (
                      /* Список вопросов */
                      <Card>
                        <List
                          dataSource={sortedQuestions}
                          renderItem={(question, index) => {
                            const totalAttempts = question.totalAttempts || 0;
                            const correctAnswers = question.correctAnswers || 0;
                            const correctRate = Math.round(question.correctRate || 0);
                            
                            return (
                              <List.Item
                                actions={[
                                  <Button 
                                    type="link" 
                                    onClick={() => handleViewQuestionDetails(question)}
                                  >
                                    Подробнее
                                  </Button>
                                ]}
                              >
                                <List.Item.Meta
                                  title={
                                    <Space>
                                      <Text strong>Вопрос {question.order || index + 1}</Text>
                                      <Tag color={correctRate >= 70 ? 'green' : 
                                                   correctRate >= 50 ? 'orange' : 'red'}>
                                        {correctRate}% правильных
                                      </Tag>
                                    </Space>
                                  }
                                  description={
                                    <Space direction="vertical" size={2}>
                                      <Text type="secondary" ellipsis>
                                        {question.text || `Вопрос ${question.order || index + 1}`}
                                      </Text>
                                      <Space>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                          <CheckOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                                          {correctAnswers} правильно
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                          <CloseOutlined style={{ color: '#f5222d', marginRight: 4 }} />
                                          {question.incorrectAnswers || 0} неправильно
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                          <TeamOutlined style={{ marginRight: 4 }} />
                                          Всего: {totalAttempts}
                                        </Text>
                                      </Space>
                                    </Space>
                                  }
                                />
                              </List.Item>
                            );
                          }}
                        />
                      </Card>
                    )}
                  </>
                )}
              </Space>
            </TabPane>
          </Tabs>
        </Space>

        {/* Модальное окно с деталями вопроса */}
        <Modal
          title={
            <Space>
              <QuestionCircleOutlined />
              <Text strong>Детальная статистика вопроса</Text>
            </Space>
          }
          open={questionDetailsModal}
          onCancel={() => {
            setQuestionDetailsModal(false);
            setSelectedQuestion(null);
          }}
          footer={[
            <Button key="close" onClick={() => setQuestionDetailsModal(false)}>
              Закрыть
            </Button>
          ]}
          width={800}
        >
          {selectedQuestion && (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Информация о вопросе */}
              <Card size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Текст вопроса">
                    <Text strong>{selectedQuestion.text || 'Без текста'}</Text>
                  </Descriptions.Item>
                  {selectedQuestion.order && (
                    <Descriptions.Item label="Порядок в квизе">
                      <Text>{selectedQuestion.order}</Text>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="ID вопроса">
                    <Text type="secondary">{selectedQuestion.id}</Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Основная статистика */}
              <Row gutter={16}>
                <Col span={12}>
                  <Card size="small">
                    <Statistic
                      title="Всего ответов"
                      value={selectedQuestion.totalAttempts || 0}
                      prefix={<TeamOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small">
                    <Statistic
                      title="Процент правильных"
                      value={Math.round(selectedQuestion.correctRate || 0)}
                      suffix="%"
                      prefix={<PercentageOutlined />}
                      valueStyle={{
                        color: (selectedQuestion.correctRate || 0) >= 70 ? '#52c41a' : 
                               (selectedQuestion.correctRate || 0) >= 50 ? '#faad14' : '#f5222d'
                      }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Круговая диаграмма */}
              <Card
                title={
                  <Space>
                    <PieChartOutlined />
                    <Text strong>Распределение ответов</Text>
                  </Space>
                }
                size="small"
              >
                <div style={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                  <SimplePieChart 
                    correct={selectedQuestion.correctAnswers}
                    total={selectedQuestion.totalAttempts}
                    size={200}
                  />
                </div>
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Space size="large">
                    <div>
                      <CheckOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                      <Text strong>{selectedQuestion.correctAnswers || 0}</Text>
                      <Text type="secondary"> правильно</Text>
                    </div>
                    <div>
                      <CloseOutlined style={{ color: '#f5222d', marginRight: 4 }} />
                      <Text strong>{selectedQuestion.incorrectAnswers || 0}</Text>
                      <Text type="secondary"> неправильно</Text>
                    </div>
                  </Space>
                </div>
              </Card>

              {/* Варианты ответов */}
              {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                <Card
                  title={
                    <Space>
                      <AppstoreOutlined />
                      <Text strong>Варианты ответов</Text>
                    </Space>
                  }
                  size="small"
                >
                  <List
                    size="small"
                    dataSource={selectedQuestion.options}
                    renderItem={(option, index) => (
                      <List.Item>
                        <Space>
                          <Tag color={option.isCorrect ? 'green' : 'default'}>
                            {index + 1}
                          </Tag>
                          <Text style={{ flex: 1 }}>{option.text || `Вариант ${index + 1}`}</Text>
                          {option.isCorrect && (
                            <Tag color="green" icon={<CheckOutlined />}>
                              Правильный
                            </Tag>
                          )}
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              )}
            </Space>
          )}
        </Modal>
      </Content>
    </Layout>
  );
}