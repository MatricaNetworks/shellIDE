import os
import json
from typing import Dict, List, Any
import shutil

class ProjectTemplateManager:
    def __init__(self):
        self.templates = {
            "web": {
                "react": self._create_react_template,
                "vue": self._create_vue_template,
                "angular": self._create_angular_template,
                "vanilla": self._create_vanilla_template,
                "next": self._create_nextjs_template,
                "svelte": self._create_svelte_template
            },
            "backend": {
                "python": self._create_python_template,
                "flask": self._create_flask_template,
                "django": self._create_django_template,
                "fastapi": self._create_fastapi_template,
                "node": self._create_node_template,
                "express": self._create_express_template
            },
            "mobile": {
                "react-native": self._create_react_native_template,
                "flutter": self._create_flutter_template,
                "expo": self._create_expo_template
            },
            "desktop": {
                "electron": self._create_electron_template,
                "tauri": self._create_tauri_template,
                "tkinter": self._create_tkinter_template
            },
            "api": {
                "rest": self._create_rest_api_template,
                "graphql": self._create_graphql_template,
                "websocket": self._create_websocket_template
            }
        }
    
    def get_available_templates(self) -> Dict[str, List[str]]:
        """Get all available project templates"""
        return {
            category: list(templates.keys()) 
            for category, templates in self.templates.items()
        }
    
    def initialize_project(self, project_path: str, project_type: str, framework: str):
        """Initialize a project with the specified template"""
        if project_type in self.templates and framework in self.templates[project_type]:
            template_func = self.templates[project_type][framework]
            template_func(project_path)
        else:
            self._create_basic_template(project_path)
    
    def _create_basic_template(self, project_path: str):
        """Create a basic project template"""
        # Create basic structure
        os.makedirs(os.path.join(project_path, "src"), exist_ok=True)
        os.makedirs(os.path.join(project_path, "docs"), exist_ok=True)
        
        # Create .gitignore
        gitignore_content = """
# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Environment variables
.env
.env.local
.env.production
"""
        self._write_file(project_path, ".gitignore", gitignore_content.strip())
    
    def _create_react_template(self, project_path: str):
        """Create a React project template"""
        self._create_basic_template(project_path)
        
        # package.json
        package_json = {
            "name": os.path.basename(project_path).lower(),
            "version": "1.0.0",
            "private": True,
            "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
                "react-scripts": "5.0.1"
            },
            "scripts": {
                "start": "react-scripts start",
                "build": "react-scripts build",
                "test": "react-scripts test",
                "eject": "react-scripts eject"
            },
            "browserslist": {
                "production": [
                    ">0.2%",
                    "not dead",
                    "not op_mini all"
                ],
                "development": [
                    "last 1 chrome version",
                    "last 1 firefox version",
                    "last 1 safari version"
                ]
            }
        }
        self._write_file(project_path, "package.json", json.dumps(package_json, indent=2))
        
        # public/index.html
        os.makedirs(os.path.join(project_path, "public"), exist_ok=True)
        index_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>React App</title>
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
</body>
</html>"""
        self._write_file(project_path, "public/index.html", index_html)
        
        # src/App.js
        app_js = """import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to React</h1>
        <p>Edit <code>src/App.js</code> and save to reload.</p>
      </header>
    </div>
  );
}

export default App;"""
        self._write_file(project_path, "src/App.js", app_js)
        
        # src/App.css
        app_css = """.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}"""
        self._write_file(project_path, "src/App.css", app_css)
        
        # src/index.js
        index_js = """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);"""
        self._write_file(project_path, "src/index.js", index_js)
    
    def _create_python_template(self, project_path: str):
        """Create a Python project template"""
        self._create_basic_template(project_path)
        
        # main.py
        main_py = """#!/usr/bin/env python3
\"\"\"
Main application entry point
\"\"\"

def main():
    print("Hello, World!")
    print("Welcome to your Python project!")

if __name__ == "__main__":
    main()
"""
        self._write_file(project_path, "main.py", main_py)
        
        # requirements.txt
        requirements = """# Add your project dependencies here
# Example:
# requests>=2.28.0
# flask>=2.2.0
"""
        self._write_file(project_path, "requirements.txt", requirements)
        
        # setup.py
        setup_py = f"""from setuptools import setup, find_packages

setup(
    name="{os.path.basename(project_path)}",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        # Add dependencies here
    ],
    python_requires=">=3.8",
)"""
        self._write_file(project_path, "setup.py", setup_py)
    
    def _create_flask_template(self, project_path: str):
        """Create a Flask project template"""
        self._create_basic_template(project_path)
        
        # app.py
        app_py = """from flask import Flask, render_template, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/hello')
def api_hello():
    return jsonify({"message": "Hello from Flask API!"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
"""
        self._write_file(project_path, "app.py", app_py)
        
        # requirements.txt
        requirements = """Flask>=2.3.0
python-dotenv>=1.0.0
"""
        self._write_file(project_path, "requirements.txt", requirements)
        
        # templates/index.html
        os.makedirs(os.path.join(project_path, "templates"), exist_ok=True)
        index_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flask App</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Flask!</h1>
        <p>Your Flask application is running successfully.</p>
        <button onclick="testAPI()">Test API</button>
        <div id="result"></div>
    </div>
    
    <script>
        function testAPI() {
            fetch('/api/hello')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('result').innerHTML = 
                        '<h3>API Response:</h3><p>' + data.message + '</p>';
                })
                .catch(error => console.error('Error:', error));
        }
    </script>
</body>
</html>"""
        self._write_file(project_path, "templates/index.html", index_html)
    
    def _create_react_native_template(self, project_path: str):
        """Create a React Native template"""
        self._create_basic_template(project_path)
        
        # App.js
        app_js = """import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={styles.body}>
          <Text style={styles.title}>Welcome to React Native!</Text>
          <Text style={styles.description}>
            Edit App.js to change this screen and then come back to see your edits.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  body: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});

export default App;"""
        self._write_file(project_path, "App.js", app_js)
        
        # package.json
        package_json = {
            "name": os.path.basename(project_path).lower(),
            "version": "1.0.0",
            "main": "App.js",
            "scripts": {
                "start": "expo start",
                "android": "expo start --android",
                "ios": "expo start --ios",
                "web": "expo start --web"
            },
            "dependencies": {
                "react": "18.2.0",
                "react-native": "0.72.6",
                "expo": "~49.0.15"
            }
        }
        self._write_file(project_path, "package.json", json.dumps(package_json, indent=2))
        
        # Setup instructions
        setup_md = """# React Native Setup

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Install Expo Go on your mobile device
4. Scan the QR code to run the app

## Building for Production

### Android
```bash
expo build:android
