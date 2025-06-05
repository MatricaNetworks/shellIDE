import React, { useState, useEffect, useRef } from 'react';
import { getAIModels, sendAIMessage, getConversations } from '../services/api';

const AIAssistant = ({ project, activeFile, fileContent }) => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextType, setContextType] = useState('general');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef(null);

  const contextTypes = {
    general: 'General Chat',
    code: 'Code Assistant',
    terminal: 'Terminal Help'
  };

  useEffect(() => {
    loadModels();
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadModels = async () => {
    try {
      const response = await getAIModels();
      if (response.success) {
        setModels(response.models);
        // Select first free model by default
        const freeModel = response.models.find(m => m.is_free);
        if (freeModel) {
          setSelectedModel(freeModel.id);
        } else if (response.models.length > 0) {
          setSelectedModel(response.models[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load AI models:', error);
    }
  };

  const loadConversations = async () => {
    if (!project) return;
    
    try {
      const response = await getConversations(project.id);
      if (response.success) {
        // Load the most recent conversation if exists
        // For now, start fresh each time
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedModel || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare context if code assistant
      let contextualMessage = inputMessage;
      if (contextType === 'code' && activeFile && fileContent) {
        contextualMessage = `File: ${activeFile.name}\n\`\`\`${activeFile.extension?.replace('.', '') || 'text'}\n${fileContent}\n\`\`\`\n\nQuestion: ${inputMessage}`;
      }

      const response = await sendAIMessage({
        message: contextualMessage,
        model: selectedModel,
        context_type: contextType,
        project_id: project?.id
      });

      if (response.success) {
        const aiMessage = {
          role: 'assistant',
          content: response.response,
          model: selectedModel,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(response.error || 'Failed to get AI response');
      }
    } catch (error) {
      const errorMessage = {
        role: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
  };

  const getQuickPrompts = () => {
    const prompts = {
      general: [
        "Explain this concept",
        "How do I implement this?",
        "What are best practices for...",
        "Help me debug this issue"
      ],
      code: [
        "Review this code",
        "Optimize this function",
        "Find bugs in this code",
        "Add comments to this code",
        "Refactor this code",
        "Write tests for this code"
      ],
      terminal: [
        "How to install dependencies?",
        "Common git commands",
        "How to run this project?",
        "Debug build errors"
      ]
    };
    
    return prompts[contextType] || prompts.general;
  };

  const insertQuickPrompt = (prompt) => {
    setInputMessage(prompt);
  };

  const getModelBadge = (model) => {
    if (model.is_free) {
      return <span className="model-badge free">FREE</span>;
    }
    return <span className="model-badge paid">PAID</span>;
  };

  const formatMessage = (content) => {
    // Simple markdown-like formatting
    return content
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <h3>AI Assistant</h3>
        <div className="ai-controls">
          <select
            value={contextType}
            onChange={(e) => setContextType(e.target.value)}
            className="context-selector"
          >
            {Object.entries(contextTypes).map(([key, name]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
          
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="model-selector-btn"
            title="Change AI Model"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          
          <button
            onClick={clearConversation}
            className="clear-chat-btn"
            title="Clear conversation"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Model Selector Dropdown */}
      {showModelSelector && (
        <div className="model-selector-dropdown">
          <div className="model-list">
            {models.map(model => (
              <div
                key={model.id}
                className={`model-item ${selectedModel === model.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedModel(model.id);
                  setShowModelSelector(false);
                }}
              >
                <div className="model-info">
                  <span className="model-name">{model.name}</span>
                  <span className="model-context">{model.context_length} tokens</span>
                </div>
                {getModelBadge(model)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Model Info */}
      {selectedModel && (
        <div className="current-model">
          <span>Model: {models.find(m => m.id === selectedModel)?.name}</span>
          {getModelBadge(models.find(m => m.id === selectedModel))}
        </div>
      )}

      {/* Context Info */}
      {contextType === 'code' && activeFile && (
        <div className="context-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
          </svg>
          Analyzing: {activeFile.name}
        </div>
      )}

      {/* Quick Prompts */}
      <div className="quick-prompts">
        <h4>Quick Prompts</h4>
        <div className="prompt-buttons">
          {getQuickPrompts().map((prompt, index) => (
            <button
              key={index}
              onClick={() => insertQuickPrompt(prompt)}
              className="prompt-btn"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {messages.length === 0 ? (
          <div className="ai-welcome">
            <div className="welcome-icon">🤖</div>
            <h4>AI Assistant Ready</h4>
            <p>Ask me anything about your code, get help with commands, or discuss your project!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role}`}
            >
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? '👤 You' : 
                   message.role === 'assistant' ? '🤖 AI' : '⚠️ Error'}
                </span>
                {message.model && (
                  <span className="message-model">{models.find(m => m.id === message.model)?.name}</span>
                )}
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div 
                className="message-content"
                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
              />
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="message assistant loading">
            <div className="message-header">
              <span className="message-role">🤖 AI</span>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              Thinking...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ai-input">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Ask ${contextTypes[contextType].toLowerCase()}...`}
          disabled={isLoading || !selectedModel}
          rows="3"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isLoading || !selectedModel}
          className="send-btn"
        >
          {isLoading ? (
            <div className="spinner"></div>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
            </svg>
          )}
        </button>
      </div>

      {!selectedModel && (
        <div className="ai-error">
          <p>⚠️ No AI model selected. Please configure your OpenRouter API key in settings.</p>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
