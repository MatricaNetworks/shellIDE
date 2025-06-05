import os
import json
import asyncio
import subprocess
import platform
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
import jwt
import httpx

from database import get_db, create_tables
from models import User, Project, ApiKey
from auth import GoogleAuth
from openrouter_client import OpenRouterClient
from file_manager import FileManager
from terminal_manager import TerminalManager
from project_manager import ProjectManager

# Initialize FastAPI app
app = FastAPI(title="ShellIDE", description="AI-Powered Development Platform")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Security
security = HTTPBearer(auto_error=False)

# Initialize services
google_auth = GoogleAuth()
terminal_manager = TerminalManager()
file_manager = FileManager()
project_manager = ProjectManager()

# JWT Secret
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()

# Pydantic models
class LoginRequest(BaseModel):
    credential: str

class ApiKeyRequest(BaseModel):
    api_key: str

class CodeRequest(BaseModel):
    code: str
    language: str
    
class TerminalCommand(BaseModel):
    command: str
    working_directory: Optional[str] = None

class FileOperation(BaseModel):
    path: str
    content: Optional[str] = None
    operation: str  # create, read, update, delete

class ProjectCreate(BaseModel):
    name: str
    template: str
    description: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

# Helper functions
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def create_jwt_token(user_id: int) -> str:
    payload = {"user_id": user_id}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

# Routes
@app.on_event("startup")
async def startup_event():
    create_tables()
    print("ShellIDE is starting up...")
    print("Setting up database...")
    print("Initializing services...")

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/app", response_class=HTMLResponse)
async def app_page(request: Request):
    with open("static/index.html", "r") as f:
        return HTMLResponse(content=f.read())

@app.post("/auth/google")
async def google_login(request: LoginRequest, db: Session = Depends(get_db)):
    try:
        user_info = await google_auth.verify_token(request.credential)
        
        # Check if user exists
        user = db.query(User).filter(User.email == user_info["email"]).first()
        
        if not user:
            # Create new user
            user = User(
                email=user_info["email"],
                name=user_info["name"],
                picture=user_info.get("picture", ""),
                google_id=user_info["sub"]
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Create JWT token
        token = create_jwt_token(user.id)
        
        return {
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "picture": user.picture
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}

@app.get("/user/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "picture": current_user.picture
    }

@app.post("/api-keys")
async def add_api_key(request: ApiKeyRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Test the API key
        client = OpenRouterClient(request.api_key)
        models = await client.get_models()
        
        # Save API key
        api_key = ApiKey(
            user_id=current_user.id,
            key_value=request.api_key,
            provider="openrouter",
            is_active=True
        )
        db.add(api_key)
        db.commit()
        
        return {"message": "API key added successfully", "models": models}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid API key: {str(e)}")

@app.get("/api-keys")
async def get_api_keys(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    keys = db.query(ApiKey).filter(ApiKey.user_id == current_user.id).all()
    return [{"id": key.id, "provider": key.provider, "is_active": key.is_active, "created_at": key.created_at} for key in keys]

@app.delete("/api-keys/{key_id}")
async def delete_api_key(key_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.user_id == current_user.id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    db.delete(key)
    db.commit()
    return {"message": "API key deleted successfully"}

@app.get("/openrouter/models")
async def get_openrouter_models(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    api_key = db.query(ApiKey).filter(
        ApiKey.user_id == current_user.id,
        ApiKey.provider == "openrouter",
        ApiKey.is_active == True
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=400, detail="No active OpenRouter API key found")
    
    try:
        client = OpenRouterClient(api_key.key_value)
        models = await client.get_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    api_key = db.query(ApiKey).filter(
        ApiKey.user_id == current_user.id,
        ApiKey.provider == "openrouter",
        ApiKey.is_active == True
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=400, detail="No active OpenRouter API key found")
    
    try:
        client = OpenRouterClient(api_key.key_value)
        response = await client.chat_completion(
            message=request.message,
            model=request.model,
            context=request.context
        )
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/execute/code")
async def execute_code(request: CodeRequest, current_user: User = Depends(get_current_user)):
    try:
        result = await terminal_manager.execute_code(request.code, request.language)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/terminal/command")
async def execute_terminal_command(request: TerminalCommand, current_user: User = Depends(get_current_user)):
    try:
        result = await terminal_manager.execute_command(request.command, request.working_directory)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/files")
async def list_files(path: str = ".", current_user: User = Depends(get_current_user)):
    try:
        files = file_manager.list_files(path)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/files")
async def file_operation(request: FileOperation, current_user: User = Depends(get_current_user)):
    try:
        if request.operation == "create":
            result = file_manager.create_file(request.path, request.content or "")
        elif request.operation == "read":
            result = file_manager.read_file(request.path)
        elif request.operation == "update":
            result = file_manager.update_file(request.path, request.content or "")
        elif request.operation == "delete":
            result = file_manager.delete_file(request.path)
        else:
            raise HTTPException(status_code=400, detail="Invalid operation")
        
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/projects")
async def get_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    return [{"id": p.id, "name": p.name, "template": p.template, "description": p.description, "created_at": p.created_at} for p in projects]

@app.post("/projects")
async def create_project(request: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        project_path = project_manager.create_project(request.name, request.template)
        
        project = Project(
            user_id=current_user.id,
            name=request.name,
            template=request.template,
            description=request.description,
            path=project_path
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        return {"project": {"id": project.id, "name": project.name, "path": project_path}}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/system/info")
async def get_system_info():
    return {
        "platform": platform.system(),
        "architecture": platform.architecture()[0],
        "machine": platform.machine(),
        "python_version": platform.python_version()
    }

@app.websocket("/ws/terminal")
async def websocket_terminal(websocket: WebSocket, current_user: User = Depends(get_current_user)):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            command_data = json.loads(data)
            
            result = await terminal_manager.execute_command(
                command_data["command"],
                command_data.get("working_directory")
            )
            
            await manager.send_personal_message(json.dumps(result), websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
