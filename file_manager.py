import os
import json
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
import mimetypes

class FileManager:
    def __init__(self, base_path: str = "./workspace"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(exist_ok=True)
        
        # Allowed file extensions for security
        self.allowed_extensions = {
            '.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.sass',
            '.json', '.xml', '.yaml', '.yml', '.md', '.txt', '.sh', '.bat', '.ps1',
            '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs',
            '.swift', '.kt', '.scala', '.clj', '.hs', '.elm', '.dart', '.vue', '.svelte',
            '.sql', '.r', '.m', '.pl', '.lua', '.nim', '.zig', '.dockerfile', '.gitignore',
            '.env', '.toml', '.ini', '.cfg', '.conf', '.log'
        }
        
        # Binary file extensions to exclude
        self.binary_extensions = {
            '.exe', '.dll', '.so', '.dylib', '.a', '.lib', '.obj', '.o',
            '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
            '.mp3', '.wav', '.ogg', '.mp4', '.avi', '.mkv', '.mov',
            '.zip', '.tar', '.gz', '.rar', '.7z', '.pdf', '.doc', '.docx'
        }
    
    def _is_safe_path(self, path: str) -> bool:
        """Check if path is safe (within workspace)"""
        try:
            full_path = (self.base_path / path).resolve()
            return str(full_path).startswith(str(self.base_path.resolve()))
        except Exception:
            return False
    
    def _get_file_info(self, file_path: Path) -> Dict[str, Any]:
        """Get file information"""
        try:
            stat = file_path.stat()
            mime_type, _ = mimetypes.guess_type(str(file_path))
            
            return {
                "name": file_path.name,
                "path": str(file_path.relative_to(self.base_path)),
                "type": "file" if file_path.is_file() else "directory",
                "size": stat.st_size if file_path.is_file() else 0,
                "modified": stat.st_mtime,
                "mime_type": mime_type,
                "extension": file_path.suffix,
                "is_binary": file_path.suffix.lower() in self.binary_extensions,
                "is_allowed": file_path.suffix.lower() in self.allowed_extensions or file_path.is_dir()
            }
        except Exception as e:
            return {
                "name": file_path.name,
                "path": str(file_path.relative_to(self.base_path)),
                "type": "unknown",
                "error": str(e)
            }
    
    def list_files(self, path: str = ".") -> List[Dict[str, Any]]:
        """List files in directory"""
        if not self._is_safe_path(path):
            raise HTTPException(status_code=400, detail="Invalid path")
        
        try:
            target_path = self.base_path / path
            if not target_path.exists():
                raise HTTPException(status_code=404, detail="Directory not found")
            
            if not target_path.is_dir():
                raise HTTPException(status_code=400, detail="Path is not a directory")
            
            files = []
            for item in target_path.iterdir():
                try:
                    if item.name.startswith('.') and item.name not in ['.env', '.gitignore']:
                        continue  # Skip hidden files except important ones
                    
                    file_info = self._get_file_info(item)
                    files.append(file_info)
                except Exception as e:
                    # Skip files that can't be accessed
                    continue
            
            # Sort directories first, then files alphabetically
            files.sort(key=lambda x: (x["type"] != "directory", x["name"].lower()))
            return files
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")
    
    def read_file(self, path: str) -> Dict[str, Any]:
        """Read file content"""
        if not self._is_safe_path(path):
            raise HTTPException(status_code=400, detail="Invalid path")
        
        try:
            file_path = self.base_path / path
            if not file_path.exists():
                raise HTTPException(status_code=404, detail="File not found")
            
            if not file_path.is_file():
                raise HTTPException(status_code=400, detail="Path is not a file")
            
            # Check if file extension is allowed
            if file_path.suffix.lower() not in self.allowed_extensions:
                raise HTTPException(status_code=400, detail="File type not supported")
            
            # Check if file is binary
            if file_path.suffix.lower() in self.binary_extensions:
                raise HTTPException(status_code=400, detail="Cannot read binary file")
            
            # Try to read as text
            encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
            content = None
            encoding_used = None
            
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read()
                        encoding_used = encoding
                        break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                raise HTTPException(status_code=400, detail="Cannot decode file content")
            
            file_info = self._get_file_info(file_path)
            return {
                **file_info,
                "content": content,
                "encoding": encoding_used,
                "lines": len(content.splitlines())
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")
    
    def create_file(self, path: str, content: str = "") -> Dict[str, Any]:
        """Create a new file"""
        if not self._is_safe_path(path):
            raise HTTPException(status_code=400, detail="Invalid path")
        
        try:
            file_path = self.base_path / path
            
            # Create parent directories if they don't exist
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            if file_path.exists():
                raise HTTPException(status_code=400, detail="File already exists")
            
            # Check if file extension is allowed
            if file_path.suffix.lower() and file_path.suffix.lower() not in self.allowed_extensions:
                raise HTTPException(status_code=400, detail="File type not supported")
            
            # Write file content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return {
                "message": "File created successfully",
                "path": path,
                **self._get_file_info(file_path)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating file: {str(e)}")
    
    def update_file(self, path: str, content: str) -> Dict[str, Any]:
        """Update file content"""
        if not self._is_safe_path(path):
            raise HTTPException(status_code=400, detail="Invalid path")
        
        try:
            file_path = self.base_path / path
            
            if not file_path.exists():
                raise HTTPException(status_code=404, detail="File not found")
            
            if not file_path.is_file():
                raise HTTPException(status_code=400, detail="Path is not a file")
            
            # Backup original file
            backup_content = None
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    backup_content = f.read()
            except:
                pass
            
            # Write new content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return {
                "message": "File updated successfully",
                "path": path,
                "backup_available": backup_content is not None,
                **self._get_file_info(file_path)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error updating file: {str(e)}")
    
    def delete_file(self, path: str) -> Dict[str, Any]:
        """Delete file or directory"""
        if not self._is_safe_path(path):
            raise HTTPException(status_code=400, detail="Invalid path")
        
        try:
            file_path = self.base_path / path
            
            if not file_path.exists():
                raise HTTPException(status_code=404, detail="File not found")
            
            if file_path.is_file():
                file_path.unlink()
                return {"message": "File deleted successfully", "path": path}
            elif file_path.is_dir():
                shutil.rmtree(file_path)
                return {"message": "Directory deleted successfully", "path": path}
            else:
                raise HTTPException(status_code=400, detail="Unknown file type")
                
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")
    
    def create_directory(self, path: str) -> Dict[str, Any]:
        """Create a new directory"""
        if not self._is_safe_path(path):
            raise HTTPException(status_code=400, detail="Invalid path")
        
        try:
            dir_path = self.base_path / path
            
            if dir_path.exists():
                raise HTTPException(status_code=400, detail="Directory already exists")
            
            dir_path.mkdir(parents=True, exist_ok=False)
            
            return {
                "message": "Directory created successfully",
                "path": path,
                **self._get_file_info(dir_path)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating directory: {str(e)}")
    
    def copy_file(self, source_path: str, dest_path: str) -> Dict[str, Any]:
        """Copy file or directory"""
        if not self._is_safe_path(source_path) or not self._is_safe_path(dest_path):
            raise HTTPException(status_code=400, detail="Invalid path")
        
        try:
            source = self.base_path / source_path
            dest = self.base_path / dest_path
            
            if not source.exists():
                raise HTTPException(status_code=404, detail="Source not found")
            
            if dest.exists():
                raise HTTPException(status_code=400, detail="Destination already exists")
            
            if source.is_file():
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, dest)
            else:
                shutil.copytree(source, dest)
            
            return {
                "message": "File copied successfully",
                "source": source_path,
                "destination": dest_path,
                **self._get_file_info(dest)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error copying file: {str(e)}")
    
    def move_file(self, source_path: str, dest_path: str) -> Dict[str, Any]:
        """Move file or directory"""
        if not self._is_safe_path(source_path) or not self._is_safe_path(dest_path):
            raise HTTPException(status_code=400, detail="Invalid path")
        
        try:
            source = self.base_path / source_path
            dest = self.base_path / dest_path
            
            if not source.exists():
                raise HTTPException(status_code=404, detail="Source not found")
            
            if dest.exists():
                raise HTTPException(status_code=400, detail="Destination already exists")
            
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(source), str(dest))
            
            return {
                "message": "File moved successfully",
                "source": source_path,
                "destination": dest_path,
                **self._get_file_info(dest)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error moving file: {str(e)}")

    def search_files(self, query: str, path: str = ".", extensions: List[str] = None) -> List[Dict[str, Any]]:
        """Search for files by name or content"""
        if not self._is_safe_path(path):
            raise HTTPException(status_code=400, detail="Invalid path")
        
        try:
            search_path = self.base_path / path
            if not search_path.exists() or not search_path.is_dir():
                raise HTTPException(status_code=400, detail="Invalid search path")
            
            results = []
            
            for root, dirs, files in os.walk(search_path):
                # Skip hidden directories
                dirs[:] = [d for d in dirs if not d.startswith('.')]
                
                for file in files:
                    if file.startswith('.'):
                        continue
                    
                    file_path = Path(root) / file
                    
                    # Filter by extensions if specified
                    if extensions and file_path.suffix.lower() not in extensions:
                        continue
                    
                    # Check filename
                    if query.lower() in file.lower():
                        results.append({
                            **self._get_file_info(file_path),
                            "match_type": "filename"
                        })
                        continue
                    
                    # Search in content for text files
                    if file_path.suffix.lower() in self.allowed_extensions:
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                                if query.lower() in content.lower():
                                    results.append({
                                        **self._get_file_info(file_path),
                                        "match_type": "content"
                                    })
                        except:
                            continue
            
            return results
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error searching files: {str(e)}")
