import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import { IconSun, IconMoon } from '../../components/Icons/SidebarIcons';
import './Login.css';

const Login = () => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await authLogin(login, password);
      // Редирект в зависимости от роли
      navigate(userData.role === 'OWNER' ? '/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Ошибка авторизации. Проверьте логин и пароль.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <button
        type="button"
        className="login-theme-toggle"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      >
        {theme === 'dark' ? <IconSun /> : <IconMoon />}
      </button>
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">RoboMan</h1>
          <p className="login-subtitle">Система учёта занятий по робототехнике</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          
          <Input
            label="Логин"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            autoFocus
            disabled={loading}
          />
          
          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          
          <Button
            type="submit"
            variant="primary"
            size="large"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
