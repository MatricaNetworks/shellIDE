import os
import json
import httpx
from typing import Dict, Any
from google.auth.transport import requests
from google.oauth2 import id_token
from fastapi import HTTPException

class GoogleAuth:
    def __init__(self):
        self.client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
        
        if not self.client_id:
            print("Warning: GOOGLE_OAUTH_CLIENT_ID not set in environment variables")
        if not self.client_secret:
            print("Warning: GOOGLE_OAUTH_CLIENT_SECRET not set in environment variables")
    
    async def verify_token(self, credential: str) -> Dict[str, Any]:
        """Verify Google OAuth token and return user info"""
        try:
            # Verify the token with Google
            idinfo = id_token.verify_oauth2_token(
                credential, 
                requests.Request(), 
                self.client_id
            )
            
            # Validate the token
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')
            
            # Extract user information
            user_info = {
                'sub': idinfo['sub'],
                'email': idinfo['email'],
                'name': idinfo.get('name', ''),
                'picture': idinfo.get('picture', ''),
                'email_verified': idinfo.get('email_verified', False)
            }
            
            if not user_info['email_verified']:
                raise ValueError('Email not verified by Google.')
            
            return user_info
            
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid token: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Token verification failed: {str(e)}")
    
    def get_auth_url(self, redirect_uri: str) -> str:
        """Generate Google OAuth authorization URL"""
        base_url = "https://accounts.google.com/o/oauth2/auth"
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": "openid email profile",
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent"
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{base_url}?{query_string}"
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        token_url = "https://oauth2.googleapis.com/token"
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to exchange code for token")
            
            return response.json()
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information using access token"""
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(user_info_url, headers=headers)
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get user info")
            
            return response.json()

# OAuth setup instructions
def print_oauth_setup_instructions():
    """Print OAuth setup instructions for users"""
    redirect_url = os.getenv("REPLIT_DEV_DOMAIN", "localhost:5000")
    
    print(f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                            GOOGLE OAUTH SETUP                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║ To enable Google authentication in ShellIDE:                                ║
║                                                                              ║
║ 1. Go to: https://console.cloud.google.com/apis/credentials                 ║
║ 2. Create a new OAuth 2.0 Client ID                                         ║
║ 3. Add these redirect URIs:                                                 ║
║    - http://localhost:5000/auth/google/callback                             ║
║    - https://{redirect_url}/auth/google/callback                            ║
║ 4. Set environment variables:                                               ║
║    - GOOGLE_OAUTH_CLIENT_ID=your_client_id                                  ║
║    - GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret                          ║
║                                                                              ║
║ For detailed instructions, visit:                                           ║
║ https://developers.google.com/identity/protocols/oauth2                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """)

# Print setup instructions on import
if __name__ == "__main__":
    print_oauth_setup_instructions()
