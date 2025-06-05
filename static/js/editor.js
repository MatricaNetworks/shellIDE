/**
 * Monaco Editor Manager
 * Handles code editing functionality with syntax highlighting and IntelliSense
 */

class EditorManager {
    constructor() {
        this.editor = null;
        this.monaco = null;
        this.currentFile = null;
        this.unsavedChanges = false;
        this.themes = {
            light: 'vs',
            dark: 'vs-dark'
        };
        this.currentTheme = 'dark';
    }
    
    async init() {
        try {
            // Load Monaco Editor
            require.config({ 
                paths: { 
                    'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' 
                }
            });
            
            return new Promise((resolve, reject) => {
                require(['vs/editor/editor.main'], () => {
                    this.monaco = monaco;
                    this.setupEditor();
                    resolve();
                });
            });
            
        } catch (error) {
            console.error('Failed to initialize Monaco Editor:', error);
            throw error;
        }
    }
    
    setupEditor() {
        const container = document.getElementById('editor-container');
        
        // Create editor instance
        this.editor = this.monaco.editor.create(container, {
            value: '',
            language: 'javascript',
            theme: this.themes[this.currentTheme],
            automaticLayout: true,
            fontSize: 14,
            fontFamily: "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace",
            lineNumbers: 'on',
            minimap: {
                enabled: true
            },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 4,
            insertSpaces: true,
            detectIndentation: true,
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            quickSuggestions: true,
            parameterHints: {
                enabled: true
            },
            hover: {
                enabled: true
            },
            contextmenu: true,
            mouseWheelZoom: true,
            folding: true,
            foldingStrategy: 'auto',
            showFoldingControls: 'mouseover',
            matchBrackets: 'always',
            renderWhitespace: 'selection',
            renderLineHighlight: 'line',
            selectionHighlight: true,
            occurrencesHighlight: true,
            codeLens: true,
            colorDecorators: true
        });
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup custom themes
        this.setupCustomThemes();
        
        console.log('✅ Monaco Editor initialized');
    }
    
    setupEventListeners() {
        // Content change event
        this.editor.onDidChangeModelContent(() => {
            this.markAsModified();
        });
        
        // Cursor position change
        this.editor.onDidChangeCursorPosition((e) => {
            this.updateStatusBar(e.position);
        });
        
        // Focus events
        this.editor.onDidFocusEditorWidget(() => {
            // Update active tab when editor gains focus
            if (this.currentFile && window.app) {
                window.app.activeTab = this.currentFile;
            }
        });
        
        // Key bindings
        this.setupKeyBindings();
    }
    
    setupKeyBindings() {
        // Save file (Ctrl+S / Cmd+S)
        this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS, () => {
            if (window.app) {
                window.app.saveCurrentFile();
            }
        });
        
        // Format document (Shift+Alt+F)
        this.editor.addCommand(
            this.monaco.KeyMod.Shift | this.monaco.KeyMod.Alt | this.monaco.KeyCode.KeyF,
            () => {
                this.formatDocument();
            }
        );
        
