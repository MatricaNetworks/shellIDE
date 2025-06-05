import React, { useState, useEffect } from 'react';
import { getProjectFiles, getFileContent, updateFileContent, createFile, deleteFile, createDirectory } from '../services/api';

const FileExplorer = ({ project, onFileSelect, activeFile }) => {
  const [fileTree, setFileTree] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['']));
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [creating, setCreating] = useState(null); // { type: 'file' | 'folder', parent: string }

  useEffect(() => {
    if (project) {
      loadFileTree();
    }
  }, [project]);

  const loadFileTree = async () => {
    if (!project) return;
    
    setLoading(true);
    try {
      const response = await getProjectFiles(project.id);
      if (response.success) {
        setFileTree(response.file_tree);
      }
    } catch (error) {
      console.error('Failed to load file tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = async (file) => {
    if (file.type === 'directory') {
      toggleFolder(file.path);
    } else {
      try {
        const response = await getFileContent(project.id, file.path);
        if (response.success) {
          onFileSelect({
            ...file,
            content: response.content
          });
        }
      } catch (error) {
        console.error('Failed to load file content:', error);
      }
    }
  };

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleCreateFile = (parentPath = '') => {
    setCreating({ type: 'file', parent: parentPath });
    closeContextMenu();
  };

  const handleCreateFolder = (parentPath = '') => {
    setCreating({ type: 'folder', parent: parentPath });
    closeContextMenu();
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      try {
        const response = await deleteFile(project.id, item.path);
        if (response.success) {
          loadFileTree();
        }
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
    closeContextMenu();
  };

  const handleCreateSubmit = async (name) => {
    if (!name.trim()) return;
    
    const fullPath = creating.parent ? `${creating.parent}/${name}` : name;
    
    try {
      if (creating.type === 'file') {
        const response = await createFile(project.id, fullPath, '');
        if (response.success) {
          loadFileTree();
        }
      } else {
        const response = await createDirectory(project.id, fullPath);
        if (response.success) {
          loadFileTree();
          setExpandedFolders(prev => new Set([...prev, fullPath]));
        }
      }
    } catch (error) {
      console.error(`Failed to create ${creating.type}:`, error);
    }
    
    setCreating(null);
  };

  const renderFileItem = (item, depth = 0) => {
    const isExpanded = expandedFolders.has(item.path);
    const isActive = activeFile && activeFile.path === item.path;
    
    return (
      <div key={item.path}>
        <div
          className={`file-item ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: depth * 16 + 8 }}
          onClick={() => handleFileClick(item)}
          onContextMenu={(e) => handleContextMenu(e, item)}
        >
          <div className="file-item-content">
            {item.type === 'directory' && (
              <svg 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className={`folder-icon ${isExpanded ? 'expanded' : ''}`}
              >
                <polyline points="9,6 15,12 9,18"></polyline>
              </svg>
            )}
            
            <div className="file-icon">
              {item.type === 'directory' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2l5 0h9a2 2 0 0 1 2 2z"></path>
                </svg>
              ) : (
                <FileIcon extension={item.extension} />
              )}
            </div>
            
            <span className="file-name">{item.name}</span>
            
            {item.type === 'file' && (
              <span className="file-size">{formatFileSize(item.size)}</span>
            )}
          </div>
        </div>
        
        {item.type === 'directory' && isExpanded && item.children && (
          <div className="folder-children">
            {item.children.map(child => renderFileItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderCreateInput = () => {
    if (!creating) return null;
    
    return (
      <div className="create-input-overlay">
        <div className="create-input-dialog">
          <h3>Create {creating.type}</h3>
          <input
            type="text"
            placeholder={`${creating.type} name`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateSubmit(e.target.value);
              } else if (e.key === 'Escape') {
                setCreating(null);
              }
            }}
          />
          <div className="create-input-actions">
            <button onClick={() => setCreating(null)}>Cancel</button>
            <button onClick={(e) => {
              const input = e.target.parentElement.parentElement.querySelector('input');
              handleCreateSubmit(input.value);
            }}>
              Create
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!project) {
    return (
      <div className="file-explorer">
        <div className="explorer-header">
          <h3>Explorer</h3>
        </div>
        <div className="explorer-empty">
          Select a project to view files
        </div>
      </div>
    );
  }

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <h3>{project.name}</h3>
        <div className="explorer-actions">
          <button
            onClick={() => handleCreateFile()}
            title="New File"
            className="explorer-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </button>
          
          <button
            onClick={() => handleCreateFolder()}
            title="New Folder"
            className="explorer-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2l5 0h9a2 2 0 0 1 2 2z"></path>
              <line x1="12" y1="11" x2="12" y2="17"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
          </button>
          
          <button
            onClick={loadFileTree}
            title="Refresh"
            className="explorer-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23,4 23,10 17,10"></polyline>
              <polyline points="1,20 1,14 7,14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="explorer-content">
        {loading ? (
          <div className="explorer-loading">
            <div className="spinner"></div>
            Loading files...
          </div>
        ) : fileTree ? (
          <div className="file-tree">
            {renderFileItem(fileTree)}
          </div>
        ) : (
          <div className="explorer-empty">
            No files found
          </div>
        )}
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={closeContextMenu}
        >
          <button onClick={() => handleCreateFile(contextMenu.item.type === 'directory' ? contextMenu.item.path : '')}>
            New File
          </button>
          <button onClick={() => handleCreateFolder(contextMenu.item.type === 'directory' ? contextMenu.item.path : '')}>
            New Folder
          </button>
          <hr />
          <button onClick={() => handleDelete(contextMenu.item)} className="danger">
            Delete
          </button>
        </div>
      )}
      
      {/* Create Input Dialog */}
      {renderCreateInput()}
      
      {/* Click outside to close context menu */}
      {contextMenu && (
        <div className="context-menu-overlay" onClick={closeContextMenu} />
      )}
    </div>
  );
};

// File icon component based on extension
const FileIcon = ({ extension }) => {
  const getIcon = () => {
    switch (extension?.toLowerCase()) {
      case '.js':
      case '.jsx':
        return '🟨'; // JavaScript
      case '.ts':
      case '.tsx':
        return '🔷'; // TypeScript
      case '.py':
        return '🐍'; // Python
      case '.html':
        return '🌐'; // HTML
      case '.css':
      case '.scss':
      case '.sass':
        return '🎨'; // Styles
      case '.json':
        return '📋'; // JSON
      case '.md':
        return '📝'; // Markdown
      case '.xml':
        return '📄'; // XML
      case '.yaml':
      case '.yml':
        return '⚙️'; // YAML
      case '.dockerfile':
        return '🐳'; // Docker
      case '.git':
        return '🌳'; // Git
      default:
        return '📄'; // Default file
    }
  };

  return <span className="file-icon-emoji">{getIcon()}</span>;
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default FileExplorer;
