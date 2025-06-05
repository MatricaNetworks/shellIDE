import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import MainEditor from './components/MainEditor';
import { checkAuthStatus } from './services/api';
import './styles/App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    checkAuthentication();
    
    // Load theme preference
    const savedTheme = localStorage.getItem('shellide-theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }
  }, []);

  useEffect(() => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('shellide-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('shellide-token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await checkAuthStatus();
      if (response.success) {
        setIsAuthenticated(true);
        setUser(response.user);
      } else {
        localStorage.removeItem('shellide-token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('shellide-token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem('shellide-token', token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('shellide-token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <h2>Starting ShellIDE...</h2>
        <p>Initializing your development environment</p>
      </div>
    );
  }

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      {!isAuthenticated ? (
        <AuthScreen onLogin={handleLogin} />
      ) : (
        <MainEditor 
          user={user} 
          onLogout={handleLogout}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}

export default App;
