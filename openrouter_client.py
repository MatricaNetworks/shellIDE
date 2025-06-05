import os
import json
import httpx
from typing import Dict, List, Any, Optional
from fastapi import HTTPException

class OpenRouterClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.base_url = "https://openrouter.ai/api/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://shellide.ai",
            "X-Title": "ShellIDE"
        }
        
        if not self.api_key:
            raise ValueError("OpenRouter API key is required")
    
    async def get_models(self) -> List[Dict[str, Any]]:
        """Get all available models from OpenRouter"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 401:
                    raise HTTPException(status_code=401, detail="Unauthorized: Invalid API key")
                elif response.status_code != 200:
                    raise HTTPException(status_code=response.status_code, detail=f"API Error: {response.text}")
                
                data = response.json()
                
                # Filter models for coding tasks
                coding_models = []
                for model in data.get("data", []):
                    model_id = model.get("id", "")
                    model_name = model.get("name", "")
                    
                    # Check if model is good for coding
                    is_coding_model = any(keyword in model_id.lower() or keyword in model_name.lower() 
                                        for keyword in ["code", "claude", "gpt-4", "gpt-3.5", "codellama", 
                                                      "deepseek", "qwen", "mixtral", "gemini"])
                    
                    # Check if model is free or has reasonable pricing
                    pricing = model.get("pricing", {})
                    prompt_cost = float(pricing.get("prompt", "0"))
                    completion_cost = float(pricing.get("completion", "0"))
                    
                    is_free_or_cheap = prompt_cost == 0 and completion_cost == 0
                    
                    if is_coding_model or is_free_or_cheap:
                        coding_models.append({
                            "id": model_id,
                            "name": model_name,
                            "description": model.get("description", ""),
                            "context_length": model.get("context_length", 0),
                            "pricing": pricing,
                            "is_free": is_free_or_cheap
                        })
                
                return sorted(coding_models, key=lambda x: (not x["is_free"], x["name"]))
                
        except httpx.TimeoutException:
            raise HTTPException(status_code=408, detail="Request timeout")
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Request error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
    async def chat_completion(self, message: str, model: str = None, context: Dict[str, Any] = None) -> str:
        """Send a chat completion request to OpenRouter"""
        try:
            # Default to a free coding model if none specified
            if not model:
                models = await self.get_models()
                free_models = [m for m in models if m["is_free"]]
                if free_models:
                    model = free_models[0]["id"]
                else:
                    model = "openai/gpt-3.5-turbo"
            
            # Prepare messages
            messages = []
            
            # Add system message for coding context
            system_message = """You are ShellIDE AI, an expert coding assistant integrated into a powerful development environment. 
You help developers write, debug, and improve code across multiple programming languages and frameworks. 
You can suggest code improvements, explain complex concepts, help with debugging, and assist with project architecture.
Always provide clear, concise, and practical solutions."""
            
            if context:
                system_message += f"\n\nContext: {json.dumps(context, indent=2)}"
            
            messages.append({"role": "system", "content": system_message})
            messages.append({"role": "user", "content": message})
            
            # Prepare request data
            data = {
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 2000,
                "top_p": 1,
                "frequency_penalty": 0,
                "presence_penalty": 0
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=data,
                    timeout=60.0
                )
                
                if response.status_code == 401:
                    raise HTTPException(status_code=401, detail="Unauthorized: Invalid API key")
                elif response.status_code == 429:
                    raise HTTPException(status_code=429, detail="Rate limit exceeded")
                elif response.status_code != 200:
                    error_detail = response.text
                    try:
                        error_json = response.json()
                        error_detail = error_json.get("error", {}).get("message", error_detail)
                    except:
                        pass
                    raise HTTPException(status_code=response.status_code, detail=f"API Error: {error_detail}")
                
                result = response.json()
                
                if "choices" not in result or not result["choices"]:
                    raise HTTPException(status_code=500, detail="No response from model")
                
                return result["choices"][0]["message"]["content"]
                
        except httpx.TimeoutException:
            raise HTTPException(status_code=408, detail="Request timeout")
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Request error: {str(e)}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
    async def code_completion(self, code: str, language: str, instruction: str = None) -> str:
        """Get code completion/suggestions"""
        prompt = f"Complete or improve this {language} code:\n\n```{language}\n{code}\n```"
        
        if instruction:
            prompt += f"\n\nSpecific instruction: {instruction}"
        
        context = {
            "task": "code_completion",
            "language": language,
            "code_length": len(code)
        }
        
        return await self.chat_completion(prompt, context=context)
    
    async def explain_code(self, code: str, language: str) -> str:
        """Explain what the code does"""
        prompt = f"Explain what this {language} code does:\n\n```{language}\n{code}\n```"
        
        context = {
            "task": "code_explanation",
            "language": language
        }
        
        return await self.chat_completion(prompt, context=context)
    
    async def debug_code(self, code: str, language: str, error_message: str = None) -> str:
        """Help debug code issues"""
        prompt = f"Help debug this {language} code:\n\n```{language}\n{code}\n```"
        
        if error_message:
            prompt += f"\n\nError message: {error_message}"
        
        context = {
            "task": "debugging",
            "language": language,
            "has_error": bool(error_message)
        }
        
        return await self.chat_completion(prompt, context=context)
    
    async def generate_code(self, description: str, language: str) -> str:
        """Generate code from description"""
        prompt = f"Generate {language} code for: {description}"
        
        context = {
            "task": "code_generation",
            "language": language
        }
        
        return await self.chat_completion(prompt, context=context)

# Test the client
async def test_openrouter_client():
    """Test the OpenRouter client"""
    try:
        client = OpenRouterClient()
        models = await client.get_models()
        print(f"Found {len(models)} coding models")
        
        if models:
            response = await client.chat_completion("Hello, can you help me write a Python function?")
            print(f"Response: {response[:100]}...")
        
        return True
    except Exception as e:
        print(f"Test failed: {e}")
        return False

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_openrouter_client())
