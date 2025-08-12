#!/usr/bin/env python3
"""
Production Authentication System Setup Script
Automates the setup and testing of the complete authentication system
"""

import os
import sys
import subprocess
import json
import requests
import time
from pathlib import Path

class SetupManager:
    def __init__(self):
        self.backend_dir = Path("backend")
        self.frontend_dir = Path("frontend")
        self.base_url = "http://localhost:8000"
        
    def print_header(self, title: str):
        print(f"\n{'='*60}")
        print(f"🚀 {title}")
        print('='*60)
    
    def print_success(self, message: str):
        print(f"✅ {message}")
    
    def print_error(self, message: str):
        print(f"❌ {message}")
    
    def print_info(self, message: str):
        print(f"ℹ️  {message}")
    
    def run_command(self, command: str, cwd: Path = None) -> bool:
        """Run shell command and return success status"""
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                cwd=cwd, 
                capture_output=True, 
                text=True,
                timeout=30
            )
            if result.returncode != 0:
                self.print_error(f"Command failed: {command}")
                self.print_error(f"Error: {result.stderr}")
                return False
            return True
        except subprocess.TimeoutExpired:
            self.print_error(f"Command timed out: {command}")
            return False
        except Exception as e:
            self.print_error(f"Command error: {e}")
            return False
    
    def check_dependencies(self) -> bool:
        """Check if required dependencies are available"""
        self.print_header("Checking Dependencies")
        
        # Check Python
        try:
            import sys
            python_version = sys.version_info
            if python_version.major >= 3 and python_version.minor >= 8:
                self.print_success(f"Python {python_version.major}.{python_version.minor} ✓")
            else:
                self.print_error("Python 3.8+ required")
                return False
        except:
            self.print_error("Python not found")
            return False
        
        # Check Node.js
        if self.run_command("node --version"):
            self.print_success("Node.js ✓")
        else:
            self.print_error("Node.js not found - install from https://nodejs.org/")
            return False
        
        # Check directories
        if not self.backend_dir.exists():
            self.print_error("Backend directory not found")
            return False
        
        if not self.frontend_dir.exists():
            self.print_error("Frontend directory not found")
            return False
        
        self.print_success("All dependencies available")
        return True
    
    def setup_backend(self) -> bool:
        """Setup backend with production auth"""
        self.print_header("Setting Up Backend")
        
        # Install Python dependencies
        self.print_info("Installing Python dependencies...")
        if not self.run_command("pip install -r requirements.txt", self.backend_dir):
            return False
        self.print_success("Python dependencies installed")
        
        # Create keys directory
        keys_dir = self.backend_dir / "keys"
        keys_dir.mkdir(exist_ok=True)
        self.print_success("Keys directory created")
        
        # Generate RSA keys (will happen automatically on first run)
        self.print_info("RSA keys will be generated on first startup")
        
        return True
    
    def setup_frontend(self) -> bool:
        """Setup frontend with new auth system"""
        self.print_header("Setting Up Frontend")
        
        # Install Node dependencies
        self.print_info("Installing Node.js dependencies...")
        if not self.run_command("npm install", self.frontend_dir):
            return False
        self.print_success("Node.js dependencies installed")
        
        return True
    
    def start_backend(self) -> bool:
        """Start backend server"""
        self.print_header("Starting Backend Server")
        
        self.print_info("Starting FastAPI server...")
        self.print_info("This will run in the background...")
        
        # Start backend in background
        try:
            process = subprocess.Popen(
                ["python", "main.py"],
                cwd=self.backend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Wait a moment for startup
            time.sleep(3)
            
            # Check if it's running
            if process.poll() is None:
                self.print_success("Backend server started")
                return True
            else:
                self.print_error("Backend server failed to start")
                return False
                
        except Exception as e:
            self.print_error(f"Failed to start backend: {e}")
            return False
    
    def test_backend(self) -> bool:
        """Test backend functionality"""
        self.print_header("Testing Backend")
        
        # Wait for server to be ready
        for i in range(10):
            try:
                response = requests.get(f"{self.base_url}/health", timeout=2)
                if response.ok:
                    break
            except:
                time.sleep(1)
        else:
            self.print_error("Backend not responding")
            return False
        
        self.print_success("Backend is responding")
        
        # Test auth health
        try:
            response = requests.get(f"{self.base_url}/api/auth/v2/health", timeout=5)
            if response.ok:
                data = response.json()
                self.print_success("Production auth system available")
                self.print_info(f"Features: {len(data.get('features', []))} security features")
                return True
            else:
                self.print_error("Auth system not available")
                return False
        except Exception as e:
            self.print_error(f"Auth test failed: {e}")
            return False
    
    def run_auth_tests(self) -> bool:
        """Run comprehensive auth tests"""
        self.print_header("Running Authentication Tests")
        
        test_script = self.backend_dir / "test_auth_v2.py"
        if not test_script.exists():
            self.print_error("Test script not found")
            return False
        
        self.print_info("Running comprehensive auth test suite...")
        result = subprocess.run(
            ["python", "test_auth_v2.py"],
            cwd=self.backend_dir,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            self.print_success("All authentication tests passed!")
            return True
        else:
            self.print_error("Some authentication tests failed")
            print(result.stdout)
            return False
    
    def create_demo_user(self) -> bool:
        """Create demo user for testing"""
        self.print_header("Creating Demo User")
        
        try:
            response = requests.post(f"{self.base_url}/api/auth/v2/dev-create-user")
            if response.ok:
                data = response.json()
                credentials = data.get('credentials', {})
                self.print_success("Demo user created")
                self.print_info(f"Email: {credentials.get('email', 'N/A')}")
                self.print_info(f"Password: {credentials.get('password', 'N/A')}")
                return True
            else:
                self.print_error("Failed to create demo user")
                return False
        except Exception as e:
            self.print_error(f"Demo user creation failed: {e}")
            return False
    
    def show_next_steps(self):
        """Show next steps for user"""
        self.print_header("Next Steps")
        
        print("🎉 Production Authentication System is ready!")
        print()
        print("📋 What's been set up:")
        print("   ✅ RS256 JWT access tokens (10-minute expiry)")
        print("   ✅ Rotating refresh tokens (60-day expiry)")
        print("   ✅ Secure HTTP-only cookies")
        print("   ✅ CSRF protection")
        print("   ✅ Argon2 password hashing")
        print("   ✅ Session management")
        print("   ✅ Rate limiting and account protection")
        print()
        print("🚀 To start development:")
        print("   1. Backend is running at: http://localhost:8000")
        print("   2. Start frontend: cd frontend && npm run dev")
        print("   3. Open: http://localhost:3000")
        print()
        print("🔐 Demo credentials:")
        print("   Email: dev@example.com")
        print("   Password: DevPassword123!")
        print()
        print("📚 Documentation:")
        print("   • PRODUCTION_AUTH_SYSTEM.md - Complete guide")
        print("   • AUTHENTICATION_FIX.md - Migration guide")
        print("   • STRIPE_SETUP_GUIDE.md - Payment integration")
        print()
        print("🧪 Testing:")
        print("   • Run: cd backend && python test_auth_v2.py")
        print("   • API docs: http://localhost:8000/docs")
        print()
        print("⚠️  For production deployment:")
        print("   • Set COOKIE_SECURE = True")
        print("   • Use HTTPS")
        print("   • Configure proper CORS origins")
        print("   • Set up proper database")
    
    def run_full_setup(self):
        """Run complete setup process"""
        print("🔐 Production Authentication System Setup")
        print("=" * 60)
        
        steps = [
            ("Check Dependencies", self.check_dependencies),
            ("Setup Backend", self.setup_backend),
            ("Setup Frontend", self.setup_frontend),
            ("Start Backend", self.start_backend),
            ("Test Backend", self.test_backend),
            ("Run Auth Tests", self.run_auth_tests),
            ("Create Demo User", self.create_demo_user),
        ]
        
        for step_name, step_func in steps:
            if not step_func():
                self.print_error(f"Setup failed at: {step_name}")
                return False
        
        self.show_next_steps()
        return True

if __name__ == "__main__":
    setup = SetupManager()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "test":
            setup.run_auth_tests()
        elif command == "backend":
            setup.start_backend()
        elif command == "demo":
            setup.create_demo_user()
        else:
            print("Available commands: test, backend, demo")
    else:
        success = setup.run_full_setup()
        sys.exit(0 if success else 1)