import React, { useState, useEffect } from 'react';
import Monaco from '@monaco-editor/react';
import ProjectManager from './ProjectManager';
import FileExplorer from './FileExplorer';
import Terminal from './Terminal';
import AIAssistant from './AIAssistant';
import Settings from './Settings';

const MainEditor = ({ user, onLogout, darkMode, toggleTheme }) => {
  const [activeProject, setActiveProject] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [layout, setLayout] = useState({
    leftPanel: 250,
    rightPanel: 300,
    bottomPanel: 200
  });
  const [activeView, setActiveView] = useState('projects'); // projects, files, ai, settings
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [aiVisible, setAiVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    // Load layout preferences
    const savedLayout = localStorage.getItem('shellide-layout');
    if (savedLayout) {
      setLayout(JSON.parse(savedLayout));
    }
  }, []);

  const saveLayout = (newLayout) => {
    setLayout(newLayout);
    localStorage.setItem('shellide-layout', JSON.stringify(newLayout));
  };

  const handleFileSelect = (file) => {
    setActiveFile(file);
    // Load file content through API
    // Implementation will be handled by FileExplorer component
  };

  const handleFileContentChange = (content) => {
    setFileContent(content);
  };

  const handleProjectSelect = (project) => {
    setActiveProject(project);
    setActiveView('files');
  };

  const renderLeftPanel = () => {
    switch (activeView) {
      case 'projects':
        return (
          <ProjectManager
            user={user}
            onProjectSelect={handleProjectSelect}
            activeProject={activeProject}
          />
        );
      case 'files':
        return (
          <FileExplorer
            project={activeProject}
            onFileSelect={handleFileSelect}
            activeFile={activeFile}
          />
        );
      default:
        return null;
    }
  };

  const renderRightPanel = () => {
    if (settingsVisible) {
      return (
        <Settings
          user={user}
          onClose={() => setSettingsVisible(false)}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
        />
      );
    }
    
    if (aiVisible) {
      return (
        <AIAssistant
          project={activeProject}
          activeFile={activeFile}
          fileContent={fileContent}
        />
      );
    }
    
    return null;
  };

  return (
    <div className="main-editor">
      {/* Top Menu Bar */}
      <div className="menu-bar">
        <div className="menu-left">
          <div className="app-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16,18 22,12 16,6"></polyline>
              <polyline points="8,6 2,12 8,18"></polyline>
            </svg>
            ShellIDE
          </div>
          
          <div className="menu-actions">
            <button
              className={`menu-btn ${activeView === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveView('projects')}
              title="Projects"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2l5 0h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
            
            <button
              className={`menu-btn ${activeView === 'files' ? 'active' : ''}`}
              onClick={() => setActiveView('files')}
              title="Files"
              disabled={!activeProject}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
              </svg>
            </button>
            
            <button
              className={`menu-btn ${terminalVisible ? 'active' : ''}`}
              onClick={() => setTerminalVisible(!terminalVisible)}
              title="Terminal"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4,17 10,11 4,5"></polyline>
                <line x1="12" y1="19" x2="20" y2="19"></line>
              </svg>
            </button>
            
            <button
              className={`menu-btn ${aiVisible ? 'active' : ''}`}
              onClick={() => setAiVisible(!aiVisible)}
              title="AI Assistant"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="menu-right">
          <button
            className="menu-btn"
            onClick={toggleTheme}
            title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
          >
            {darkMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
          
          <button
            className="menu-btn"
            onClick={() => setSettingsVisible(!settingsVisible)}
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          
          <div className="user-menu">
            <img src={user.avatar_url} alt={user.name} className="user-avatar" />
            <span className="user-name">{user.name}</span>
            <button onClick={onLogout} className="logout-btn" title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16,17 21,12 16,7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="editor-container">
        {/* Left Panel */}
        <div 
          className="left-panel"
          style={{ width: layout.leftPanel }}
        >
          {renderLeftPanel()}
        </div>

        {/* Resize Handle */}
        <div 
          className="resize-handle vertical"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = layout.leftPanel;
            
            const handleMouseMove = (e) => {
              const newWidth = Math.max(200, Math.min(500, startWidth + (e.clientX - startX)));
              saveLayout({ ...layout, leftPanel: newWidth });
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />

        {/* Center Panel - Code Editor */}
        <div className="center-panel">
          <div className="editor-header">
            {activeFile && (
              <div className="file-tabs">
                <div className="file-tab active">
                  <span className="file-name">{activeFile.name}</span>
                  <button className="close-tab">×</button>
                </div>
              </div>
            )}
          </div>
          
          <div className="editor-content">
            {activeFile ? (
              <Monaco
                height="100%"
                language={getLanguageFromExtension(activeFile.extension)}
                value={fileContent}
                onChange={handleFileContentChange}
                theme={darkMode ? 'vs-dark' : 'light'}
                options={{
                  selectOnLineNumbers: true,
                  roundedSelection: false,
                  readOnly: false,
                  cursorStyle: 'line',
                  automaticLayout: true,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineHeight: 22,
                  tabSize: 2,
                  insertSpaces: true,
                  wordWrap: 'on',
                  contextmenu: true,
                  folding: true,
                  foldingStrategy: 'indentation',
                  showFoldingControls: 'mouseover',
                  renderWhitespace: 'selection',
                  renderControlCharacters: false,
                  fontLigatures: true,
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: 'on',
                  tabCompletion: 'on',
                  wordBasedSuggestions: true,
                  parameterHints: { enabled: true },
                  autoClosingBrackets: 'always',
                  autoClosingQuotes: 'always',
                  autoIndent: 'full',
                  formatOnPaste: true,
                  formatOnType: true
                }}
              />
            ) : (
              <div className="welcome-screen">
                <div className="welcome-content">
                  <h2>Welcome to ShellIDE</h2>
                  <p>Select a project and file to start coding</p>
                  
                  <div className="quick-actions">
                    <button 
                      onClick={() => setActiveView('projects')}
                      className="action-btn primary"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2l5 0h9a2 2 0 0 1 2 2z"></path>
                      </svg>
                      Open Project
                    </button>
                    
                    <button 
                      onClick={() => setAiVisible(true)}
                      className="action-btn"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                      </svg>
                      Ask AI Assistant
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        {(aiVisible || settingsVisible) && (
          <>
            <div 
              className="resize-handle vertical"
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startWidth = layout.rightPanel;
                
                const handleMouseMove = (e) => {
                  const newWidth = Math.max(250, Math.min(600, startWidth - (e.clientX - startX)));
                  saveLayout({ ...layout, rightPanel: newWidth });
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
            
            <div 
              className="right-panel"
              style={{ width: layout.rightPanel }}
            >
              {renderRightPanel()}
            </div>
          </>
        )}
      </div>

      {/* Bottom Panel - Terminal */}
      {terminalVisible && (
        <>
          <div 
            className="resize-handle horizontal"
            onMouseDown={(e) => {
              const startY = e.clientY;
              const startHeight = layout.bottomPanel;
              
              const handleMouseMove = (e) => {
                const newHeight = Math.max(150, Math.min(400, startHeight - (e.clientY - startY)));
                saveLayout({ ...layout, bottomPanel: newHeight });
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
          
          <div 
            className="bottom-panel"
            style={{ height: layout.bottomPanel }}
          >
            <Terminal 
              project={activeProject}
              onClose={() => setTerminalVisible(false)}
            />
          </div>
        </>
      )}
    </div>
  );
};

// Helper function to get Monaco language from file extension
const getLanguageFromExtension = (extension) => {
  const languageMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sql': 'sql',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.ps1': 'powershell',
    '.dockerfile': 'dockerfile',
    '.vue': 'html',
    '.svelte': 'html',
    '.astro': 'html'
  };
  
  return languageMap[extension?.toLowerCase()] || 'plaintext';
};

export default MainEditor;
