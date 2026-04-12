#!/usr/bin/env python3
"""
ShowClawMart Backend API Test Suite
Tests all backend endpoints after major frontend redesign
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = "https://agent-builder-dev-2.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_api_endpoint(method, endpoint, data=None, expected_status=200, description=""):
    """Test a single API endpoint"""
    url = f"{API_BASE}{endpoint}"
    
    try:
        print(f"\n🧪 Testing {method} {endpoint}")
        print(f"   Description: {description}")
        print(f"   URL: {url}")
        
        if method == "GET":
            response = requests.get(url, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=30)
        else:
            print(f"❌ Unsupported method: {method}")
            return False
            
        print(f"   Status: {response.status_code}")
        
        if response.status_code != expected_status:
            print(f"❌ Expected status {expected_status}, got {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            return False
            
        # Try to parse JSON response
        try:
            json_data = response.json()
            print(f"   ✅ Valid JSON response")
            
            # Print key information based on endpoint
            if endpoint == "/" or endpoint == "":
                print(f"   Message: {json_data.get('message', 'N/A')}")
            elif endpoint == "/stats":
                total = json_data.get('totalSkills', 0)
                categories = json_data.get('categories', {})
                print(f"   Total Skills: {total}")
                print(f"   Categories: {len(categories)} ({', '.join(categories.keys())})")
            elif "/skills" in endpoint:
                skills = json_data.get('skills', [])
                skill = json_data.get('skill')
                if skills:
                    print(f"   Skills returned: {len(skills)}")
                    if len(skills) > 0:
                        print(f"   First skill: {skills[0].get('name', 'N/A')}")
                elif skill:
                    print(f"   Single skill: {skill.get('name', 'N/A')}")
            elif endpoint in ["/personas", "/packs", "/playbooks", "/trending"]:
                items = json_data.get('personas', json_data.get('packs', json_data.get('playbooks', json_data.get('skills', []))))
                print(f"   Items returned: {len(items)}")
            elif endpoint == "/agent-templates":
                success = json_data.get('success', False)
                template = json_data.get('template', {})
                print(f"   Success: {success}")
                if template:
                    print(f"   Template ID: {template.get('id', 'N/A')}")
                    
        except json.JSONDecodeError:
            print(f"❌ Invalid JSON response")
            print(f"   Response: {response.text[:200]}")
            return False
            
        print(f"   ✅ Test passed")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

def test_frontend_page(path, description=""):
    """Test a frontend page returns 200"""
    url = f"{BASE_URL}{path}"
    
    try:
        print(f"\n🌐 Testing Frontend Page: {path}")
        print(f"   Description: {description}")
        print(f"   URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"   Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Expected status 200, got {response.status_code}")
            return False
            
        # Check if it's HTML content
        content_type = response.headers.get('content-type', '')
        if 'text/html' in content_type:
            print(f"   ✅ Valid HTML page")
        else:
            print(f"   ⚠️  Content-Type: {content_type}")
            
        print(f"   ✅ Page accessible")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

def main():
    """Run all backend API tests"""
    print("=" * 80)
    print("🚀 ShowClawMart Backend API Test Suite")
    print("   Testing after major frontend redesign")
    print(f"   Base URL: {BASE_URL}")
    print(f"   API Base: {API_BASE}")
    print(f"   Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    # Track test results
    backend_tests = []
    frontend_tests = []
    
    # Backend API Tests
    print("\n" + "=" * 50)
    print("🔧 BACKEND API TESTS")
    print("=" * 50)
    
    # 1. Root endpoint
    backend_tests.append(test_api_endpoint(
        "GET", "/", 
        description="Should return welcome message"
    ))
    
    # 2. Stats endpoint
    backend_tests.append(test_api_endpoint(
        "GET", "/stats", 
        description="Should return marketplace stats with totalSkills count"
    ))
    
    # 3. Skills list
    backend_tests.append(test_api_endpoint(
        "GET", "/skills", 
        description="Should return list of skills"
    ))
    
    # 4. Skills category filter
    backend_tests.append(test_api_endpoint(
        "GET", "/skills?category=ai-agent", 
        description="Category filter for ai-agent"
    ))
    
    # 5. Skills search filter
    backend_tests.append(test_api_endpoint(
        "GET", "/skills?search=AutoGPT", 
        description="Search filter for AutoGPT"
    ))
    
    # 6. Personas endpoint
    backend_tests.append(test_api_endpoint(
        "GET", "/personas", 
        description="Should return personas list"
    ))
    
    # 7. Packs endpoint
    backend_tests.append(test_api_endpoint(
        "GET", "/packs", 
        description="Should return packs list"
    ))
    
    # 8. Playbooks endpoint
    backend_tests.append(test_api_endpoint(
        "GET", "/playbooks", 
        description="Should return playbooks list"
    ))
    
    # 9. Trending endpoint
    backend_tests.append(test_api_endpoint(
        "GET", "/trending", 
        description="Should return trending skills"
    ))
    
    # 10. Create agent template (POST)
    agent_data = {
        "goal": "test agent for marketplace verification",
        "selectedSkillIds": [],
        "isPublic": False
    }
    backend_tests.append(test_api_endpoint(
        "POST", "/agent-templates", 
        data=agent_data,
        description="Create agent template"
    ))
    
    # Frontend Page Tests (as requested)
    print("\n" + "=" * 50)
    print("🌐 FRONTEND PAGE TESTS")
    print("=" * 50)
    
    frontend_pages = [
        ("/learn/how-it-works", "How It Works page"),
        ("/learn/skills", "Skills learning page"),
        ("/learn/agents", "Agents learning page"),
        ("/learn/mcp", "MCP learning page"),
        ("/learn/creators", "Creators learning page"),
        ("/learn/security", "Security learning page"),
        ("/about", "About page"),
        ("/enterprise", "Enterprise page"),
        ("/docs", "Documentation page"),
        ("/terms", "Terms of Service page"),
        ("/privacy", "Privacy Policy page")
    ]
    
    for path, description in frontend_pages:
        frontend_tests.append(test_frontend_page(path, description))
    
    # Results Summary
    print("\n" + "=" * 80)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 80)
    
    backend_passed = sum(backend_tests)
    backend_total = len(backend_tests)
    frontend_passed = sum(frontend_tests)
    frontend_total = len(frontend_tests)
    
    print(f"\n🔧 Backend API Tests: {backend_passed}/{backend_total} passed")
    if backend_passed == backend_total:
        print("   ✅ All backend APIs working correctly!")
    else:
        print(f"   ❌ {backend_total - backend_passed} backend tests failed")
    
    print(f"\n🌐 Frontend Page Tests: {frontend_passed}/{frontend_total} passed")
    if frontend_passed == frontend_total:
        print("   ✅ All frontend pages accessible!")
    else:
        print(f"   ❌ {frontend_total - frontend_passed} frontend pages failed")
    
    total_passed = backend_passed + frontend_passed
    total_tests = backend_total + frontend_total
    
    print(f"\n🎯 Overall: {total_passed}/{total_tests} tests passed ({(total_passed/total_tests)*100:.1f}%)")
    
    if total_passed == total_tests:
        print("\n🎉 ALL TESTS PASSED! ShowClawMart is working correctly after the redesign.")
        return True
    else:
        print(f"\n⚠️  {total_tests - total_passed} tests failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)