/**
 * ShellIDE Main Application
 * Handles initialization, authentication, and overall app state management
 */

class ShellIDEApp {
    constructor() {
        this.auth = new AuthManager();
        this.editor = null;
        this.terminal = null;
        this.fileManager = null;
        this.currentUser = null;
        this.currentProject = null;
        this.openTabs = new Map();
        this.activeTab = null;
        this.isInitialized = false;
        
        // API endpoints
        this.API_BASE = window.location.origin;
        
        // Initialize the application
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Initializing ShellIDE...');
            
            // Show loading screen
            this.showLoading();
            
            // Check authentication
            const isAuthenticated = await this.auth.checkAuth();
            
            if (!isAuthenticated) {
                this.showLoginRequired();
                return;
            }
            
            // Get current user
            this.currentUser = await this.auth.getCurrentUser();
            
            // Initialize UI components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Show main app
            this.showMainApp();
            
            this.isInitialized = true;
            console.log('✅ ShellIDE initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize ShellIDE:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }
    
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('login-required').style.display = 'none';
        document.getElementById('main-app').style.display = 'none';
    }
    
    showLoginRequired() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('login-required').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
    
    showMainApp() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('login-required').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
    }
    
    async initializeComponents() {
        // Initialize Monaco Editor
        this.editor = new EditorManager();
        await this.editor.init();
        
        // Initialize Terminal
        this.terminal = new TerminalManager();
        await this.terminal.init();
        
        // Initialize File Manager
        this.fileManager = new FileManagerUI();
        await this.fileManager.init();
        
        // Update user info in header
        this.updateUserInfo();
    }
    
