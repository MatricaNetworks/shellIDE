import React, { useState, useEffect } from 'react';
import { getAPIKeys, addAPIKey, deleteAPIKey, getSystemInfo } from '../services/api';

const Settings = ({ user, onClose, darkMode, toggleTheme }) => {
  const [activeTab, setActiveTab] = useState('api-keys');
  const [apiKeys, setApiKeys] = useState([]);
  const [systemInfo, setSystemInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState({
    service: 'openrouter',
    name: '',
    api_key: ''
  });

  const tabs = {
    'api-keys': 'API Keys',
    'preferences': 'Preferences',
    'system': 'System Info',
    'about': 'About'
  };

  const services = {
    openrouter: 'OpenRouter',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    huggingface: 'Hugging Face'
  };

  useEffect(() => {
    if (activeTab === 'api-keys') {
      loadAPIKeys();
    } else if (activeTab === 'system') {
      loadSystemInfo();
    }
  }, [activeTab]);

  const loadAPIKeys = async () => {
    setLoading(true);
    try {
      const response = await getAPIKeys();
      if (response.success) {
        setApiKeys(response.data);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemInfo = async () => {
    setLoading(true);
    try {
      const response = await getSystemInfo();
      if (response.success) {
        setSystemInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to load system info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAPIKey = async (e) => {
    e.preventDefault();
    
    if (!newApiKey.api_key.trim()) {
      alert('API key is required');
      return;
    }

    try {
      const response = await addAPIKey({
        service: newApiKey.service,
        name: newApiKey.name || `${services[newApiKey.service]} API Key`,
        api_key: newApiKey.api_key
      });

      if (response.success) {
        setShowAddKey(false);
        setNewApiKey({ service: 'openrouter', name: '', api_key: '' });
        loadAPIKeys();
      }
    } catch (error) {
      console.error('Failed to add API key:', error);
      alert('Failed to add API key');
    }
  };

  const handleDeleteAPIKey = async (keyId, keyName) => {
    if (window.confirm(`Are you sure you want to delete "${keyName}"?`)) {
      try {
        const response = await deleteAPIKey(keyId);
        if (response.success) {
          loadAPIKeys();
        }
      } catch (error) {
        console.error('Failed to delete API key:', error);
        alert('Failed to delete API key');
      }
    }
  };

  const renderAPIKeysTab = () => (
    <div className="settings-section">
      <div className="section-header">
        <h3>API Keys</h3>
        <button
          onClick={() => setShowAddKey(true)}
          className="add-key-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add API Key
        </button>
      </div>

      <p className="section-description">
        Manage API keys for AI services. Your keys are stored securely and only used for API requests.
      </p>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          Loading API keys...
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔑</div>
          <h4>No API keys configured</h4>
          <p>Add your OpenRouter API key to start using AI features</p>
          <button
            onClick={() => setShowAddKey(true)}
            className="primary-btn"
          >
            Add API Key
          </button>
        </div>
      ) : (
        <div className="api-keys-list">
          {apiKeys.map(key => (
            <div key={key.id} className="api-key-item">
              <div className="key-info">
                <div className="key-header">
                  <span className="key-service">{services[key.service] || key.service}</span>
                  <span className="key-name">{key.name}</span>
                </div>
                <div className="key-value">{key.api_key}</div>
                <div className="key-meta">
                  Added {new Date(key.created_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleDeleteAPIKey(key.id, key.name)}
                className="delete-key-btn"
                title="Delete API key"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add API Key Modal */}
      {showAddKey && (
        <div className="modal-overlay">
          <div className="add-key-modal">
            <div className="modal-header">
              <h3>Add API Key</h3>
              <button
                onClick={() => setShowAddKey(false)}
                className="close-modal-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddAPIKey} className="add-key-form">
              <div className="form-group">
                <label htmlFor="service">Service</label>
                <select
                  id="service"
                  value={newApiKey.service}
                  onChange={(e) => setNewApiKey(prev => ({ ...prev, service: e.target.value }))}
                >
                  {Object.entries(services).map(([key, name]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="key-name">Name (Optional)</label>
                <input
                  id="key-name"
                  type="text"
                  value={newApiKey.name}
                  onChange={(e) => setNewApiKey(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My API Key"
                />
              </div>

              <div className="form-group">
                <label htmlFor="api-key">API Key *</label>
                <input
                  id="api-key"
                  type="password"
                  value={newApiKey.api_key}
                  onChange={(e) => setNewApiKey(prev => ({ ...prev, api_key: e.target.value }))}
                  placeholder="sk-..."
                  required
                />
              </div>

              <div className="api-key-help">
                <h4>How to get your API key:</h4>
                <ul>
                  <li><strong>OpenRouter:</strong> Visit <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">openrouter.ai/keys</a></li>
                  <li><strong>OpenAI:</strong> Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com/api-keys</a></li>
                  <li><strong>Anthropic:</strong> Visit <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></li>
                </ul>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowAddKey(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="add-btn"
                >
                  Add API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="settings-section">
      <h3>Preferences</h3>
      
      <div className="preference-group">
        <h4>Appearance</h4>
        <div className="preference-item">
          <label className="preference-label">
            <span>Theme</span>
            <button
              onClick={toggleTheme}
              className={`theme-toggle ${darkMode ? 'dark' : 'light'}`}
            >
              <div className="toggle-track">
                <div className="toggle-thumb">
                  {darkMode ? '🌙' : '☀️'}
                </div>
              </div>
              <span>{darkMode ? 'Dark' : 'Light'}</span>
            </button>
          </label>
        </div>
      </div>

      <div className="preference-group">
        <h4>Editor</h4>
        <div className="preference-item">
          <label className="preference-label">
            <span>Font Size</span>
            <select defaultValue="14">
              <option value="12">12px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
              <option value="18">18px</option>
            </select>
          </label>
        </div>
        <div className="preference-item">
          <label className="preference-label">
            <span>Tab Size</span>
            <select defaultValue="2">
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="8">8 spaces</option>
            </select>
          </label>
        </div>
        <div className="preference-item">
          <label className="preference-label">
            <span>Word Wrap</span>
            <input type="checkbox" defaultChecked />
          </label>
        </div>
      </div>

      <div className="preference-group">
        <h4>Terminal</h4>
        <div className="preference-item">
          <label className="preference-label">
            <span>Shell</span>
            <select defaultValue="auto">
              <option value="auto">Auto-detect</option>
              <option value="bash">Bash</option>
              <option value="zsh">Zsh</option>
              <option value="cmd">Command Prompt</option>
              <option value="powershell">PowerShell</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="settings-section">
      <h3>System Information</h3>
      
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          Loading system info...
        </div>
      ) : (
        <div className="system-info">
          <div className="info-group">
            <h4>Platform</h4>
            <div className="info-item">
              <span>Operating System:</span>
              <span>{systemInfo.os}</span>
            </div>
            <div className="info-item">
              <span>Architecture:</span>
              <span>{systemInfo.architecture}</span>
            </div>
            <div className="info-item">
              <span>Python Version:</span>
              <span>{systemInfo.python_version}</span>
            </div>
          </div>

          <div className="info-group">
            <h4>Hardware</h4>
            <div className="info-item">
              <span>CPU Cores:</span>
              <span>{systemInfo.cpu_count}</span>
            </div>
            <div className="info-item">
              <span>Memory:</span>
              <span>{systemInfo.memory_total ? `${Math.round(systemInfo.memory_total / 1024 / 1024 / 1024)} GB` : 'N/A'}</span>
            </div>
            <div className="info-item">
              <span>Disk Usage:</span>
              <span>{systemInfo.disk_usage}%</span>
            </div>
          </div>

          <div className="info-group">
            <h4>Application</h4>
            <div className="info-item">
              <span>Version:</span>
              <span>1.0.0</span>
            </div>
            <div className="info-item">
              <span>Backend:</span>
              <span>Running on port 8000</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAboutTab = () => (
    <div className="settings-section">
      <div className="about-content">
        <div className="about-header">
          <div className="app-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16,18 22,12 16,6"></polyline>
              <polyline points="8,6 2,12 8,18"></polyline>
            </svg>
          </div>
          <h2>ShellIDE</h2>
          <p>AI-Powered Development Platform</p>
          <span className="version">Version 1.0.0</span>
        </div>

        <div className="about-description">
          <p>
            ShellIDE is a comprehensive desktop development platform that combines 
            the power of AI assistance with a full-featured code editor, integrated 
            terminal, and project management tools.
          </p>
        </div>

        <div className="about-features">
          <h4>Features</h4>
          <ul>
            <li>🤖 AI-powered code assistance with OpenRouter integration</li>
            <li>💻 Full-featured Monaco code editor with syntax highlighting</li>
            <li>⚡ Integrated terminal with command execution</li>
            <li>📁 Project management and file explorer</li>
            <li>🔐 Secure Google OAuth authentication</li>
            <li>🌙 Dark/Light theme support</li>
            <li>🔄 Cross-platform desktop application</li>
          </ul>
        </div>

        <div className="about-links">
          <a href="https://github.com/shellide" target="_blank" rel="noopener noreferrer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            GitHub
          </a>
          <a href="mailto:support@shellide.dev">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            Support
          </a>
        </div>

        <div className="about-credits">
          <h4>Built with</h4>
          <div className="tech-stack">
            <span>React</span>
            <span>Electron</span>
            <span>Python</span>
            <span>FastAPI</span>
            <span>Monaco Editor</span>
            <span>PostgreSQL</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <button
          onClick={onClose}
          className="close-settings-btn"
          title="Close settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="settings-content">
        <div className="settings-sidebar">
          <div className="settings-user">
            <img src={user.avatar_url} alt={user.name} className="user-avatar" />
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>

          <nav className="settings-nav">
            {Object.entries(tabs).map(([key, name]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`nav-item ${activeTab === key ? 'active' : ''}`}
              >
                <span className="nav-icon">
                  {key === 'api-keys' && '🔑'}
                  {key === 'preferences' && '⚙️'}
                  {key === 'system' && '💻'}
                  {key === 'about' && 'ℹ️'}
                </span>
                {name}
              </button>
            ))}
          </nav>
        </div>

        <div className="settings-main">
          {activeTab === 'api-keys' && renderAPIKeysTab()}
          {activeTab === 'preferences' && renderPreferencesTab()}
          {activeTab === 'system' && renderSystemTab()}
          {activeTab === 'about' && renderAboutTab()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
