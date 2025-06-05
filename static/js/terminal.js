/**
 * Terminal Manager
 * Handles terminal emulation and command execution
 */

class TerminalManager {
    constructor() {
        this.terminal = null;
        this.fitAddon = null;
        this.currentCommand = '';
        this.commandHistory = [];
        this.historyIndex = -1;
        this.currentDirectory = '';
        this.isInitialized = false;
        
        // Terminal settings
        this.settings = {
            fontSize: 14,
            fontFamily: "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace",
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#aeafad',
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
            }
        };
        
        // Command prompt
        this.prompt = '$ ';
        
        // API base URL
        this.API_BASE = window.location.origin;
    }
    
    async init() {
        try {
            // Initialize XTerm.js
            this.terminal = new Terminal({
                cursorBlink: true,
                fontSize: this.settings.fontSize,
                fontFamily: this.settings.fontFamily,
                theme: this.settings.theme,
                scrollback: 1000,
                tabStopWidth: 4,
                bellStyle: 'none',
                allowTransparency: true,
                convertEol: true,
                disableStdin: false,
                macOptionIsMeta: true,
                rightClickSelectsWord: true,
                screenReaderMode: false
            });
            
            // Initialize fit addon
            this.fitAddon = new FitAddon.FitAddon();
            this.terminal.loadAddon(this.fitAddon);
            
            // Open terminal in container
            const container = document.getElementById('terminal');
            this.terminal.open(container);
            
            // Fit terminal to container
            this.fitAddon.fit();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Welcome message
            this.writeWelcome();
            
            // Show initial prompt
            this.showPrompt();
            
            this.isInitialized = true;
            console.log('✅ Terminal initialized');
            
        } catch (error) {
            console.error('Failed to initialize terminal:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        // Handle key input
        this.terminal.onKey((e) => {
            const char = e.domEvent.key;
            
            switch (char) {
                case 'Enter':
                    this.handleEnter();
                    break;
                    
                case 'Backspace':
                    this.handleBackspace();
                    break;
                    
                case 'ArrowUp':
                    this.handleArrowUp();
                    break;
                    
                case 'ArrowDown':
                    this.handleArrowDown();
                    break;
                    
                case 'ArrowLeft':
                case 'ArrowRight':
                    // Prevent cursor movement outside current command
                    break;
                    
                case 'Tab':
                    this.handleTab();
                    break;
                    
                case 'c':
                    if (e.domEvent.ctrlKey) {
                        this.handleCtrlC();
                    } else {
                        this.handleCharacter(char);
                    }
                    break;
                    
                default:
                    if (char.length === 1 && !e.domEvent.ctrlKey && !e.domEvent.altKey) {
                        this.handleCharacter(char);
                    }
                    break;
            }
        });
        
        // Handle data input (for pasted text)
        this.terminal.onData((data) => {
            // Handle pasted text
            if (data.length > 1) {
                this.currentCommand += data;
                this.terminal.write(data);
            }
        });
        
        // Handle selection
        this.terminal.onSelectionChange(() => {
            const selection = this.terminal.getSelection();
            if (selection) {
                // Copy to clipboard functionality could be added here
            }
        });
        
        // Resize handling
        window.addEventListener('resize', () => {
            this.resize();
        });
        
        // Panel resize observer
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                this.resize();
            });
            
            const terminalContainer = document.getElementById('terminal');
            if (terminalContainer) {
                resizeObserver.observe(terminalContainer);
            }
        }
    }
    
    writeWelcome() {
        const welcome = [
            '\x1b[36m╔══════════════════════════════════════╗\x1b[0m',
            '\x1b[36m║\x1b[0m           \x1b[1mShellIDE Terminal\x1b[0m           \x1b[36m║\x1b[0m',
            '\x1b[36m║\x1b[0m      AI-Powered Development        \x1b[36m║\x1b[0m',
            '\x1b[36m╚══════════════════════════════════════╝\x1b[0m',
            '',
            '\x1b[32mWelcome to the integrated terminal!\x1b[0m',
            '\x1b[90mType "help" for available commands.\x1b[0m',
            ''
        ];
        
        welcome.forEach(line => {
            this.terminal.writeln(line);
        });
    }
    
    showPrompt() {
        const cwd = this.currentDirectory || '~';
        this.terminal.write(`\x1b[32m${cwd}\x1b[0m ${this.prompt}`);
    }
    
    handleCharacter(char) {
        this.currentCommand += char;
        this.terminal.write(char);
    }
    
    handleBackspace() {
        if (this.currentCommand.length > 0) {
            this.currentCommand = this.currentCommand.slice(0, -1);
            this.terminal.write('\b \b');
        }
    }
    
    handleEnter() {
        this.terminal.writeln('');
        
        if (this.currentCommand.trim()) {
            this.executeCommand(this.currentCommand.trim());
            this.addToHistory(this.currentCommand.trim());
        } else {
            this.showPrompt();
        }
        
        this.currentCommand = '';
        this.historyIndex = -1;
    }
    
    handleArrowUp() {
        if (this.commandHistory.length > 0 && this.historyIndex < this.commandHistory.length - 1) {
            this.historyIndex++;
            this.replaceCurrentCommand(this.commandHistory[this.commandHistory.length - 1 - this.historyIndex]);
        }
    }
    
    handleArrowDown() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.replaceCurrentCommand(this.commandHistory[this.commandHistory.length - 1 - this.historyIndex]);
        } else if (this.historyIndex === 0) {
            this.historyIndex = -1;
            this.replaceCurrentCommand('');
        }
    }
    
    handleTab() {
        // Simple tab completion for common commands
        const commands = [
            'help', 'clear', 'ls', 'dir', 'cd', 'pwd', 'cat', 'echo',
            'python', 'python3', 'node', 'npm', 'pip', 'git',
            'mkdir', 'touch', 'rm', 'cp', 'mv'
        ];
        
        const matches = commands.filter(cmd => cmd.startsWith(this.currentCommand));
        
        if (matches.length === 1) {
            const completion = matches[0].substring(this.currentCommand.length);
            this.currentCommand += completion;
            this.terminal.write(completion);
        } else if (matches.length > 1) {
            this.terminal.writeln('');
            this.terminal.writeln(matches.join('  '));
            this.showPrompt();
            this.terminal.write(this.currentCommand);
        }
    }
    
    handleCtrlC() {
        this.terminal.writeln('^C');
        this.currentCommand = '';
        this.showPrompt();
    }
    
    replaceCurrentCommand(newCommand) {
        // Clear current command
        for (let i = 0; i < this.currentCommand.length; i++) {
            this.terminal.write('\b \b');
        }
        
        // Write new command
        this.currentCommand = newCommand;
        this.terminal.write(newCommand);
    }
    
    addToHistory(command) {
        if (this.commandHistory[this.commandHistory.length - 1] !== command) {
            this.commandHistory.push(command);
            
            // Limit history size
            if (this.commandHistory.length > 100) {
                this.commandHistory.shift();
            }
        }
    }
    
    async executeCommand(command) {
        try {
            // Handle built-in commands
            if (this.handleBuiltinCommand(command)) {
                return;
            }
            
            // Execute command on server
            const response = await fetch(`${this.API_BASE}/api/terminal/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    command: command,
                    cwd: this.currentDirectory,
                    project_id: this.getCurrentProjectId()
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Command execution failed');
            }
            
            const result = await response.json();
            this.handleCommandResult(result);
            
        } catch (error) {
            console.error('Command execution error:', error);
            this.writeError('Error: ' + error.message);
            this.showPrompt();
        }
    }
    
    handleBuiltinCommand(command) {
        const parts = command.split(' ');
        const cmd = parts[0];
        
        switch (cmd) {
            case 'help':
                this.showHelp();
                return true;
                
            case 'clear':
                this.clear();
                return true;
                
            case 'history':
                this.showHistory();
                return true;
                
            case 'pwd':
                this.terminal.writeln(this.currentDirectory || '~');
                this.showPrompt();
                return true;
                
            default:
                return false;
        }
    }
    
    handleCommandResult(result) {
        // Write stdout
        if (result.stdout) {
            this.writeOutput(result.stdout);
        }
        
        // Write stderr
        if (result.stderr) {
            this.writeError(result.stderr);
        }
        
        // Update current directory if command was successful
        if (result.success && result.command.startsWith('cd ')) {
            // Update current directory (simplified)
            const newDir = result.command.substring(3).trim();
            if (newDir) {
                this.currentDirectory = newDir;
            }
        }
        
        // Show execution info for long-running commands
        if (result.execution_time > 1000) {
            this.terminal.writeln(`\x1b[90m[Completed in ${result.execution_time}ms]\x1b[0m`);
        }
        
        this.showPrompt();
    }
    
    writeOutput(text) {
        const lines = text.split('\n');
        lines.forEach((line, index) => {
            if (index === lines.length - 1 && line === '') {
                return; // Skip empty last line
            }
            this.terminal.writeln(line);
        });
    }
    
    writeError(text) {
        const lines = text.split('\n');
        lines.forEach((line, index) => {
            if (index === lines.length - 1 && line === '') {
                return; // Skip empty last line
            }
            this.terminal.writeln(`\x1b[31m${line}\x1b[0m`);
        });
    }
    
    showHelp() {
        const help = [
            '\x1b[1mShellIDE Terminal Help\x1b[0m',
            '',
            '\x1b[32mBuilt-in Commands:\x1b[0m',
            '  help      - Show this help message',
            '  clear     - Clear the terminal',
            '  history   - Show command history',
            '  pwd       - Show current directory',
            '',
            '\x1b[32mSupported Commands:\x1b[0m',
            '  File Operations: ls, dir, cat, mkdir, touch, rm, cp, mv',
            '  Navigation: cd, pwd',
            '  Development: python, node, npm, pip, git',
            '  System: echo, which, where',
            '',
            '\x1b[32mKeyboard Shortcuts:\x1b[0m',
            '  Ctrl+C    - Cancel current command',
            '  ↑/↓       - Navigate command history',
            '  Tab       - Auto-complete commands',
            ''
        ];
        
        help.forEach(line => {
            this.terminal.writeln(line);
        });
        
        this.showPrompt();
    }
    
    showHistory() {
        if (this.commandHistory.length === 0) {
            this.terminal.writeln('No command history');
        } else {
            this.commandHistory.forEach((cmd, index) => {
                this.terminal.writeln(`${index + 1}: ${cmd}`);
            });
        }
        this.showPrompt();
    }
    
    clear() {
        this.terminal.clear();
        this.writeWelcome();
        this.showPrompt();
    }
    
    resize() {
        if (this.fitAddon && this.isInitialized) {
            setTimeout(() => {
                this.fitAddon.fit();
            }, 100);
        }
    }
    
    focus() {
        if (this.terminal) {
            this.terminal.focus();
        }
    }
    
    write(text) {
        if (this.terminal) {
            this.terminal.write(text);
        }
    }
    
    writeln(text) {
        if (this.terminal) {
            this.terminal.writeln(text);
        }
    }
    
    getAuthToken() {
        return localStorage.getItem('auth_token') || '';
    }
    
    getCurrentProjectId() {
        if (window.app && window.app.currentProject) {
            return window.app.currentProject.id;
        }
        return null;
    }
    
    setDirectory(directory) {
        this.currentDirectory = directory;
    }
    
    getDirectory() {
        return this.currentDirectory;
    }
    
    executeCommandDirect(command) {
        // Execute command without user input
        this.terminal.writeln(`$ ${command}`);
        this.executeCommand(command);
    }
    
    dispose() {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }
    }
}
