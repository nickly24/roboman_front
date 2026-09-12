import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import { IconSun, IconMoon } from '../../components/Icons/SidebarIcons';
import Brand from '../../components/Brand/Brand';
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
      navigate(userData.role === 'BRANCH' ? '/branch/overview' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Не удалось войти. Проверьте логин, пароль и подключение.');
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
          <Brand />
          <h1 className="login-title">С возвращением</h1>
          <p className="login-subtitle">Войдите, чтобы продолжить работу</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          
          <Input
            label="Логин"
            autoComplete="username"
            placeholder="Ваш логин"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            autoFocus
            disabled={loading}
          />
          
          <Input
            label="Пароль"
            autoComplete="current-password"
            placeholder="Введите пароль"
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
