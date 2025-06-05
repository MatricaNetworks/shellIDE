import os
import subprocess
import asyncio
import platform
import shlex
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
import json

class TerminalManager:
    def __init__(self, workspace_path: str = "./workspace"):
        self.workspace_path = Path(workspace_path)
        self.workspace_path.mkdir(exist_ok=True)
        self.default_cwd = str(self.workspace_path.resolve())
        
        # OS-specific settings
        self.system = platform.system()
        self.shell = self._get_default_shell()
        
        # Allowed commands for security
        self.allowed_commands = {
            'ls', 'dir', 'pwd', 'cd', 'mkdir', 'rmdir', 'rm', 'cp', 'mv', 'cat', 'head', 'tail',
            'grep', 'find', 'which', 'whereis', 'echo', 'touch', 'chmod', 'chown',
            'python', 'python3', 'node', 'npm', 'npx', 'pip', 'pip3', 'git', 'curl', 'wget',
            'java', 'javac', 'gcc', 'g++', 'make', 'cmake', 'go', 'cargo', 'rustc',
            'docker', 'kubectl', 'helm', 'terraform', 'ansible', 'ssh', 'scp', 'rsync',
            'tar', 'zip', 'unzip', 'gzip', 'gunzip', 'ps', 'top', 'htop', 'kill', 'killall',
            'systemctl', 'service', 'netstat', 'ss', 'ping', 'traceroute', 'nslookup', 'dig',
            'code', 'vim', 'nano', 'emacs', 'less', 'more', 'tree', 'clear', 'history'
        }
        
        # Dangerous commands to block
        self.blocked_commands = {
            'sudo', 'su', 'passwd', 'useradd', 'userdel', 'usermod', 'groupadd', 'groupdel',
            'mount', 'umount', 'fdisk', 'mkfs', 'fsck', 'dd', 'reboot', 'shutdown', 'halt',
            'iptables', 'ufw', 'firewall-cmd', 'crontab', 'at', 'batch', 'systemctl'
        }
    
    def _get_default_shell(self) -> str:
        """Get default shell based on OS"""
        if self.system == "Windows":
            return "cmd"
        else:
            return os.environ.get("SHELL", "/bin/bash")
    
    def _is_safe_command(self, command: str) -> bool:
        """Check if command is safe to execute"""
        if not command.strip():
            return False
        
        # Parse the command
        try:
            if self.system == "Windows":
                cmd_parts = command.split()
            else:
                cmd_parts = shlex.split(command)
        except ValueError:
            return False
        
        if not cmd_parts:
            return False
        
        base_command = cmd_parts[0].lower()
        
        # Remove path if present
        if '/' in base_command or '\\' in base_command:
            base_command = os.path.basename(base_command)
        
        # Remove extension
        if '.' in base_command:
            base_command = base_command.split('.')[0]
        
        # Check blocked commands
        if base_command in self.blocked_commands:
            return False
        
        # Check for dangerous patterns
        dangerous_patterns = ['rm -rf /', 'rm -rf *', '>(', '<(', '|&', '&>', '&&', '||']
        command_lower = command.lower()
        for pattern in dangerous_patterns:
            if pattern in command_lower:
                return False
        
        return True
    
    def _sanitize_path(self, path: str) -> str:
        """Sanitize and validate path"""
        if not path:
            return self.default_cwd
        
        try:
            # Resolve path relative to workspace
            if not os.path.isabs(path):
                full_path = os.path.join(self.default_cwd, path)
            else:
                full_path = path
            
            full_path = os.path.normpath(full_path)
            
            # Ensure path is within workspace
            if not full_path.startswith(self.default_cwd):
                return self.default_cwd
            
            return full_path
        except Exception:
            return self.default_cwd
    
    async def execute_command(self, command: str, working_directory: str = None) -> Dict[str, Any]:
        """Execute a terminal command"""
        try:
            # Validate command
            if not self._is_safe_command(command):
                raise HTTPException(status_code=400, detail="Command not allowed for security reasons")
            
            # Set working directory
            cwd = self._sanitize_path(working_directory)
            
            # Handle built-in commands
            if command.strip().lower() == 'pwd':
                return {
                    "command": command,
                    "stdout": cwd,
                    "stderr": "",
                    "exit_code": 0,
                    "execution_time": 0
                }
            
            # Prepare command for execution
            if self.system == "Windows":
                cmd_args = ["cmd", "/c", command]
            else:
                cmd_args = [self.shell, "-c", command]
            
            # Execute command
            start_time = asyncio.get_event_loop().time()
            
            process = await asyncio.create_subprocess_exec(
                *cmd_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd,
                env=dict(os.environ, PWD=cwd)
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=300  # 5 minutes timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                raise HTTPException(status_code=408, detail="Command execution timeout")
            
            end_time = asyncio.get_event_loop().time()
            execution_time = int((end_time - start_time) * 1000)  # milliseconds
            
            return {
                "command": command,
                "stdout": stdout.decode('utf-8', errors='replace'),
                "stderr": stderr.decode('utf-8', errors='replace'),
                "exit_code": process.returncode,
                "execution_time": execution_time,
                "working_directory": cwd
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Command execution failed: {str(e)}")
    
    async def execute_code(self, code: str, language: str, filename: str = None) -> Dict[str, Any]:
        """Execute code in specified language"""
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(
                mode='w',
                suffix=self._get_file_extension(language),
                dir=self.default_cwd,
                delete=False
            ) as temp_file:
                temp_file.write(code)
                temp_file_path = temp_file.name
            
            try:
                # Get execution command
                command = self._get_execution_command(language, temp_file_path)
                
                if not command:
                    raise HTTPException(status_code=400, detail=f"Language '{language}' not supported")
                
                # Execute the code
                result = await self.execute_command(command, self.default_cwd)
                
                # Add language info to result
                result["language"] = language
                result["code"] = code
                result["temp_file"] = os.path.basename(temp_file_path)
                
                return result
                
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
                    
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Code execution failed: {str(e)}")
    
    def _get_file_extension(self, language: str) -> str:
        """Get file extension for language"""
        extensions = {
            'python': '.py',
            'javascript': '.js',
            'typescript': '.ts',
            'java': '.java',
            'c': '.c',
            'cpp': '.cpp',
            'csharp': '.cs',
            'go': '.go',
            'rust': '.rs',
            'php': '.php',
            'ruby': '.rb',
            'swift': '.swift',
            'kotlin': '.kt',
            'scala': '.scala',
            'shell': '.sh',
            'bash': '.sh',
            'powershell': '.ps1'
        }
        return extensions.get(language.lower(), '.txt')
    
    def _get_execution_command(self, language: str, file_path: str) -> Optional[str]:
        """Get command to execute code file"""
        lang = language.lower()
        
        commands = {
            'python': f'python3 "{file_path}"',
            'javascript': f'node "{file_path}"',
            'typescript': f'npx ts-node "{file_path}"',
            'java': f'javac "{file_path}" && java {os.path.splitext(os.path.basename(file_path))[0]}',
            'c': f'gcc -o /tmp/c_output "{file_path}" && /tmp/c_output',
            'cpp': f'g++ -o /tmp/cpp_output "{file_path}" && /tmp/cpp_output',
            'go': f'go run "{file_path}"',
            'rust': f'rustc "{file_path}" -o /tmp/rust_output && /tmp/rust_output',
            'php': f'php "{file_path}"',
            'ruby': f'ruby "{file_path}"',
            'shell': f'bash "{file_path}"',
            'bash': f'bash "{file_path}"',
            'powershell': f'powershell -File "{file_path}"' if self.system == "Windows" else None
        }
        
        # Adjust for Windows
        if self.system == "Windows":
            commands.update({
                'python': f'python "{file_path}"',
                'c': f'gcc -o temp_c_output.exe "{file_path}" && temp_c_output.exe',
                'cpp': f'g++ -o temp_cpp_output.exe "{file_path}" && temp_cpp_output.exe',
            })
        
        return commands.get(lang)
    
    async def get_system_info(self) -> Dict[str, Any]:
        """Get system information"""
        try:
            # Get basic system info
            info = {
                "system": platform.system(),
                "machine": platform.machine(),
                "architecture": platform.architecture()[0],
                "processor": platform.processor(),
                "python_version": platform.python_version(),
                "shell": self.shell,
                "workspace": self.default_cwd
            }
            
            # Get additional info via commands
            commands = {
                "os_version": "uname -a" if self.system != "Windows" else "ver",
                "disk_space": "df -h ." if self.system != "Windows" else "dir",
                "memory": "free -h" if self.system == "Linux" else None,
                "cpu_info": "lscpu" if self.system == "Linux" else None
            }
            
            for key, cmd in commands.items():
                if cmd:
                    try:
                        result = await self.execute_command(cmd)
                        if result["exit_code"] == 0:
                            info[key] = result["stdout"].strip()
                    except:
                        info[key] = "Not available"
            
            return info
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get system info: {str(e)}")
    
    async def install_package(self, package_manager: str, package_name: str) -> Dict[str, Any]:
        """Install package using specified package manager"""
        try:
            # Validate package manager
            allowed_managers = {
                'pip': 'pip install',
                'pip3': 'pip3 install',
                'npm': 'npm install',
                'yarn': 'yarn add',
                'apt': 'apt install -y' if self.system == "Linux" else None,
                'brew': 'brew install' if self.system == "Darwin" else None,
                'cargo': 'cargo install',
                'go': 'go install'
            }
            
            if package_manager not in allowed_managers:
                raise HTTPException(status_code=400, detail="Package manager not supported")
            
            install_cmd = allowed_managers[package_manager]
            if not install_cmd:
                raise HTTPException(status_code=400, detail="Package manager not available on this system")
            
            # Sanitize package name
            if not package_name.replace('-', '').replace('_', '').replace('.', '').isalnum():
                raise HTTPException(status_code=400, detail="Invalid package name")
            
            command = f"{install_cmd} {package_name}"
            
            result = await self.execute_command(command)
            result["package_manager"] = package_manager
            result["package_name"] = package_name
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Package installation failed: {str(e)}")
    
    async def run_server(self, command: str, port: int = None) -> Dict[str, Any]:
        """Run a development server"""
        try:
            # Common server commands
            server_commands = {
                'python': f'python -m http.server {port or 8000}',
                'node': 'npm start' if port is None else f'npm start -- --port {port}',
                'react': f'npm start' + (f' -- --port {port}' if port else ''),
                'vue': 'npm run serve' + (f' -- --port {port}' if port else ''),
                'angular': 'ng serve' + (f' --port {port}' if port else ''),
                'django': 'python manage.py runserver' + (f' 0.0.0.0:{port or 8000}' if port else ''),
                'flask': f'python -m flask run --host=0.0.0.0 --port={port or 5000}',
                'express': 'npm start'
            }
            
            if command in server_commands:
                full_command = server_commands[command]
            else:
                full_command = command
            
            # Note: This would typically start a long-running process
            # For now, we'll just validate and return the command
            return {
                "message": f"Server command prepared: {full_command}",
                "command": full_command,
                "port": port,
                "note": "Use WebSocket connection for long-running processes"
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Server startup failed: {str(e)}")
