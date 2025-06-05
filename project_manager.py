import os
import json
import shutil
from pathlib import Path
from typing import Dict, List, Any, Optional
from fastapi import HTTPException
import subprocess
import asyncio

class ProjectManager:
    def __init__(self, workspace_path: str = "./workspace"):
        self.workspace_path = Path(workspace_path)
        self.workspace_path.mkdir(exist_ok=True)
        
        # Project templates
        self.templates = {
            "python": {
                "name": "Python Project",
                "description": "Basic Python project with virtual environment",
                "files": {
                    "main.py": "#!/usr/bin/env python3\n\ndef main():\n    print('Hello, World!')\n\nif __name__ == '__main__':\n    main()\n",
                    "requirements.txt": "# Add your dependencies here\n",
                    "README.md": "# {project_name}\n\nA Python project created with ShellIDE.\n\n## Setup\n\n```bash\npip install -r requirements.txt\npython main.py\n```\n",
                    ".gitignore": "__pycache__/\n*.pyc\n*.pyo\n*.pyd\n.Python\nvenv/\n.env\n.venv\n"
                },
                "commands": [
                    "python -m venv venv",
                    "pip install -r requirements.txt"
                ]
            },
            "react": {
                "name": "React App",
                "description": "React application with TypeScript",
                "files": {
                    "package.json": """{
  "name": "{project_name}",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^4.9.5",
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": ["react-app", "react-app/jest"]
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}""",
                    "public/index.html": """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{project_name}</title>
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
</body>
</html>""",
                    "src/App.tsx": """import React from 'react';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to {project_name}</h1>
        <p>Built with ShellIDE</p>
      </header>
    </div>
  );
}

export default App;""",
                    "src/index.tsx": """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);""",
                    "README.md": "# {project_name}\n\nA React application created with ShellIDE.\n\n## Available Scripts\n\n- `npm start` - Runs the app in development mode\n- `npm run build` - Builds the app for production\n- `npm test` - Launches the test runner\n",
                    ".gitignore": "node_modules/\nbuild/\n.env.local\n.env.development.local\n.env.test.local\n.env.production.local\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n"
                },
                "commands": [
                    "npm install",
                    "npm install react-scripts"
                ]
            },
            "node": {
                "name": "Node.js Project",
                "description": "Node.js project with Express.js",
                "files": {
                    "package.json": """{
  "name": "{project_name}",
  "version": "1.0.0",
  "description": "A Node.js project created with ShellIDE",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}""",
                    "index.js": """const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to {project_name}!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});""",
                    "README.md": "# {project_name}\n\nA Node.js project created with ShellIDE.\n\n## Setup\n\n```bash\nnpm install\nnpm start\n```\n\n## Development\n\n```bash\nnpm run dev\n```\n",
                    ".gitignore": "node_modules/\n.env\n*.log\n"
                },
                "commands": [
                    "npm install"
                ]
            },
            "flask": {
                "name": "Flask Web App",
                "description": "Flask web application with templates",
                "files": {
                    "app.py": """from flask import Flask, render_template, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html', title='{project_name}')

@app.route('/api/health')
def health():
    return jsonify({'status': 'healthy', 'app': '{project_name}'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)""",
                    "requirements.txt": "Flask==2.3.2\nWerkzeug==2.3.6\n",
                    "templates/index.html": """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-body text-center">
                        <h1 class="card-title">Welcome to {{ title }}</h1>
                        <p class="card-text">Built with Flask and ShellIDE</p>
                        <a href="/api/health" class="btn btn-primary">Check API Health</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>""",
                    "static/style.css": "/* Add your custom styles here */\n",
                    "README.md": "# {project_name}\n\nA Flask web application created with ShellIDE.\n\n## Setup\n\n```bash\npip install -r requirements.txt\npython app.py\n```\n\nVisit http://localhost:5000\n",
                    ".gitignore": "__pycache__/\n*.pyc\nvenv/\n.env\ninstance/\n"
                },
                "commands": [
                    "pip install -r requirements.txt"
                ]
            },
            "django": {
                "name": "Django Project",
                "description": "Django web project with basic structure",
                "files": {
                    "manage.py": """#!/usr/bin/env python
import os
import sys

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', '{project_name}.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)""",
                    "requirements.txt": "Django==4.2.1\n",
                    "README.md": "# {project_name}\n\nA Django project created with ShellIDE.\n\n## Setup\n\n```bash\npip install -r requirements.txt\npython manage.py migrate\npython manage.py runserver\n```\n",
                    ".gitignore": "__pycache__/\n*.pyc\ndb.sqlite3\nvenv/\n.env\nmedia/\nstatic/\n"
                },
                "commands": [
                    "pip install -r requirements.txt",
                    "django-admin startproject {project_name} .",
                    "python manage.py migrate"
                ]
            },
            "react-native": {
                "name": "React Native App",
                "description": "React Native mobile app with Expo",
                "files": {
                    "package.json": """{
  "name": "{project_name}",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~48.0.15",
    "react": "18.2.0",
    "react-native": "0.71.8"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0"
  }
}""",
                    "App.js": """import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to {project_name}</Text>
      <Text style={styles.subtitle}>Built with React Native and ShellIDE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});""",
                    "app.json": """{
  "expo": {
    "name": "{project_name}",
    "slug": "{project_name}",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "platforms": ["ios", "android", "web"]
  }
}""",
                    "README.md": "# {project_name}\n\nA React Native app created with ShellIDE.\n\n## Setup\n\n```bash\nnpm install\nnpx expo start\n```\n\n## Running\n\n- Use Expo Go app to scan QR code\n- Or run on simulator: `npx expo start --ios` or `npx expo start --android`\n",
                    ".gitignore": "node_modules/\n.expo/\ndist/\nnpm-debug.*\n*.jks\n*.p8\n*.p12\n*.key\n*.mobileprovision\n*.orig.*\nweb-build/\n"
                },
                "commands": [
                    "npm install",
                    "npx expo install"
                ]
            },
            "flutter": {
                "name": "Flutter App",
                "description": "Flutter mobile application",
                "files": {
                    "pubspec.yaml": """name: {project_name}
description: A Flutter application created with ShellIDE.
version: 1.0.0+1

environment:
  sdk: '>=2.19.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0

flutter:
  uses-material-design: true""",
                    "lib/main.dart": """import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '{project_name}',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: MyHomePage(title: '{project_name}'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  MyHomePage({Key? key, required this.title}) : super(key: key);
  final String title;

  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              'Welcome to {project_name}',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            Text(
              'Built with Flutter and ShellIDE',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
            SizedBox(height: 20),
            Text(
              'You have pushed the button this many times:',
            ),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: Icon(Icons.add),
      ),
    );
  }
}""",
                    "README.md": "# {project_name}\n\nA Flutter application created with ShellIDE.\n\n## Getting Started\n\n```bash\nflutter pub get\nflutter run\n```\n\n## Building\n\n```bash\n# Android\nflutter build apk\n\n# iOS\nflutter build ios\n```\n",
                    ".gitignore": "*.iml\n.gradle\n/local.properties\n/.idea/workspace.xml\n/.idea/libraries\n.DS_Store\n/build\n/captures\n.flutter-plugins\n.flutter-plugins-dependencies\n"
                },
                "commands": [
                    "flutter pub get"
                ]
            },
            "html": {
                "name": "HTML/CSS/JS Website",
                "description": "Static website with HTML, CSS, and JavaScript",
                "files": {
                    "index.html": """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project_name}</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand" href="#">{project_name}</a>
        </div>
    </nav>

    <div class="container mt-5">
        <div class="row">
            <div class="col-lg-8 mx-auto">
                <div class="text-center">
                    <h1 class="display-4">Welcome to {project_name}</h1>
                    <p class="lead">Built with HTML, CSS, JavaScript, and ShellIDE</p>
                    <button id="clickBtn" class="btn btn-primary btn-lg">Click Me!</button>
                    <div id="output" class="mt-3"></div>
                </div>
            </div>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>""",
                    "style.css": """/* Custom styles for {project_name} */
body {
    font-family: 'Arial', sans-serif;
}

.navbar-brand {
    font-weight: bold;
}

#output {
    font-size: 1.2em;
    color: #28a745;
    font-weight: bold;
}

.container {
    max-width: 1200px;
}

/* Responsive design */
@media (max-width: 768px) {
    .display-4 {
        font-size: 2rem;
    }
}""",
                    "script.js": """// JavaScript for {project_name}
document.addEventListener('DOMContentLoaded', function() {
    const clickBtn = document.getElementById('clickBtn');
    const output = document.getElementById('output');
    let clickCount = 0;

    clickBtn.addEventListener('click', function() {
        clickCount++;
        output.innerHTML = `<p>Button clicked ${clickCount} time${clickCount !== 1 ? 's' : ''}!</p>`;
        
        // Add some animation
        output.style.opacity = '0';
        setTimeout(() => {
            output.style.opacity = '1';
        }, 100);
    });

    // Welcome message
    console.log('Welcome to {project_name}!');
    console.log('Built with ShellIDE');
});""",
                    "README.md": "# {project_name}\n\nA static website created with ShellIDE.\n\n## Files\n\n- `index.html` - Main HTML file\n- `style.css` - Custom CSS styles\n- `script.js` - JavaScript functionality\n\n## Deployment\n\nThis is a static website that can be deployed to:\n- GitHub Pages\n- Netlify\n- Vercel\n- Any web server\n\n## Local Development\n\nOpen `index.html` in your browser or use a local server:\n\n```bash\npython -m http.server 8000\n```\n",
                    ".gitignore": ".DS_Store\nThumbs.db\n"
                },
                "commands": []
            }
        }
    
    def get_templates(self) -> Dict[str, Any]:
        """Get all available project templates"""
        return {
            template_id: {
                "id": template_id,
                "name": template["name"],
                "description": template["description"]
            }
            for template_id, template in self.templates.items()
        }
    
    def create_project(self, name: str, template: str) -> str:
        """Create a new project from template"""
        try:
            if template not in self.templates:
                raise HTTPException(status_code=400, detail="Template not found")
            
            # Sanitize project name
            safe_name = "".join(c for c in name if c.isalnum() or c in ("-", "_"))
            if not safe_name:
                raise HTTPException(status_code=400, detail="Invalid project name")
            
            # Create project directory
            project_path = self.workspace_path / safe_name
            if project_path.exists():
                raise HTTPException(status_code=400, detail="Project already exists")
            
            project_path.mkdir(parents=True)
            
            # Get template data
            template_data = self.templates[template]
            
            # Create files from template
            for file_path, content in template_data["files"].items():
                full_file_path = project_path / file_path
                full_file_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Replace placeholders
                processed_content = content.replace("{project_name}", name)
                
                with open(full_file_path, 'w', encoding='utf-8') as f:
                    f.write(processed_content)
            
            return str(project_path.relative_to(self.workspace_path))
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Project creation failed: {str(e)}")
    
    async def setup_project(self, project_path: str, template: str) -> Dict[str, Any]:
        """Setup project by running initialization commands"""
        try:
            if template not in self.templates:
                raise HTTPException(status_code=400, detail="Template not found")
            
            full_path = self.workspace_path / project_path
            if not full_path.exists():
                raise HTTPException(status_code=404, detail="Project not found")
            
            template_data = self.templates[template]
            commands = template_data.get("commands", [])
            
            results = []
            
            for command in commands:
                try:
                    # Execute command in project directory
                    process = await asyncio.create_subprocess_shell(
                        command,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        cwd=str(full_path)
                    )
                    
                    stdout, stderr = await process.communicate()
                    
                    results.append({
                        "command": command,
                        "stdout": stdout.decode('utf-8'),
                        "stderr": stderr.decode('utf-8'),
                        "exit_code": process.returncode,
                        "success": process.returncode == 0
                    })
                    
                except Exception as e:
                    results.append({
                        "command": command,
                        "error": str(e),
                        "success": False
                    })
            
            return {
                "project_path": project_path,
                "template": template,
                "setup_results": results,
                "success": all(r.get("success", False) for r in results)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Project setup failed: {str(e)}")
    
    def get_project_info(self, project_path: str) -> Dict[str, Any]:
        """Get project information"""
        try:
            full_path = self.workspace_path / project_path
            if not full_path.exists():
                raise HTTPException(status_code=404, detail="Project not found")
            
            # Detect project type
            project_type = self._detect_project_type(full_path)
            
            # Get project files
            files = []
            for root, dirs, file_list in os.walk(full_path):
                # Skip hidden and build directories
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', '__pycache__', 'build', 'dist']]
                
                for file in file_list:
                    if not file.startswith('.'):
                        file_path = Path(root) / file
                        relative_path = file_path.relative_to(full_path)
                        files.append(str(relative_path))
            
            return {
                "name": full_path.name,
                "path": project_path,
                "type": project_type,
                "files": sorted(files),
                "size": sum(f.stat().st_size for f in full_path.rglob('*') if f.is_file()),
                "created": os.path.getctime(full_path)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get project info: {str(e)}")
    
    def _detect_project_type(self, project_path: Path) -> str:
        """Detect project type based on files"""
        if (project_path / "package.json").exists():
            package_json_path = project_path / "package.json"
            try:
                with open(package_json_path, 'r') as f:
                    package_data = json.loads(f.read())
                    
                dependencies = package_data.get("dependencies", {})
                dev_dependencies = package_data.get("devDependencies", {})
                all_deps = {**dependencies, **dev_dependencies}
                
                if "react" in all_deps:
                    return "react"
                elif "react-native" in all_deps or "expo" in all_deps:
                    return "react-native"
                elif "express" in all_deps:
                    return "node"
                else:
                    return "javascript"
            except:
                return "javascript"
        
        elif (project_path / "requirements.txt").exists() or (project_path / "setup.py").exists():
            if (project_path / "manage.py").exists():
                return "django"
            elif (project_path / "app.py").exists() or (project_path / "application.py").exists():
                return "flask"
            else:
                return "python"
        
        elif (project_path / "pubspec.yaml").exists():
            return "flutter"
        
        elif (project_path / "Cargo.toml").exists():
            return "rust"
        
        elif (project_path / "go.mod").exists():
            return "go"
        
        elif (project_path / "index.html").exists():
            return "html"
        
        else:
            return "unknown"
    
    async def deploy_project(self, project_path: str, platform: str) -> Dict[str, Any]:
        """Deploy project to specified platform"""
        try:
            full_path = self.workspace_path / project_path
            if not full_path.exists():
                raise HTTPException(status_code=404, detail="Project not found")
            
            project_type = self._detect_project_type(full_path)
            
            deployment_commands = {
                "netlify": {
                    "react": ["npm run build", "netlify deploy --prod --dir=build"],
                    "html": ["netlify deploy --prod --dir=."],
                },
                "vercel": {
                    "react": ["npm run build", "vercel --prod"],
                    "node": ["vercel --prod"],
                    "html": ["vercel --prod"],
                },
                "heroku": {
                    "node": ["git add .", "git commit -m 'Deploy'", "git push heroku main"],
                    "python": ["git add .", "git commit -m 'Deploy'", "git push heroku main"],
                    "flask": ["git add .", "git commit -m 'Deploy'", "git push heroku main"],
                    "django": ["git add .", "git commit -m 'Deploy'", "git push heroku main"],
                },
                "github-pages": {
                    "react": ["npm run build", "gh-pages -d build"],
                    "html": ["gh-pages -d ."],
                }
            }
            
            if platform not in deployment_commands:
                raise HTTPException(status_code=400, detail="Deployment platform not supported")
            
            if project_type not in deployment_commands[platform]:
                raise HTTPException(status_code=400, detail=f"Project type '{project_type}' not supported for {platform}")
            
            commands = deployment_commands[platform][project_type]
            
            return {
                "project_path": project_path,
                "platform": platform,
                "project_type": project_type,
                "commands": commands,
                "instructions": f"Run these commands in your project directory to deploy to {platform}",
                "note": "Make sure you have the necessary CLI tools installed and configured"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Deployment preparation failed: {str(e)}")
