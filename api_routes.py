import os
import asyncio
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import models
from database import get_db
from auth import get_current_user
from openrouter_client import OpenRouterClient
from terminal_manager import TerminalManager
from file_manager import FileManager
from project_templates import ProjectTemplateManager

api_router = APIRouter()

# Pydantic models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    project_type: str
    framework: str

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class FileCreate(BaseModel):
    filename: str
    file_path: str
    content: str = ""

class FileUpdate(BaseModel):
    content: str

class ChatMessage(BaseModel):
    message: str
    model: str
    context_type: str = "general"
    project_id: Optional[int] = None

class CommandExecute(BaseModel):
    command: str
    project_id: Optional[int] = None
    working_directory: Optional[str] = None

# Initialize managers
terminal_manager = TerminalManager()
file_manager = FileManager()
template_manager = ProjectTemplateManager()

@api_router.get("/projects")
async def get_projects(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all user projects"""
    projects = db.query(models.Project).filter(
        models.Project.owner_id == current_user.id,
        models.Project.is_active == True
    ).all()
    
    return [
        {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "project_type": project.project_type,
            "framework": project.framework,
            "directory_path": project.directory_path,
            "settings": project.settings,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat()
        }
        for project in projects
    ]

@api_router.post("/projects")
async def create_project(
    project_data: ProjectCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    try:
        # Create project directory
        project_path = file_manager.create_project_directory(
            project_data.name,
            current_user.id
        )
        
        # Create project in database
        project = models.Project(
            name=project_data.name,
            description=project_data.description,
            project_type=project_data.project_type,
            framework=project_data.framework,
            directory_path=project_path,
            owner_id=current_user.id
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)
        
        # Initialize project with template
        template_manager.initialize_project(
            project_path,
            project_data.project_type,
            project_data.framework
        )
        
        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "project_type": project.project_type,
            "framework": project.framework,
            "directory_path": project.directory_path,
            "message": "Project created successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create project: {str(e)}")

@api_router.get("/projects/{project_id}")
async def get_project(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific project details"""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
        models.Project.is_active == True
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "project_type": project.project_type,
        "framework": project.framework,
        "directory_path": project.directory_path,
        "settings": project.settings,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat()
    }

@api_router.put("/projects/{project_id}")
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update project"""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
        models.Project.is_active == True
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project_update.name:
        project.name = project_update.name
    if project_update.description is not None:
        project.description = project_update.description
    if project_update.settings:
        project.settings = project_update.settings
    
    db.commit()
    
    return {"message": "Project updated successfully"}

@api_router.delete("/projects/{project_id}")
async def delete_project(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete project"""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
        models.Project.is_active == True
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Soft delete
    project.is_active = False
    db.commit()
    
    # Optional: Delete project directory
    try:
        file_manager.delete_project_directory(project.directory_path)
    except Exception as e:
        print(f"Warning: Could not delete project directory: {e}")
    
    return {"message": "Project deleted successfully"}