    setupEventListeners() {
        // Header events
        document.getElementById('new-project-btn').addEventListener('click', () => {
            this.showNewProjectModal();
        });
        
        document.getElementById('ai-chat-btn').addEventListener('click', () => {
            this.switchToAIChat();
        });
        
        // User menu events
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');
        
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', () => {
            userDropdown.classList.remove('show');
        });
        
        document.getElementById('api-keys-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAPIKeysModal();
        });
        
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
        
        // Project selector
        document.getElementById('current-project').addEventListener('change', (e) => {
            this.switchProject(e.target.value);
        });
        
        // Sidebar tabs
        document.querySelectorAll('.sidebar .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchSidebarTab(btn.dataset.tab);
            });
        });
        
        // Panel tabs
        document.querySelectorAll('.panel-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchPanelTab(btn.dataset.tab);
            });
        });
        
        // Modal events
        this.setupModalEvents();
        
        // AI Chat events
        this.setupAIChatEvents();
        
        // Terminal events
        document.getElementById('clear-terminal').addEventListener('click', () => {
            this.terminal.clear();
        });
        
        // Output events
        document.getElementById('clear-output').addEventListener('click', () => {
            this.clearOutput();
        });
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }
    
    setupModalEvents() {
        // New Project Modal
        const newProjectModal = document.getElementById('new-project-modal');
        const newProjectForm = document.getElementById('new-project-form');
        
        newProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createProject();
        });
        
        // API Keys Modal
        const apiKeysModal = document.getElementById('api-keys-modal');
        const addApiKeyForm = document.getElementById('add-api-key-form');
        
        addApiKeyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addAPIKey();
        });
        
        // Close modal events
        document.querySelectorAll('.modal-close, [data-dismiss="modal"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModals();
            });
        });
        
        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });
    }
    
    setupAIChatEvents() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-chat');
        
        const sendMessage = () => {
            const message = chatInput.value.trim();
            if (message) {
                this.sendAIMessage(message);
                chatInput.value = '';
            }
        };
        
        sendBtn.addEventListener('click', sendMessage);
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Load AI models
        this.loadAIModels();
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S - Save current file
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveCurrentFile();
            }
            
            // Ctrl/Cmd + N - New file
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.newFile();
            }
            
            // Ctrl/Cmd + O - Open file
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                this.openFile();
            }
            
            // Ctrl/Cmd + W - Close current tab
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                this.closeCurrentTab();
            }
            
            // Ctrl/Cmd + ` - Toggle terminal
            if ((e.ctrlKey || e.metaKey) && e.key === '`') {
                e.preventDefault();
                this.switchPanelTab('terminal');
            }
            
            // F5 - Run code
            if (e.key === 'F5') {
                e.preventDefault();
                this.runCurrentFile();
            }
        });
    }
    
    async loadInitialData() {
        try {
            // Load projects
            await this.loadProjects();
            
            // Load AI models
            await this.loadAIModels();
            
            // If no project selected, show file explorer for workspace
            if (!this.currentProject) {
                await this.fileManager.loadWorkspace();
            }
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('Failed to load initial data: ' + error.message);
        }
    }
    
    updateUserInfo() {
        if (this.currentUser) {
            document.getElementById('user-name').textContent = this.currentUser.name;
            document.getElementById('user-avatar').src = this.currentUser.avatar_url || '/static/img/default-avatar.svg';
        }
    }
    
    async loadProjects() {
        try {
            const response = await fetch(`${this.API_BASE}/api/projects`, {
                headers: {
                    'Authorization': `Bearer ${this.auth.getToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load projects');
            }
            
            const projects = await response.json();
            this.updateProjectSelector(projects);
            
        } catch (error) {
            console.error('Failed to load projects:', error);
            this.showError('Failed to load projects: ' + error.message);
        }
    }
    
    updateProjectSelector(projects) {
        const selector = document.getElementById('current-project');
        selector.innerHTML = '<option value="">No Project Selected</option>';
        
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            selector.appendChild(option);
        });
    }
    
    async switchProject(projectId) {
        if (!projectId) {
            this.currentProject = null;
            await this.fileManager.loadWorkspace();
            return;
        }
        
        try {
            // Load project files
            this.currentProject = { id: projectId };
            await this.fileManager.loadProject(projectId);
            
        } catch (error) {
            console.error('Failed to switch project:', error);
            this.showError('Failed to switch project: ' + error.message);
        }
    }
    
    showNewProjectModal() {
        document.getElementById('new-project-modal').classList.add('show');
    }
    
    async createProject() {
        try {
            const form = document.getElementById('new-project-form');
            const formData = new FormData(form);
            
            const projectData = {
                name: formData.get('project-name') || document.getElementById('project-name').value,
                language: formData.get('project-language') || document.getElementById('project-language').value,
                template: formData.get('project-template') || document.getElementById('project-template').value,
                description: formData.get('project-description') || document.getElementById('project-description').value
            };
            
            const response = await fetch(`${this.API_BASE}/api/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.auth.getToken()}`
                },
                body: JSON.stringify(projectData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create project');
            }
            
            const result = await response.json();
            
            // Close modal
            this.closeModals();
            
            // Reload projects
            await this.loadProjects();
            
            // Switch to new project
            document.getElementById('current-project').value = result.id;
            await this.switchProject(result.id);
            
            this.showSuccess('Project created successfully!');
            
        } catch (error) {
            console.error('Failed to create project:', error);
            this.showError('Failed to create project: ' + error.message);
        }
    }
    
    showAPIKeysModal() {
        this.loadAPIKeys();
        document.getElementById('api-keys-modal').classList.add('show');
    }
    
    async loadAPIKeys() {
        try {
            const response = await fetch(`${this.API_BASE}/api/keys`, {
                headers: {
                    'Authorization': `Bearer ${this.auth.getToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load API keys');
            }
            
            const keys = await response.json();
            this.updateAPIKeysList(keys);
            
        } catch (error) {
            console.error('Failed to load API keys:', error);
            this.showError('Failed to load API keys: ' + error.message);
        }
    }
    
    updateAPIKeysList(keys) {
        const container = document.getElementById('api-keys-list');
        
        if (keys.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No API keys configured</p>';
            return;
        }
        
        container.innerHTML = keys.map(key => `
            <div class="api-key-item">
                <div class="api-key-info">
                    <h4>${key.name}</h4>
                    <p>${key.provider} ${key.is_default ? '(Default)' : ''}</p>
                </div>
                <div class="api-key-actions">
                    <button class="btn btn-sm btn-secondary" onclick="app.deleteAPIKey(${key.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    async addAPIKey() {
        try {
            const form = document.getElementById('add-api-key-form');
            const formData = new FormData();
            
            formData.append('name', document.getElementById('api-key-name').value);
            formData.append('provider', document.getElementById('api-key-provider').value);
            formData.append('api_key', document.getElementById('api-key-value').value);
            formData.append('is_default', document.getElementById('api-key-default').checked);
            
            const response = await fetch(`${this.API_BASE}/api/keys`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.auth.getToken()}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to add API key');
            }
            
            // Reset form
            form.reset();
            
            // Reload API keys
            await this.loadAPIKeys();
            
            // Reload AI models if OpenRouter key was added
            if (document.getElementById('api-key-provider').value === 'openrouter') {
                await this.loadAIModels();
            }
            
            this.showSuccess('API key added successfully!');
            
        } catch (error) {
            console.error('Failed to add API key:', error);
            this.showError('Failed to add API key: ' + error.message);
        }
    }
    
    async deleteAPIKey(keyId) {
        if (!confirm('Are you sure you want to delete this API key?')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/api/keys/${keyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.auth.getToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete API key');
            }
            
            await this.loadAPIKeys();
            this.showSuccess('API key deleted successfully!');
            
        } catch (error) {
            console.error('Failed to delete API key:', error);
            this.showError('Failed to delete API key: ' + error.message);
        }
    }
    
    async loadAIModels() {
        try {
            const response = await fetch(`${this.API_BASE}/api/models`, {
                headers: {
                    'Authorization': `Bearer ${this.auth.getToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load AI models');
            }
            
            const models = await response.json();
            this.updateModelSelector(models);
            
        } catch (error) {
            console.error('Failed to load AI models:', error);
            // Don't show error for models - just update selector
            this.updateModelSelector([]);
        }
    }
    
    updateModelSelector(models) {
        const selector = document.getElementById('ai-model-select');
        
        if (models.length === 0) {
            selector.innerHTML = '<option value="">No models available</option>';
            return;
        }
        
        // Group free and paid models
        const freeModels = models.filter(m => m.is_free || (m.pricing && m.pricing.prompt === "0"));
        const paidModels = models.filter(m => !m.is_free && !(m.pricing && m.pricing.prompt === "0"));
        
        let html = '';
        
        if (freeModels.length > 0) {
            html += '<optgroup label="Free Models">';
            freeModels.forEach(model => {
                html += `<option value="${model.id}">${model.name}</option>`;
            });
            html += '</optgroup>';
        }
        
        if (paidModels.length > 0) {
            html += '<optgroup label="Paid Models">';
            paidModels.forEach(model => {
                html += `<option value="${model.id}">${model.name}</option>`;
            });
            html += '</optgroup>';
        }
        
        selector.innerHTML = html;
        
        // Select first free model by default
        if (freeModels.length > 0) {
            selector.value = freeModels[0].id;
        }
    }
    
    switchSidebarTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.sidebar .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.sidebar .tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }
    
    switchPanelTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.panel-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.panel-content .tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        // Special handling for terminal
        if (tabName === 'terminal' && this.terminal) {
            this.terminal.focus();
        }
    }
    
    switchToAIChat() {
        this.switchPanelTab('ai-chat');
    }
    
    async sendAIMessage(message) {
        const messagesContainer = document.getElementById('chat-messages');
        const modelSelect = document.getElementById('ai-model-select');
        const selectedModel = modelSelect.value;
        
        if (!selectedModel) {
            this.showError('Please select an AI model first');
            return;
        }
        
        // Add user message
        this.addChatMessage(message, 'user');
        
        // Show typing indicator
        const typingId = this.addChatMessage('AI is thinking...', 'assistant', true);
        
        try {
            // Get current file context if available
            const context = this.getCurrentFileContext();
            
            // Build messages array
            const messages = [
                {
                    role: 'system',
                    content: `You are an AI coding assistant helping with software development. ${context ? `Current file context: ${context}` : ''}`
                },
                {
                    role: 'user',
                    content: message
                }
            ];
            
            const response = await fetch(`${this.API_BASE}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.auth.getToken()}`
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: messages
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to get AI response');
            }
            
            const result = await response.json();
            const aiResponse = result.choices[0].message.content;
            
            // Remove typing indicator and add real response
            this.removeChatMessage(typingId);
            this.addChatMessage(aiResponse, 'assistant');
            
        } catch (error) {
            console.error('Failed to send AI message:', error);
            this.removeChatMessage(typingId);
            this.addChatMessage('Sorry, I encountered an error: ' + error.message, 'assistant');
        }
    }
    
    addChatMessage(content, role, isTyping = false) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageId = 'msg-' + Date.now();
        
        const messageHtml = `
            <div class="chat-message ${role}" id="${messageId}">
                <div class="message-content">
                    ${isTyping ? `<p><i>${content}</i></p>` : this.formatMessageContent(content)}
                </div>
            </div>
        `;
        
        messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageId;
    }
    
    removeChatMessage(messageId) {
        const message = document.getElementById(messageId);
        if (message) {
            message.remove();
        }
    }
    
    formatMessageContent(content) {
        // Basic markdown-like formatting
        let formatted = content;
        
        // Code blocks
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        
        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        return `<p>${formatted}</p>`;
    }
    
    getCurrentFileContext() {
        if (this.activeTab && this.editor) {
            const content = this.editor.getCurrentContent();
            const fileName = this.activeTab;
            return `File: ${fileName}\n\n${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}`;
        }
        return null;
    }
    
    async saveCurrentFile() {
        if (!this.activeTab || !this.editor) {
            return;
        }
        
        try {
            const content = this.editor.getCurrentContent();
            
            await this.fileManager.saveFile(this.activeTab, content, this.currentProject?.id);
            
            // Update tab indicator
            const tabElement = document.querySelector(`[data-file="${this.activeTab}"]`);
            if (tabElement) {
                tabElement.classList.remove('modified');
            }
            
            this.showSuccess('File saved successfully!');
            
        } catch (error) {
            console.error('Failed to save file:', error);
            this.showError('Failed to save file: ' + error.message);
        }
    }
    
    async runCurrentFile() {
        if (!this.activeTab) {
            this.showError('No file selected to run');
            return;
        }
        
        // Save file first
        await this.saveCurrentFile();
        
        // Switch to output panel
        this.switchPanelTab('output');
        
        // Run file based on extension
        const extension = this.activeTab.split('.').pop().toLowerCase();
        let command;
        
        switch (extension) {
            case 'py':
                command = `python ${this.activeTab}`;
                break;
            case 'js':
                command = `node ${this.activeTab}`;
                break;
            case 'html':
                // Open in browser (simplified)
                this.showInfo('HTML files should be opened in a browser');
                return;
            default:
                this.showError('Unsupported file type for execution');
                return;
        }
        
        try {
            const result = await this.terminal.executeCommand(command);
            this.showOutput(result);
            
        } catch (error) {
            console.error('Failed to run file:', error);
            this.showError('Failed to run file: ' + error.message);
        }
    }
    
    showOutput(result) {
        const outputContent = document.getElementById('output-content');
        const timestamp = new Date().toLocaleTimeString();
        
        const outputHtml = `
            <div class="output-entry">
                <div class="output-header">
                    <span class="output-time">[${timestamp}]</span>
                    <span class="output-command">${result.command}</span>
                    <span class="output-status ${result.success ? 'success' : 'error'}">
                        ${result.success ? 'Success' : 'Error'} (${result.exit_code})
                    </span>
                </div>
                ${result.stdout ? `<div class="output-stdout"><pre>${result.stdout}</pre></div>` : ''}
                ${result.stderr ? `<div class="output-stderr"><pre>${result.stderr}</pre></div>` : ''}
            </div>
        `;
        
        outputContent.innerHTML = outputHtml;
        outputContent.scrollTop = outputContent.scrollHeight;
    }
    
    clearOutput() {
        const outputContent = document.getElementById('output-content');
        outputContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-play"></i>
                <p>No output yet</p>
            </div>
        `;
    }
    
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }
    
    async logout() {
        try {
            await this.auth.logout();
            window.location.reload();
        } catch (error) {
            console.error('Failed to logout:', error);
            // Force reload anyway
            window.location.reload();
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showInfo(message) {
        this.showNotification(message, 'info');
    }
    
    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Add styles if not already added
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 6px;
                    padding: 12px 16px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    max-width: 400px;
                    animation: slideInRight 0.3s ease;
                }
                .notification-error { border-left: 4px solid #ef4444; }
                .notification-success { border-left: 4px solid #10b981; }
                .notification-info { border-left: 4px solid #3b82f6; }
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: auto;
                    padding: 0;
                    color: #666;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the startup page
    if (window.location.pathname === '/static/index.html') {
        return; // Let the startup page handle redirection
    }
    
    // Check for token in URL (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        localStorage.setItem('auth_token', token);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Initialize main app
    window.app = new ShellIDEApp();
});
