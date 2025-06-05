import React, { useState, useEffect } from 'react';
import { getProjects, createProject, deleteProject } from '../services/api';

const ProjectManager = ({ user, onProjectSelect, activeProject }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    project_type: 'web',
    framework: 'react'
  });

  const projectTypes = {
    web: {
      name: 'Web Application',
      frameworks: {
        react: 'React',
        vue: 'Vue.js',
        angular: 'Angular',
        svelte: 'Svelte',
        vanilla: 'Vanilla JS',
        next: 'Next.js'
      }
    },
    backend: {
      name: 'Backend API',
      frameworks: {
        python: 'Python',
        flask: 'Flask',
        django: 'Django',
        fastapi: 'FastAPI',
        node: 'Node.js',
        express: 'Express.js'
      }
    },
    mobile: {
      name: 'Mobile App',
      frameworks: {
        'react-native': 'React Native',
        flutter: 'Flutter',
        expo: 'Expo'
      }
    },
    desktop: {
      name: 'Desktop App',
      frameworks: {
        electron: 'Electron',
        tauri: 'Tauri',
        tkinter: 'Tkinter (Python)'
      }
    },
    api: {
      name: 'API Service',
      frameworks: {
        rest: 'REST API',
        graphql: 'GraphQL',
        websocket: 'WebSocket'
      }
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await getProjects();
      if (response.success) {
        setProjects(response.data);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    if (!createForm.name.trim()) {
      alert('Project name is required');
      return;
    }

    try {
      const response = await createProject(createForm);
      if (response.success) {
        setProjects(prev => [...prev, response.data]);
        setShowCreateForm(false);
        setCreateForm({
          name: '',
          description: '',
          project_type: 'web',
          framework: 'react'
        });
        onProjectSelect(response.data);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (window.confirm(`Are you sure you want to delete "${projectName}"?`)) {
      try {
        const response = await deleteProject(projectId);
        if (response.success) {
          setProjects(prev => prev.filter(p => p.id !== projectId));
          if (activeProject && activeProject.id === projectId) {
            onProjectSelect(null);
          }
        }
      } catch (error) {
        console.error('Failed to delete project:', error);
        alert('Failed to delete project');
      }
    }
  };

  const getProjectIcon = (type, framework) => {
    const icons = {
      web: '🌐',
      backend: '⚙️',
      mobile: '📱',
      desktop: '💻',
      api: '🔌'
    };
    return icons[type] || '📁';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="project-manager">
      <div className="project-header">
        <h3>Projects</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="create-project-btn"
          title="Create new project"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Project
        </button>
      </div>

      <div className="project-content">
        {loading ? (
          <div className="project-loading">
            <div className="spinner"></div>
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="project-empty">
            <div className="empty-icon">📁</div>
            <h4>No projects yet</h4>
            <p>Create your first project to get started</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="create-first-project-btn"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="project-list">
            {projects.map(project => (
              <div
                key={project.id}
                className={`project-item ${activeProject && activeProject.id === project.id ? 'active' : ''}`}
                onClick={() => onProjectSelect(project)}
              >
                <div className="project-icon">
                  {getProjectIcon(project.project_type, project.framework)}
                </div>
                
                <div className="project-info">
                  <h4 className="project-name">{project.name}</h4>
                  <p className="project-description">
                    {project.description || 'No description'}
                  </p>
                  <div className="project-meta">
                    <span className="project-type">
                      {projectTypes[project.project_type]?.name || project.project_type}
                    </span>
                    <span className="project-framework">
                      {project.framework}
                    </span>
                    <span className="project-date">
                      {formatDate(project.created_at)}
                    </span>
                  </div>
                </div>
                
                <div className="project-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id, project.name);
                    }}
                    className="delete-project-btn"
                    title="Delete project"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="create-project-modal">
            <div className="modal-header">
              <h3>Create New Project</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="close-modal-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="create-project-form">
              <div className="form-group">
                <label htmlFor="project-name">Project Name *</label>
                <input
                  id="project-name"
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Awesome Project"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="project-description">Description</label>
                <textarea
                  id="project-description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your project..."
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="project-type">Project Type</label>
                  <select
                    id="project-type"
                    value={createForm.project_type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const frameworks = Object.keys(projectTypes[type]?.frameworks || {});
                      setCreateForm(prev => ({ 
                        ...prev, 
                        project_type: type,
                        framework: frameworks[0] || ''
                      }));
                    }}
                  >
                    {Object.entries(projectTypes).map(([key, type]) => (
                      <option key={key} value={key}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="project-framework">Framework</label>
                  <select
                    id="project-framework"
                    value={createForm.framework}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, framework: e.target.value }))}
                  >
                    {Object.entries(projectTypes[createForm.project_type]?.frameworks || {}).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="project-template-preview">
                <h4>Project Template</h4>
                <div className="template-info">
                  <div className="template-icon">
                    {getProjectIcon(createForm.project_type, createForm.framework)}
                  </div>
                  <div className="template-details">
                    <span className="template-type">
                      {projectTypes[createForm.project_type]?.name}
                    </span>
                    <span className="template-framework">
                      {projectTypes[createForm.project_type]?.frameworks[createForm.framework]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="create-btn"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManager;
