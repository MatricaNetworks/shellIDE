// FileExplorer - File system navigation and management

class FileExplorer {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.fileTree = null;
        this.currentPath = '';
        this.expandedDirs = new Set();
        this.selectedFile = null;
        
        // File type icons
        this.fileIcons = {
            // Folders
            'folder': '📁',
            'folder-open': '📂',
            
            // Programming languages
            'js': '🟨',
            'jsx': '⚛️',
            'ts': '🔷',
            'tsx': '⚛️',
            'py': '🐍',
            'java': '☕',
            'cpp': '⚙️',
            'c': '⚙️',
            'cs': '🔷',
            'php': '🐘',
            'rb': '💎',
            'go': '🐹',
            'rs': '🦀',
            'swift': '🧡',
            'kt': '🟣',
            
            // Web technologies
            'html': '🌐',
            'css': '🎨',
            'scss': '🎨',
            'sass': '🎨',
            'less': '🎨',
            'vue': '💚',
            'svelte': '🧡',
            
            // Data formats
            'json': '📋',
            'xml': '📋',
            'yaml': '📋',
            'yml': '📋',
            'csv': '📊',
            'sql': '🗃️',
            
            // Documentation
            'md': '📝',
            'txt': '📄',
            'pdf': '📕',
            'doc': '📘',
            'docx': '📘',
            
            // Images
            'png': '🖼️',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'gif': '🖼️',
            'svg': '🎨',
            'ico': '🖼️',
            
            // Config files
            'gitignore': '🚫',
            'env': '⚙️',
            'config': '⚙️',
            'ini': '⚙️',
            'conf': '⚙️',
            
            // Build files
            'package': '📦',
            'requirements': '📦',
            'cargo': '📦',
            'pom': '📦',
            'gradle': '📦',
            'makefile': '🔨',
            'dockerfile': '🐳',
            
            // Default
            'default': '📄'
        };
    }
    
    init() {
        this.container = document.getElementById('fileExplorer');
        this.fileTree = document.getElementById('fileTree');
        
        if (!this.container || !this.fileTree) {
            console.error('File explorer elements not found');
            return;
        }
        
        this.setupEventListeners();
        this.loadFiles();
        
        console.log('File explorer initialized');
    }
    
    setupEventListeners() {
        // New file/folder buttons
        const newFileBtn = document.getElementById('newFileBtn');
        const newFolderBtn = document.getElementById('newFolderBtn');
        const refreshBtn = document.getElementById('refreshFilesBtn');
        
        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => this.createNewFile());
        }
        
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => this.createNewFolder());
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshFiles());
        }
        
        // Context menu
        this.setupContextMenu();
    }
    
    setupContextMenu() {
        this.fileTree.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e);
        });
        
        // Hide context menu on click elsewhere
        document.addEventListener('click', () => this.hideContextMenu());
    }
    
    async loadFiles(path = '') {
        try {
            const params = new URLSearchParams();
            if (path) params.append('path', path);
            if (this.app.currentProject) {
                params.append('project_id', this.app.currentProject.id);
            }
            
            const response = await fetch(`/api/files?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderFileTree(data.files, path);
            } else {
                this.showError(data.error || 'Failed to load files');
            }
        } catch (error) {
            console.error('Load files error:', error);
            this.showError('Failed to load files');
        }
    }
    
    async loadProjectFiles(project) {
        this.currentPath = '';
        this.expandedDirs.clear();
        this.selectedFile = null;
        await this.loadFiles();
    }
    
    renderFileTree(files, basePath = '') {
        if (!this.fileTree) return;
        
        // Clear existing content if rendering root
        if (!basePath) {
            this.fileTree.innerHTML = '';
        }
        
        const container = basePath ? 
            this.fileTree.querySelector(`[data-path="${basePath}"] .file-children`) : 
            this.fileTree;
        
        if (!container) return;
        
        // Sort files: directories first, then by name
        files.sort((a, b) => {
            if (a.is_directory !== b.is_directory) {
                return a.is_directory ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
        
        files.forEach(file => {
            const fileItem = this.createFileItem(file, basePath);
            container.appendChild(fileItem);
        });
    }
    
    createFileItem(file, basePath) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.path = file.path;
        item.dataset.isDirectory = file.is_directory;
        
        const indent = basePath.split('/').filter(p => p).length * 20;
        
        item.innerHTML = `
            <div class="file-item-content" style="padding-left: ${indent}px;">
                ${file.is_directory ? 
                    `<span class="expand-icon">${this.expandedDirs.has(file.path) ? '▼' : '▶'}</span>` : 
                    '<span class="expand-icon"></span>'
                }
                <span class="file-icon">${this.getFileIcon(file)}</span>
                <span class="file-name">${file.name}</span>
                ${file.size !== undefined ? `<span class="file-size">${this.formatFileSize(file.size)}</span>` : ''}
            </div>
            ${file.is_directory ? '<div class="file-children"></div>' : ''}
        `;
        
        // Add event listeners
        const content = item.querySelector('.file-item-content');
        
        content.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleFileClick(file, item);
        });
        
        content.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.handleFileDoubleClick(file);
        });
        
        return item;
    }
    
    getFileIcon(file) {
        if (file.is_directory) {
            return this.expandedDirs.has(file.path) ? 
                this.fileIcons['folder-open'] : 
                this.fileIcons['folder'];
        }
        
        const ext = file.name.split('.').pop().toLowerCase();
        const fileName = file.name.toLowerCase();
        
        // Special file names
        if (fileName === 'package.json') return this.fileIcons['package'];
        if (fileName === 'requirements.txt') return this.fileIcons['requirements'];
        if (fileName === 'cargo.toml') return this.fileIcons['cargo'];
        if (fileName === 'dockerfile') return this.fileIcons['dockerfile'];
        if (fileName.startsWith('.git')) return this.fileIcons['gitignore'];
        if (fileName.includes('.env')) return this.fileIcons['env'];
        if (fileName === 'makefile') return this.fileIcons['makefile'];
        
        // By extension
        return this.fileIcons[ext] || this.fileIcons['default'];
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    async handleFileClick(file, item) {
        // Remove previous selection
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Select current item
        item.classList.add('selected');
        this.selectedFile = file;
        
        if (file.is_directory) {
            await this.toggleDirectory(file.path, item);
        }
    }
    
    async handleFileDoubleClick(file) {
        if (file.is_directory) {
            // Already handled by single click
            return;
        }
        
        if (file.is_editable) {
            // Open file in editor
            await this.app.openFile(file.path);
        } else {
            this.app.showWarning(`File type not supported for editing: ${file.name}`);
        }
    }
    
    async toggleDirectory(dirPath, item) {
        const childrenContainer = item.querySelector('.file-children');
        const expandIcon = item.querySelector('.expand-icon');
        
        if (this.expandedDirs.has(dirPath)) {
            // Collapse directory
            this.expandedDirs.delete(dirPath);
            childrenContainer.innerHTML = '';
            expandIcon.textContent = '▶';
            
            // Update folder icon
            const fileIcon = item.querySelector('.file-icon');
            fileIcon.textContent = this.fileIcons['folder'];
        } else {
            // Expand directory
            this.expandedDirs.add(dirPath);
            expandIcon.textContent = '▼';
            
            // Update folder icon
            const fileIcon = item.querySelector('.file-icon');
            fileIcon.textContent = this.fileIcons['folder-open'];
            
            // Load directory contents
            await this.loadDirectoryContents(dirPath, childrenContainer);
        }
    }
    
    async loadDirectoryContents(dirPath, container) {
        try {
            const params = new URLSearchParams();
            params.append('path', dirPath);
            if (this.app.currentProject) {
                params.append('project_id', this.app.currentProject.id);
            }
            
            const response = await fetch(`/api/files?${params}`);
            const data = await response.json();
            
            if (data.success) {
                // Sort and create file items
                data.files.sort((a, b) => {
                    if (a.is_directory !== b.is_directory) {
                        return a.is_directory ? -1 : 1;
                    }
                    return a.name.localeCompare(b.name);
                });
                
                const indent = dirPath.split('/').filter(p => p).length * 20;
                
                data.files.forEach(file => {
                    const fileItem = this.createFileItem(file, dirPath);
                    container.appendChild(fileItem);
                });
            }
        } catch (error) {
            console.error('Load directory error:', error);
            this.app.showError('Failed to load directory contents');
        }
    }
    
    showContextMenu(e) {
        const rect = e.target.getBoundingClientRect();
        const fileItem = e.target.closest('.file-item');
        const file = fileItem ? {
            path: fileItem.dataset.path,
            isDirectory: fileItem.dataset.isDirectory === 'true',
            name: fileItem.querySelector('.file-name').textContent
        } : null;
        
        this.hideContextMenu(); // Hide any existing menu
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${e.clientY}px;
            left: ${e.clientX}px;
            background: hsl(var(--surface));
            border: 1px solid hsl(var(--border));
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            min-width: 150px;
        `;
        
        const menuItems = [];
        
        if (file) {
            if (!file.isDirectory) {
                menuItems.push({ text: 'Open', action: () => this.app.openFile(file.path) });
                menuItems.push({ text: 'Open in New Tab', action: () => this.app.openFile(file.path) });
                menuItems.push({ text: '---' });
            }
            
            menuItems.push({ text: 'Rename', action: () => this.renameFile(file) });
            menuItems.push({ text: 'Delete', action: () => this.deleteFile(file) });
            menuItems.push({ text: '---' });
        }
        
        menuItems.push({ text: 'New File', action: () => this.createNewFile(file?.isDirectory ? file.path : '') });
        menuItems.push({ text: 'New Folder', action: () => this.createNewFolder(file?.isDirectory ? file.path : '') });
        menuItems.push({ text: '---' });
        menuItems.push({ text: 'Refresh', action: () => this.refreshFiles() });
        
        menuItems.forEach(item => {
            if (item.text === '---') {
                const separator = document.createElement('div');
                separator.style.cssText = 'height: 1px; background: hsl(var(--border)); margin: 0.5rem 0;';
                menu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.textContent = item.text;
                menuItem.style.cssText = `
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: background-color 0.2s;
                `;
                
                menuItem.addEventListener('mouseenter', () => {
                    menuItem.style.background = 'hsl(var(--surface-dark))';
                });
                
                menuItem.addEventListener('mouseleave', () => {
                    menuItem.style.background = 'transparent';
                });
                
                menuItem.addEventListener('click', () => {
                    item.action();
                    this.hideContextMenu();
                });
                
                menu.appendChild(menuItem);
            }
        });
        
        document.body.appendChild(menu);
        
        // Position adjustment if menu goes off-screen
        const menuRect = menu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            menu.style.left = (e.clientX - menuRect.width) + 'px';
        }
        if (menuRect.bottom > window.innerHeight) {
            menu.style.top = (e.clientY - menuRect.height) + 'px';
        }
    }
    
    hideContextMenu() {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }
    
    async createNewFile(parentPath = '') {
        const fileName = prompt('Enter file name:');
        if (!fileName) return;
        
        const fullPath = parentPath ? `${parentPath}/${fileName}` : fileName;
        
        try {
            const response = await fetch('/api/files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: fullPath,
                    content: '',
                    project_id: this.app.currentProject?.id
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.app.showSuccess('File created successfully');
                this.refreshFiles();
                
                // Open the new file
                setTimeout(() => {
                    this.app.openFile(fullPath, '');
                }, 500);
            } else {
                this.app.showError(data.error || 'Failed to create file');
            }
        } catch (error) {
            console.error('Create file error:', error);
            this.app.showError('Failed to create file');
        }
    }
    
    async createNewFolder(parentPath = '') {
        const folderName = prompt('Enter folder name:');
        if (!folderName) return;
        
        const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;
        
        try {
            // For now, we'll create a folder by creating a temporary file inside it
            // This is a workaround since HTTP doesn't directly support folder creation
            const tempFilePath = `${fullPath}/.gitkeep`;
            
            const response = await fetch('/api/files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: tempFilePath,
                    content: '',
                    project_id: this.app.currentProject?.id
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.app.showSuccess('Folder created successfully');
                this.refreshFiles();
            } else {
                this.app.showError(data.error || 'Failed to create folder');
            }
        } catch (error) {
            console.error('Create folder error:', error);
            this.app.showError('Failed to create folder');
        }
    }
    
    async renameFile(file) {
        const newName = prompt('Enter new name:', file.name);
        if (!newName || newName === file.name) return;
        
        // TODO: Implement rename API endpoint
        this.app.showWarning('Rename functionality will be implemented soon');
    }
    
    async deleteFile(file) {
        const confirmMessage = file.isDirectory ? 
            `Are you sure you want to delete the folder "${file.name}" and all its contents?` :
            `Are you sure you want to delete "${file.name}"?`;
        
        if (!confirm(confirmMessage)) return;
        
        // TODO: Implement delete API endpoint
        this.app.showWarning('Delete functionality will be implemented soon');
    }
    
    async refreshFiles() {
        this.expandedDirs.clear();
        this.selectedFile = null;
        await this.loadFiles();
        this.app.showSuccess('Files refreshed');
    }
    
    showError(message) {
        this.app.showError(message);
    }
    
    // Search functionality
    searchFiles(query) {
        const allItems = document.querySelectorAll('.file-item');
        
        allItems.forEach(item => {
            const fileName = item.querySelector('.file-name').textContent.toLowerCase();
            const matches = fileName.includes(query.toLowerCase());
            
            item.style.display = matches || !query ? 'block' : 'none';
        });
    }
    
    // Drag and drop support (future enhancement)
    setupDragAndDrop() {
        this.fileTree.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        this.fileTree.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleFileDrop(e);
        });
    }
    
    handleFileDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        
        files.forEach(file => {
            // Handle file upload
            this.uploadFile(file);
        });
    }
    
    async uploadFile(file) {
        // TODO: Implement file upload
        console.log('File upload will be implemented:', file.name);
    }
}
