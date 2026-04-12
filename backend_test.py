#!/usr/bin/env python3
"""
ShowClawMart Backend API Test Suite
Tests all API endpoints for the ShowClawMart application
"""

import requests
import json
import time
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://claude-exchange.preview.emergentagent.com/api"
TIMEOUT = 30

class ShowClawMartTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        self.test_results = []
        self.created_skill_id = None
        
    def log_result(self, test_name: str, success: bool, message: str, response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        
    def test_root_endpoint(self):
        """Test GET /api/ - Should return welcome message"""
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "ShowClawMart" in data["message"]:
                    self.log_result("Root Endpoint", True, f"Welcome message received: {data['message']}", data)
                else:
                    self.log_result("Root Endpoint", False, f"Unexpected response format: {data}", data)
            else:
                self.log_result("Root Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Root Endpoint", False, f"Request failed: {str(e)}")
    
    def test_stats_endpoint(self):
        """Test GET /api/stats - Should return total skills count and category breakdown"""
        try:
            response = self.session.get(f"{self.base_url}/stats")
            
            if response.status_code == 200:
                data = response.json()
                if "totalSkills" in data and "categories" in data:
                    self.log_result("Stats Endpoint", True, 
                                  f"Stats retrieved: {data['totalSkills']} total skills, {len(data['categories'])} categories", 
                                  data)
                else:
                    self.log_result("Stats Endpoint", False, f"Missing required fields in response: {data}", data)
            else:
                self.log_result("Stats Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Stats Endpoint", False, f"Request failed: {str(e)}")
    
    def test_skills_endpoint(self):
        """Test GET /api/skills - Should return all skills"""
        try:
            response = self.session.get(f"{self.base_url}/skills")
            
            if response.status_code == 200:
                data = response.json()
                if "skills" in data and isinstance(data["skills"], list):
                    skills_count = len(data["skills"])
                    self.log_result("Skills Endpoint", True, 
                                  f"Retrieved {skills_count} skills", 
                                  {"skills_count": skills_count, "sample_skill": data["skills"][0] if skills_count > 0 else None})
                    
                    # Store a skill ID for later testing
                    if skills_count > 0 and "id" in data["skills"][0]:
                        self.created_skill_id = data["skills"][0]["id"]
                        
                else:
                    self.log_result("Skills Endpoint", False, f"Invalid response format: {data}", data)
            else:
                self.log_result("Skills Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Skills Endpoint", False, f"Request failed: {str(e)}")
    
    def test_skills_filter_by_category(self):
        """Test GET /api/skills?category=mcp-server - Should filter by category"""
        try:
            response = self.session.get(f"{self.base_url}/skills?category=mcp-server")
            
            if response.status_code == 200:
                data = response.json()
                if "skills" in data and isinstance(data["skills"], list):
                    skills = data["skills"]
                    # Check if all returned skills have the correct category
                    mcp_skills = [skill for skill in skills if skill.get("category") == "mcp-server"]
                    
                    if len(skills) == len(mcp_skills):
                        self.log_result("Skills Category Filter", True, 
                                      f"Retrieved {len(skills)} mcp-server skills", 
                                      {"filtered_count": len(skills)})
                    else:
                        self.log_result("Skills Category Filter", False, 
                                      f"Filter not working correctly: {len(skills)} total, {len(mcp_skills)} mcp-server")
                else:
                    self.log_result("Skills Category Filter", False, f"Invalid response format: {data}", data)
            else:
                self.log_result("Skills Category Filter", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Skills Category Filter", False, f"Request failed: {str(e)}")
    
    def test_skills_search(self):
        """Test GET /api/skills?search=code - Should search by name/description"""
        try:
            response = self.session.get(f"{self.base_url}/skills?search=code")
            
            if response.status_code == 200:
                data = response.json()
                if "skills" in data and isinstance(data["skills"], list):
                    skills = data["skills"]
                    # Check if returned skills contain "code" in name or description
                    matching_skills = []
                    for skill in skills:
                        name = skill.get("name", "").lower()
                        description = skill.get("description", "").lower()
                        if "code" in name or "code" in description:
                            matching_skills.append(skill)
                    
                    if len(matching_skills) > 0:
                        self.log_result("Skills Search", True, 
                                      f"Search returned {len(skills)} skills, {len(matching_skills)} contain 'code'", 
                                      {"search_results": len(skills), "matching": len(matching_skills)})
                    else:
                        self.log_result("Skills Search", False, 
                                      f"Search returned {len(skills)} skills but none contain 'code'")
                else:
                    self.log_result("Skills Search", False, f"Invalid response format: {data}", data)
            else:
                self.log_result("Skills Search", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Skills Search", False, f"Request failed: {str(e)}")
    
    def test_skill_by_id(self):
        """Test GET /api/skills/:id - Should return a single skill"""
        if not self.created_skill_id:
            self.log_result("Skill By ID", False, "No skill ID available for testing")
            return
            
        try:
            response = self.session.get(f"{self.base_url}/skills/{self.created_skill_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "skill" in data and data["skill"].get("id") == self.created_skill_id:
                    self.log_result("Skill By ID", True, 
                                  f"Retrieved skill: {data['skill'].get('name', 'Unknown')}", 
                                  data["skill"])
                else:
                    self.log_result("Skill By ID", False, f"Invalid response or wrong skill ID: {data}", data)
            else:
                self.log_result("Skill By ID", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Skill By ID", False, f"Request failed: {str(e)}")
    
    def test_skill_by_invalid_id(self):
        """Test GET /api/skills/:id with invalid ID - Should return 404"""
        try:
            invalid_id = "invalid-skill-id-12345"
            response = self.session.get(f"{self.base_url}/skills/{invalid_id}")
            
            if response.status_code == 404:
                data = response.json()
                if "error" in data:
                    self.log_result("Skill By Invalid ID", True, 
                                  f"Correctly returned 404 for invalid ID: {data['error']}")
                else:
                    self.log_result("Skill By Invalid ID", False, f"404 returned but no error message: {data}")
            else:
                self.log_result("Skill By Invalid ID", False, 
                              f"Expected 404 but got HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Skill By Invalid ID", False, f"Request failed: {str(e)}")
    
    def test_upload_skill(self):
        """Test POST /api/upload - Should create a new skill"""
        try:
            skill_data = {
                "name": "Test Automation Skill",
                "description": "A test skill for automated testing purposes",
                "category": "claude-skill",
                "price": 5.99,
                "creator": "Test Creator",
                "source_url": "https://github.com/test/automation-skill",
                "github_url": "https://github.com/test/automation-skill"
            }
            
            response = self.session.post(
                f"{self.base_url}/upload",
                json=skill_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "skill" in data:
                    created_skill = data["skill"]
                    if created_skill.get("name") == skill_data["name"]:
                        self.log_result("Upload Skill", True, 
                                      f"Successfully created skill: {created_skill.get('name')} (ID: {created_skill.get('id')})", 
                                      created_skill)
                        # Store the created skill ID for cleanup or further testing
                        if not self.created_skill_id:
                            self.created_skill_id = created_skill.get("id")
                    else:
                        self.log_result("Upload Skill", False, f"Skill created but data mismatch: {created_skill}")
                else:
                    self.log_result("Upload Skill", False, f"Upload failed or invalid response: {data}", data)
            else:
                self.log_result("Upload Skill", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Upload Skill", False, f"Request failed: {str(e)}")
    
    def test_ingest_endpoint(self):
        """Test GET /api/ingest - Should scrape GitHub and populate database"""
        try:
            print("⏳ Starting GitHub ingestion (this may take a few seconds)...")
            response = self.session.get(f"{self.base_url}/ingest")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "count" in data:
                    breakdown = data.get("breakdown", {})
                    self.log_result("GitHub Ingest", True, 
                                  f"Ingestion complete: {data['count']} total skills (AgentPowers: {breakdown.get('agentPowers', 0)}, GitHub: {breakdown.get('github', 0)})", 
                                  data)
                else:
                    self.log_result("GitHub Ingest", False, f"Invalid response format: {data}", data)
            else:
                self.log_result("GitHub Ingest", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("GitHub Ingest", False, f"Request failed: {str(e)}")
    
    def test_invalid_endpoint(self):
        """Test invalid endpoint - Should return 404"""
        try:
            response = self.session.get(f"{self.base_url}/invalid-endpoint")
            
            if response.status_code == 404:
                data = response.json()
                if "error" in data:
                    self.log_result("Invalid Endpoint", True, 
                                  f"Correctly returned 404 for invalid endpoint: {data['error']}")
                else:
                    self.log_result("Invalid Endpoint", False, f"404 returned but no error message: {data}")
            else:
                self.log_result("Invalid Endpoint", False, 
                              f"Expected 404 but got HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Invalid Endpoint", False, f"Request failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all test cases"""
        print("🚀 Starting ShowClawMart Backend API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        test_methods = [
            self.test_root_endpoint,
            self.test_ingest_endpoint,  # Run ingest first to populate data
            self.test_stats_endpoint,
            self.test_skills_endpoint,
            self.test_skills_filter_by_category,
            self.test_skills_search,
            self.test_skill_by_id,
            self.test_skill_by_invalid_id,
            self.test_upload_skill,
            self.test_invalid_endpoint
        ]
        
        for test_method in test_methods:
            try:
                test_method()
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                test_name = test_method.__name__.replace("test_", "").replace("_", " ").title()
                self.log_result(test_name, False, f"Test execution failed: {str(e)}")
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")
        
        return passed == total

def main():
    """Main test execution"""
    tester = ShowClawMartTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()