@api_router.get("/projects/{project_id}/files")
async def get_project_files(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get project file tree"""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
        models.Project.is_active == True
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        file_tree = file_manager.get_file_tree(project.directory_path)
        return {"file_tree": file_tree}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get file tree: {str(e)}")

@api_router.get("/projects/{project_id}/files/{file_path:path}")
async def get_file_content(
    project_id: int,
    file_path: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get file content"""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
        models.Project.is_active == True
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        content = file_manager.read_file(project.directory_path, file_path)
        return {"content": content, "file_path": file_path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

@api_router.put("/projects/{project_id}/files/{file_path:path}")
async def update_file_content(
    project_id: int,
    file_path: str,
    file_update: FileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update file content"""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
        models.Project.is_active == True
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        file_manager.write_file(project.directory_path, file_path, file_update.content)
        return {"message": "File updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update file: {str(e)}")

@api_router.post("/projects/{project_id}/files")
async def create_file(
    project_id: int,
    file_create: FileCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new file"""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
        models.Project.is_active == True
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        file_manager.create_file(
            project.directory_path,
            file_create.file_path,
            file_create.content
        )
        return {"message": "File created successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create file: {str(e)}")

@api_router.delete("/projects/{project_id}/files/{file_path:path}")
async def delete_file(
    project_id: int,
    file_path: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete file"""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
        models.Project.is_active == True
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        file_manager.delete_file(project.directory_path, file_path)
        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete file: {str(e)}")

@api_router.post("/terminal/execute")
async def execute_command(
    command_data: CommandExecute,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute terminal command"""
    try:
        working_dir = command_data.working_directory
        
        if command_data.project_id:
            project = db.query(models.Project).filter(
                models.Project.id == command_data.project_id,
                models.Project.owner_id == current_user.id,
                models.Project.is_active == True
            ).first()
            
            if project:
                working_dir = project.directory_path
        
        result = await terminal_manager.execute_command(
            command_data.command,
            working_dir
        )
        
        # Log execution
        log_entry = models.ExecutionLog(
            user_id=current_user.id,
            project_id=command_data.project_id,
            command=command_data.command,
            output=result.get("output", ""),
            error_output=result.get("error", ""),
            exit_code=result.get("exit_code", 0),
            execution_time=result.get("execution_time", 0)
        )
        db.add(log_entry)
        db.commit()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Command execution failed: {str(e)}")

@api_router.get("/openrouter/models")
async def get_openrouter_models(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available OpenRouter models"""
    try:
        # Get user's OpenRouter API key
        api_key_obj = db.query(models.APIKey).filter(
            models.APIKey.user_id == current_user.id,
            models.APIKey.service == "openrouter",
            models.APIKey.is_active == True
        ).first()
        
        if not api_key_obj:
            raise HTTPException(status_code=400, detail="OpenRouter API key not found. Please add your API key in settings.")
        
        client = OpenRouterClient(api_key_obj.api_key)
        models_data = await client.get_models()
        
        return {"models": models_data}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get models: {str(e)}")

@api_router.post("/ai/chat")
async def ai_chat(
    chat_data: ChatMessage,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Chat with AI assistant"""
    try:
        # Get user's OpenRouter API key
        api_key_obj = db.query(models.APIKey).filter(
            models.APIKey.user_id == current_user.id,
            models.APIKey.service == "openrouter",
            models.APIKey.is_active == True
        ).first()
        
        if not api_key_obj:
            raise HTTPException(status_code=400, detail="OpenRouter API key not found. Please add your API key in settings.")
        
        client = OpenRouterClient(api_key_obj.api_key)
        
        # Get conversation context if exists
        conversation = None
        if chat_data.project_id:
            conversation = db.query(models.AIConversation).filter(
                models.AIConversation.user_id == current_user.id,
                models.AIConversation.project_id == chat_data.project_id,
                models.AIConversation.context_type == chat_data.context_type
            ).first()
        
        if not conversation:
            conversation = models.AIConversation(
                user_id=current_user.id,
                project_id=chat_data.project_id,
                model_name=chat_data.model,
                context_type=chat_data.context_type,
                conversation_data=[]
            )
            db.add(conversation)
        
        # Add user message to conversation
        conversation.conversation_data.append({
            "role": "user",
            "content": chat_data.message,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Get AI response
        response = await client.chat_completion(
            model=chat_data.model,
            messages=conversation.conversation_data,
            context_type=chat_data.context_type
        )
        
        # Add AI response to conversation
        conversation.conversation_data.append({
            "role": "assistant",
            "content": response["content"],
            "timestamp": datetime.utcnow().isoformat()
        })
        
        conversation.model_name = chat_data.model
        db.commit()
        
        return {
            "response": response["content"],
            "model": chat_data.model,
            "conversation_id": conversation.id
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"AI chat failed: {str(e)}")

@api_router.get("/ai/conversations")
async def get_conversations(
    project_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's AI conversations"""
    query = db.query(models.AIConversation).filter(
        models.AIConversation.user_id == current_user.id
    )
    
    if project_id:
        query = query.filter(models.AIConversation.project_id == project_id)
    
    conversations = query.order_by(models.AIConversation.updated_at.desc()).all()
    
    return [
        {
            "id": conv.id,
            "project_id": conv.project_id,
            "model_name": conv.model_name,
            "context_type": conv.context_type,
            "message_count": len(conv.conversation_data),
            "last_message": conv.conversation_data[-1]["content"][:100] + "..." if conv.conversation_data else "",
            "updated_at": conv.updated_at.isoformat()
        }
        for conv in conversations
    ]

@api_router.get("/system/info")
async def get_system_info(current_user: models.User = Depends(get_current_user)):
    """Get system information"""
    import platform
    import psutil
    
    return {
        "os": platform.system(),
        "os_version": platform.version(),
        "architecture": platform.machine(),
        "python_version": platform.python_version(),
        "cpu_count": psutil.cpu_count(),
        "memory_total": psutil.virtual_memory().total,
        "disk_usage": psutil.disk_usage('/').percent
    }
