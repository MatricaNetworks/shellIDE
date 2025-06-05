import React, { useState, useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { executeCommand } from '../services/api';
import 'xterm/css/xterm.css';

const Terminal = ({ project, onClose }) => {
  const terminalRef = useRef();
  const xtermRef = useRef();
  const fitAddonRef = useRef();
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [workingDirectory, setWorkingDirectory] = useState('');

  useEffect(() => {
    initializeTerminal();
    return () => {
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (project) {
      setWorkingDirectory(project.directory_path);
      if (xtermRef.current) {
        xtermRef.current.clear();
        xtermRef.current.writeln(`\x1b[32m✓ Project: ${project.name}\x1b[0m`);
        xtermRef.current.writeln(`\x1b[36mWorking directory: ${project.directory_path}\x1b[0m`);
        writePrompt();
      }
    }
  }, [project]);

  const initializeTerminal = () => {
    const terminal = new XTerm({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selection: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      fontFamily: '"Cascadia Code", "Fira Code", "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      allowTransparency: true,
      scrollback: 1000,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    
    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle terminal input
    terminal.onData((data) => {
      handleTerminalData(data);
    });

    // Handle terminal resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalRef.current);

    // Welcome message
    terminal.writeln('\x1b[33m╔══════════════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[33m║              ShellIDE Terminal                   ║\x1b[0m');
    terminal.writeln('\x1b[33m║          AI-Powered Development Platform         ║\x1b[0m');
    terminal.writeln('\x1b[33m╚══════════════════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');
    terminal.writeln('\x1b[36mType commands to execute in your project environment.\x1b[0m');
    terminal.writeln('\x1b[36mUse Ctrl+C to cancel running commands.\x1b[0m');
    terminal.writeln('');

    writePrompt();
  };

  const writePrompt = () => {
    if (xtermRef.current) {
      const projectName = project ? project.name : 'shellide';
      xtermRef.current.write(`\x1b[32m${projectName}\x1b[0m:\x1b[34m~\x1b[0m$ `);
    }
  };

  const handleTerminalData = (data) => {
    if (isExecuting) return;

    const terminal = xtermRef.current;
    
    for (let i = 0; i < data.length; i++) {
      const code = data.charCodeAt(i);
      
      if (code === 13) { // Enter
        terminal.writeln('');
        if (currentCommand.trim()) {
          executeCurrentCommand();
        } else {
          writePrompt();
        }
      } else if (code === 127) { // Backspace
        if (currentCommand.length > 0) {
          setCurrentCommand(prev => prev.slice(0, -1));
          terminal.write('\b \b');
        }
      } else if (code === 27) { // Escape sequences (arrow keys)
        if (data[i + 1] === '[') {
          const arrowKey = data[i + 2];
          if (arrowKey === 'A') { // Up arrow
            navigateHistory(-1);
          } else if (arrowKey === 'B') { // Down arrow
            navigateHistory(1);
          }
          i += 2; // Skip the escape sequence
        }
      } else if (code === 3) { // Ctrl+C
        terminal.writeln('^C');
        setCurrentCommand('');
        writePrompt();
      } else if (code === 12) { // Ctrl+L
        terminal.clear();
        writePrompt();
      } else if (code >= 32) { // Printable characters
        const char = String.fromCharCode(code);
        setCurrentCommand(prev => prev + char);
        terminal.write(char);
      }
    }
  };

  const navigateHistory = (direction) => {
    const terminal = xtermRef.current;
    const newIndex = Math.max(-1, Math.min(commandHistory.length - 1, historyIndex + direction));
    
    if (newIndex !== historyIndex) {
      // Clear current command
      for (let i = 0; i < currentCommand.length; i++) {
        terminal.write('\b \b');
      }
      
      // Write new command
      const newCommand = newIndex >= 0 ? commandHistory[newIndex] : '';
      setCurrentCommand(newCommand);
      setHistoryIndex(newIndex);
      terminal.write(newCommand);
    }
  };

  const executeCurrentCommand = async () => {
    if (!currentCommand.trim()) return;

    setIsExecuting(true);
    const command = currentCommand.trim();
    
    // Add to history
    setCommandHistory(prev => [...prev.filter(cmd => cmd !== command), command]);
    setHistoryIndex(-1);
    setCurrentCommand('');

    const terminal = xtermRef.current;

    try {
      // Show command execution indicator
      terminal.writeln(`\x1b[90m[Executing: ${command}]\x1b[0m`);

      const response = await executeCommand({
        command,
        project_id: project?.id,
        working_directory: workingDirectory
      });

      if (response.success) {
        // Display output
        if (response.output) {
          const lines = response.output.split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              terminal.writeln(line);
            }
          });
        }

        // Display errors
        if (response.error) {
          const errorLines = response.error.split('\n');
          errorLines.forEach(line => {
            if (line.trim()) {
              terminal.writeln(`\x1b[31m${line}\x1b[0m`);
            }
          });
        }

        // Show execution info
        if (response.exit_code !== undefined) {
          if (response.exit_code === 0) {
            terminal.writeln(`\x1b[32m✓ Command completed successfully (${response.execution_time}ms)\x1b[0m`);
          } else {
            terminal.writeln(`\x1b[31m✗ Command failed with exit code ${response.exit_code} (${response.execution_time}ms)\x1b[0m`);
          }
        }

        // Update working directory if it changed
        if (response.working_directory && response.working_directory !== workingDirectory) {
          setWorkingDirectory(response.working_directory);
        }
      } else {
        terminal.writeln(`\x1b[31mError: ${response.error}\x1b[0m`);
      }
    } catch (error) {
      terminal.writeln(`\x1b[31mFailed to execute command: ${error.message}\x1b[0m`);
    } finally {
      setIsExecuting(false);
      terminal.writeln('');
      writePrompt();
    }
  };

  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      writePrompt();
    }
  };

  const handleQuickCommand = (command) => {
    if (xtermRef.current && !isExecuting) {
      setCurrentCommand(command);
      xtermRef.current.write(command);
    }
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4,17 10,11 4,5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
          Terminal
          {project && <span className="project-info"> - {project.name}</span>}
        </div>
        
        <div className="terminal-actions">
          <div className="quick-commands">
            <button
              onClick={() => handleQuickCommand('ls -la')}
              className="quick-cmd-btn"
              title="List files"
              disabled={isExecuting}
            >
              ls
            </button>
            <button
              onClick={() => handleQuickCommand('pwd')}
              className="quick-cmd-btn"
              title="Show current directory"
              disabled={isExecuting}
            >
              pwd
            </button>
            <button
              onClick={() => handleQuickCommand('git status')}
              className="quick-cmd-btn"
              title="Git status"
              disabled={isExecuting}
            >
              git
            </button>
            <button
              onClick={() => handleQuickCommand('npm install')}
              className="quick-cmd-btn"
              title="Install dependencies"
              disabled={isExecuting}
            >
              npm
            </button>
          </div>
          
          <button
            onClick={clearTerminal}
            className="terminal-btn"
            title="Clear terminal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
          
          <button
            onClick={onClose}
            className="terminal-btn"
            title="Close terminal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="terminal-content">
        <div
          ref={terminalRef}
          className="xterm-container"
        />
        
        {isExecuting && (
          <div className="execution-indicator">
            <div className="spinner"></div>
            <span>Executing command...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Terminal;