        // Find (Ctrl+F / Cmd+F)
        this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyF, () => {
            this.editor.getAction('actions.find').run();
        });
        
        // Replace (Ctrl+H / Cmd+H)
        this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyH, () => {
            this.editor.getAction('editor.action.startFindReplaceAction').run();
        });
        
        // Go to line (Ctrl+G / Cmd+G)
        this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyG, () => {
            this.editor.getAction('editor.action.gotoLine').run();
        });
        
        // Toggle comment (Ctrl+/ / Cmd+/)
        this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.Slash, () => {
            this.editor.getAction('editor.action.commentLine').run();
        });
        
        // Duplicate line (Shift+Alt+Down)
        this.editor.addCommand(
            this.monaco.KeyMod.Shift | this.monaco.KeyMod.Alt | this.monaco.KeyCode.DownArrow,
            () => {
                this.editor.getAction('editor.action.copyLinesDownAction').run();
            }
        );
    }
    
    setupCustomThemes() {
        // Define custom dark theme
        this.monaco.editor.defineTheme('shellide-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
                { token: 'keyword', foreground: '569cd6' },
                { token: 'string', foreground: 'ce9178' },
                { token: 'number', foreground: 'b5cea8' },
                { token: 'function', foreground: 'dcdcaa' },
                { token: 'class', foreground: '4ec9b0' },
                { token: 'variable', foreground: '9cdcfe' }
            ],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
                'editor.lineHighlightBackground': '#2d2d30',
                'editor.selectionBackground': '#264f78',
                'editor.selectionHighlightBackground': '#3a3d41',
                'editorCursor.foreground': '#aeafad',
                'editorWhitespace.foreground': '#404040'
            }
        });
        
        // Define custom light theme
        this.monaco.editor.defineTheme('shellide-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '008000', fontStyle: 'italic' },
                { token: 'keyword', foreground: '0000ff' },
                { token: 'string', foreground: 'a31515' },
                { token: 'number', foreground: '098658' },
                { token: 'function', foreground: '795e26' },
                { token: 'class', foreground: '267f99' },
                { token: 'variable', foreground: '001080' }
            ],
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#000000',
                'editor.lineHighlightBackground': '#f5f5f5',
                'editor.selectionBackground': '#add6ff',
                'editor.selectionHighlightBackground': '#e8f4fd'
            }
        });
        
        // Set default theme
        this.setTheme('shellide-dark');
    }
    
    async openFile(filePath, content, language = null) {
        try {
            // Auto-detect language if not provided
            if (!language) {
                language = this.detectLanguage(filePath);
            }
            
            // Create or update model
            const uri = this.monaco.Uri.file(filePath);
            let model = this.monaco.editor.getModel(uri);
            
            if (!model) {
                model = this.monaco.editor.createModel(content, language, uri);
            } else {
                model.setValue(content);
            }
            
            // Set model to editor
            this.editor.setModel(model);
            this.currentFile = filePath;
            this.unsavedChanges = false;
            
            // Update editor tab
            this.updateEditorTab(filePath);
            
            // Focus editor
            this.editor.focus();
            
            console.log(`📄 Opened file: ${filePath} (${language})`);
            
        } catch (error) {
            console.error('Failed to open file:', error);
            throw error;
        }
    }
    
    detectLanguage(filePath) {
        const extension = filePath.split('.').pop().toLowerCase();
        
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'md': 'markdown',
            'markdown': 'markdown',
            'sql': 'sql',
            'sh': 'shell',
            'bash': 'shell',
            'bat': 'bat',
            'ps1': 'powershell',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'java': 'java',
            'kt': 'kotlin',
            'scala': 'scala',
            'c': 'c',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'h': 'c',
            'hpp': 'cpp',
            'cs': 'csharp',
            'fs': 'fsharp',
            'vb': 'vb',
            'dart': 'dart',
            'swift': 'swift',
            'r': 'r',
            'lua': 'lua',
            'perl': 'perl',
            'pl': 'perl',
            'dockerfile': 'dockerfile',
            'ini': 'ini',
            'cfg': 'ini',
            'conf': 'ini',
            'toml': 'ini',
            'properties': 'properties'
        };
        
        return languageMap[extension] || 'plaintext';
    }
    
    updateEditorTab(filePath) {
        const tabsContainer = document.getElementById('editor-tabs');
        const fileName = filePath.split('/').pop();
        
        // Remove empty editor message if present
        const emptyEditor = tabsContainer.querySelector('.empty-editor');
        if (emptyEditor) {
            emptyEditor.remove();
        }
        
        // Check if tab already exists
        let existingTab = tabsContainer.querySelector(`[data-file="${filePath}"]`);
        
        if (!existingTab) {
            // Create new tab
            const tab = document.createElement('div');
            tab.className = 'editor-tab';
            tab.dataset.file = filePath;
            tab.innerHTML = `
                <i class="fas fa-file-code"></i>
                <span class="tab-name">${fileName}</span>
                <button class="close-btn" title="Close">&times;</button>
            `;
            
            // Add event listeners
            tab.addEventListener('click', (e) => {
                if (!e.target.classList.contains('close-btn')) {
                    this.switchToTab(filePath);
                }
            });
            
            tab.querySelector('.close-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(filePath);
            });
            
            tabsContainer.appendChild(tab);
        }
        
        // Activate tab
        this.activateTab(filePath);
    }
    
    activateTab(filePath) {
        // Remove active class from all tabs
        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to current tab
        const currentTab = document.querySelector(`[data-file="${filePath}"]`);
        if (currentTab) {
            currentTab.classList.add('active');
        }
    }
    
    async switchToTab(filePath) {
        try {
            if (this.currentFile === filePath) {
                return; // Already active
            }
            
            // Load file content if needed
            const model = this.monaco.editor.getModel(this.monaco.Uri.file(filePath));
            if (!model) {
                // Need to load file content
                if (window.app && window.app.fileManager) {
                    const content = await window.app.fileManager.getFileContent(filePath);
                    await this.openFile(filePath, content);
                }
            } else {
                // Switch to existing model
                this.editor.setModel(model);
                this.currentFile = filePath;
                this.activateTab(filePath);
                this.editor.focus();
            }
            
        } catch (error) {
            console.error('Failed to switch to tab:', error);
            throw error;
        }
    }
    
    closeTab(filePath) {
        try {
            // Check for unsaved changes
            const model = this.monaco.editor.getModel(this.monaco.Uri.file(filePath));
            if (model && this.hasUnsavedChanges(filePath)) {
                if (!confirm('You have unsaved changes. Are you sure you want to close this file?')) {
                    return;
                }
            }
            
            // Remove tab element
            const tab = document.querySelector(`[data-file="${filePath}"]`);
            if (tab) {
                tab.remove();
            }
            
            // Dispose model
            if (model) {
                model.dispose();
            }
            
            // If this was the active tab, switch to another tab or show empty state
            if (this.currentFile === filePath) {
                const remainingTabs = document.querySelectorAll('.editor-tab');
                if (remainingTabs.length > 0) {
                    const nextTab = remainingTabs[remainingTabs.length - 1];
                    this.switchToTab(nextTab.dataset.file);
                } else {
                    this.showEmptyState();
                }
            }
            
        } catch (error) {
            console.error('Failed to close tab:', error);
        }
    }
    
    showEmptyState() {
        this.editor.setModel(null);
        this.currentFile = null;
        
        const tabsContainer = document.getElementById('editor-tabs');
        if (!tabsContainer.querySelector('.empty-editor')) {
            tabsContainer.innerHTML = `
                <div class="empty-editor">
                    <i class="fas fa-code"></i>
                    <h3>Welcome to ShellIDE</h3>
                    <p>Select a file to start editing or create a new project</p>
                </div>
            `;
        }
    }
    
    getCurrentContent() {
        if (this.editor && this.editor.getModel()) {
            return this.editor.getValue();
        }
        return '';
    }
    
    setContent(content) {
        if (this.editor) {
            this.editor.setValue(content);
        }
    }
    
    insertText(text, position = null) {
        if (this.editor) {
            if (position) {
                const range = new this.monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                );
                this.editor.executeEdits('', [{ range, text }]);
            } else {
                this.editor.trigger('keyboard', 'type', { text });
            }
        }
    }
    
    formatDocument() {
        if (this.editor) {
            this.editor.getAction('editor.action.formatDocument').run();
        }
    }
    
    setTheme(themeName) {
        if (this.monaco) {
            this.monaco.editor.setTheme(themeName);
            this.currentTheme = themeName;
        }
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'shellide-dark' ? 'shellide-light' : 'shellide-dark';
        this.setTheme(newTheme);
    }
    
    markAsModified() {
        this.unsavedChanges = true;
        
        if (this.currentFile) {
            const tab = document.querySelector(`[data-file="${this.currentFile}"]`);
            if (tab) {
                tab.classList.add('modified');
                
                // Add indicator if not present
                if (!tab.querySelector('.modified-indicator')) {
                    const indicator = document.createElement('span');
                    indicator.className = 'modified-indicator';
                    indicator.innerHTML = '●';
                    tab.querySelector('.tab-name').appendChild(indicator);
                }
            }
        }
    }
    
    markAsSaved() {
        this.unsavedChanges = false;
        
        if (this.currentFile) {
            const tab = document.querySelector(`[data-file="${this.currentFile}"]`);
            if (tab) {
                tab.classList.remove('modified');
                
                const indicator = tab.querySelector('.modified-indicator');
                if (indicator) {
                    indicator.remove();
                }
            }
        }
    }
    
    hasUnsavedChanges(filePath = null) {
        const targetFile = filePath || this.currentFile;
        if (!targetFile) return false;
        
        const tab = document.querySelector(`[data-file="${targetFile}"]`);
        return tab ? tab.classList.contains('modified') : false;
    }
    
    updateStatusBar(position) {
        // Create status bar if it doesn't exist
        let statusBar = document.getElementById('editor-status-bar');
        if (!statusBar) {
            statusBar = document.createElement('div');
            statusBar.id = 'editor-status-bar';
            statusBar.className = 'editor-status-bar';
            document.getElementById('editor-container').appendChild(statusBar);
        }
        
        const line = position.lineNumber;
        const column = position.column;
        const language = this.editor.getModel()?.getLanguageId() || 'plaintext';
        
        statusBar.innerHTML = `
            <span class="status-item">Ln ${line}, Col ${column}</span>
            <span class="status-item">${language}</span>
            ${this.unsavedChanges ? '<span class="status-item modified">●</span>' : ''}
        `;
    }
    
    resize() {
        if (this.editor) {
            this.editor.layout();
        }
    }
    
    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }
    
    getSelectedText() {
        if (this.editor) {
            return this.editor.getModel().getValueInRange(this.editor.getSelection());
        }
        return '';
    }
    
    replaceSelection(text) {
        if (this.editor) {
            const selection = this.editor.getSelection();
            this.editor.executeEdits('', [{ range: selection, text }]);
        }
    }
    
    gotoLine(lineNumber) {
        if (this.editor) {
            this.editor.revealLineInCenter(lineNumber);
            this.editor.setPosition({ lineNumber, column: 1 });
        }
    }
    
    find(text, options = {}) {
        if (this.editor) {
            const findOptions = {
                searchString: text,
                isRegex: options.regex || false,
                matchCase: options.matchCase || false,
                wholeWord: options.wholeWord || false,
                ...options
            };
            
            this.editor.getModel().findMatches(
                findOptions.searchString,
                true,
                findOptions.isRegex,
                findOptions.matchCase,
                findOptions.wholeWord,
                false
            );
        }
    }
    
    dispose() {
        if (this.editor) {
            this.editor.dispose();
            this.editor = null;
        }
    }
}
