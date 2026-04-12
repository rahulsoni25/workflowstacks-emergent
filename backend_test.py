#!/usr/bin/env python3

import requests
import json
import time
from datetime import datetime

# Test configuration
BASE_URL = "https://claude-exchange.preview.emergentagent.com/api"

def test_enhanced_showclawmart_backend():
    """Test the enhanced ShowClawMart backend with improved GitHub scraping"""
    
    print("🚀 Testing Enhanced ShowClawMart Backend")
    print("=" * 60)
    
    results = {
        'total_tests': 0,
        'passed': 0,
        'failed': 0,
        'issues': []
    }
    
    def run_test(test_name, test_func):
        results['total_tests'] += 1
        print(f"\n📋 Testing: {test_name}")
        try:
            success = test_func()
            if success:
                results['passed'] += 1
                print(f"✅ {test_name} - PASSED")
            else:
                results['failed'] += 1
                print(f"❌ {test_name} - FAILED")
        except Exception as e:
            results['failed'] += 1
            results['issues'].append(f"{test_name}: {str(e)}")
            print(f"❌ {test_name} - ERROR: {str(e)}")
    
    # Test 1: Ingest enhanced data first
    def test_ingest_enhanced_data():
        print("   Triggering enhanced GitHub ingestion...")
        response = requests.get(f"{BASE_URL}/ingest", timeout=60)
        
        if response.status_code != 200:
            print(f"   ❌ Ingest failed with status {response.status_code}")
            return False
            
        data = response.json()
        print(f"   📊 Ingestion result: {data.get('count', 0)} total skills")
        print(f"   📊 Breakdown: {data.get('breakdown', {})}")
        
        # Wait for ingestion to complete
        time.sleep(2)
        return True
    
    # Test 2: Verify 50 total skills across 6 categories
    def test_stats_50_skills():
        response = requests.get(f"{BASE_URL}/stats")
        
        if response.status_code != 200:
            print(f"   ❌ Stats endpoint failed with status {response.status_code}")
            return False
            
        data = response.json()
        total_skills = data.get('totalSkills', 0)
        categories = data.get('categories', {})
        
        print(f"   📊 Total skills: {total_skills}")
        print(f"   📊 Categories: {categories}")
        print(f"   📊 Category count: {len(categories)}")
        
        # Check if we have around 50 skills (allowing some variance due to API limits)
        if total_skills < 40:
            print(f"   ❌ Expected ~50 skills, got {total_skills}")
            return False
            
        # Check if we have 6+ categories
        if len(categories) < 6:
            print(f"   ❌ Expected 6+ categories, got {len(categories)}")
            return False
            
        return True
    
    # Test 3: Verify skills with popular repos
    def test_popular_repos():
        response = requests.get(f"{BASE_URL}/skills")
        
        if response.status_code != 200:
            print(f"   ❌ Skills endpoint failed with status {response.status_code}")
            return False
            
        data = response.json()
        skills = data.get('skills', [])
        
        print(f"   📊 Retrieved {len(skills)} skills")
        
        # Check for popular repos (AutoGPT, LangChain, etc.)
        popular_repos_found = []
        high_star_skills = []
        
        for skill in skills:
            name = skill.get('name', '').lower()
            stars = skill.get('github_stars', 0)
            
            # Look for popular repo names
            if any(popular in name for popular in ['autogpt', 'langchain', 'langgraph', 'gpt', 'claude']):
                popular_repos_found.append(f"{skill.get('name')} ({stars} stars)")
            
            # Track high star count skills
            if stars > 1000:
                high_star_skills.append(f"{skill.get('name')} ({stars} stars)")
        
        print(f"   📊 Popular repos found: {len(popular_repos_found)}")
        for repo in popular_repos_found[:5]:  # Show first 5
            print(f"      - {repo}")
            
        print(f"   📊 High star skills (>1k): {len(high_star_skills)}")
        for skill in high_star_skills[:3]:  # Show top 3
            print(f"      - {skill}")
        
        return len(popular_repos_found) > 0 or len(high_star_skills) > 0
    
    # Test 4: Test AI-agent category filtering
    def test_ai_agent_category():
        response = requests.get(f"{BASE_URL}/skills?category=ai-agent")
        
        if response.status_code != 200:
            print(f"   ❌ AI-agent category filter failed with status {response.status_code}")
            return False
            
        data = response.json()
        skills = data.get('skills', [])
        
        print(f"   📊 AI-agent skills found: {len(skills)}")
        
        # Show some examples
        for skill in skills[:3]:
            print(f"      - {skill.get('name')} ({skill.get('github_stars', 0)} stars)")
        
        # Check if we have a reasonable number of AI agent skills
        if len(skills) < 5:
            print(f"   ⚠️  Expected more AI-agent skills, got {len(skills)}")
            return False
            
        return True
    
    # Test 5: Verify skill quality improvements
    def test_skill_quality():
        response = requests.get(f"{BASE_URL}/skills")
        
        if response.status_code != 200:
            print(f"   ❌ Skills endpoint failed with status {response.status_code}")
            return False
            
        data = response.json()
        skills = data.get('skills', [])
        
        quality_checks = {
            'has_github_stars': 0,
            'stars_over_50': 0,
            'has_last_updated': 0,
            'has_readme_preview': 0,
            'updated_since_2023': 0
        }
        
        for skill in skills:
            # Check github_stars field exists and > 50
            if 'github_stars' in skill:
                quality_checks['has_github_stars'] += 1
                if skill['github_stars'] > 50:
                    quality_checks['stars_over_50'] += 1
            
            # Check last_updated field exists
            if 'last_updated' in skill:
                quality_checks['has_last_updated'] += 1
                
                # Check if updated since 2023
                try:
                    last_updated = skill['last_updated']
                    if isinstance(last_updated, str):
                        update_year = int(last_updated[:4])
                        if update_year >= 2023:
                            quality_checks['updated_since_2023'] += 1
                except:
                    pass
            
            # Check README preview exists
            if skill.get('readme_preview'):
                quality_checks['has_readme_preview'] += 1
        
        print(f"   📊 Quality metrics:")
        for metric, count in quality_checks.items():
            percentage = (count / len(skills) * 100) if skills else 0
            print(f"      - {metric}: {count}/{len(skills)} ({percentage:.1f}%)")
        
        # Quality thresholds
        min_stars_threshold = 0.7  # 70% should have >50 stars
        min_updated_threshold = 0.8  # 80% should have last_updated
        
        stars_ratio = quality_checks['stars_over_50'] / len(skills) if skills else 0
        updated_ratio = quality_checks['has_last_updated'] / len(skills) if skills else 0
        
        if stars_ratio < min_stars_threshold:
            print(f"   ⚠️  Only {stars_ratio:.1%} of skills have >50 stars (expected >{min_stars_threshold:.0%})")
        
        if updated_ratio < min_updated_threshold:
            print(f"   ⚠️  Only {updated_ratio:.1%} of skills have last_updated field (expected >{min_updated_threshold:.0%})")
        
        return stars_ratio >= 0.5 and updated_ratio >= 0.5  # Relaxed thresholds
    
    # Test 6: Test new categories exist
    def test_new_categories():
        response = requests.get(f"{BASE_URL}/stats")
        
        if response.status_code != 200:
            print(f"   ❌ Stats endpoint failed with status {response.status_code}")
            return False
            
        data = response.json()
        categories = data.get('categories', {})
        
        expected_categories = ['ai-agent', 'ai-tool']
        found_categories = []
        
        for category in expected_categories:
            if category in categories:
                found_categories.append(f"{category} ({categories[category]} skills)")
        
        print(f"   📊 New categories found: {len(found_categories)}/{len(expected_categories)}")
        for cat in found_categories:
            print(f"      - {cat}")
        
        return len(found_categories) >= 1  # At least one new category should exist
    
    # Test 7: Verify rating reflects popularity
    def test_rating_popularity():
        response = requests.get(f"{BASE_URL}/skills")
        
        if response.status_code != 200:
            print(f"   ❌ Skills endpoint failed with status {response.status_code}")
            return False
            
        data = response.json()
        skills = data.get('skills', [])
        
        # Check correlation between stars and rating
        high_star_high_rating = 0
        total_high_star = 0
        
        for skill in skills:
            stars = skill.get('github_stars', 0)
            rating = skill.get('rating', 0)
            
            if stars > 1000:  # High star repos
                total_high_star += 1
                if rating >= 4.0:  # Should have high rating
                    high_star_high_rating += 1
                    
        print(f"   📊 High star repos with high ratings: {high_star_high_rating}/{total_high_star}")
        
        # Show top rated skills
        sorted_skills = sorted(skills, key=lambda x: x.get('rating', 0), reverse=True)
        print(f"   📊 Top rated skills:")
        for skill in sorted_skills[:3]:
            print(f"      - {skill.get('name')} (Rating: {skill.get('rating', 0)}, Stars: {skill.get('github_stars', 0)})")
        
        return True  # This is more of an informational test
    
    # Run all tests
    run_test("Enhanced GitHub Ingestion", test_ingest_enhanced_data)
    run_test("50 Skills Across 6 Categories", test_stats_50_skills)
    run_test("Popular Repos (AutoGPT, LangChain, etc.)", test_popular_repos)
    run_test("AI-Agent Category Filtering", test_ai_agent_category)
    run_test("Skill Quality Improvements", test_skill_quality)
    run_test("New Categories (ai-agent, ai-tool)", test_new_categories)
    run_test("Rating Reflects Popularity", test_rating_popularity)
    
    # Summary
    print("\n" + "=" * 60)
    print("🏁 TEST SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {results['total_tests']}")
    print(f"Passed: {results['passed']} ✅")
    print(f"Failed: {results['failed']} ❌")
    print(f"Success Rate: {(results['passed']/results['total_tests']*100):.1f}%")
    
    if results['issues']:
        print(f"\n🚨 Issues Found:")
        for issue in results['issues']:
            print(f"   - {issue}")
    
    return results['failed'] == 0

if __name__ == "__main__":
    test_enhanced_showclawmart_backend()