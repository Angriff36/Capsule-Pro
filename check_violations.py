import os
import re
from collections import defaultdict
import json

def count_database_violations(file_path):
    """Count direct database mutation operations in a file"""
    violations = 0
    mutation_patterns = [
        r'database\.\w+\.create\(',
        r'database\.\w+\.update\(',
        r'database\.\w+\.delete\(',
        r'database\.\w+\.upsert\(',
        r'database\.\w+\.createMany\(',
        r'database\.\w+\.updateMany\(',
        r'database\.\w+\.deleteMany\('
    ]
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            for pattern in mutation_patterns:
                matches = re.findall(pattern, content)
                violations += len(matches)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    
    return violations

def main():
    api_dir = "apps/api/app/api"
    violations_count = 0
    file_violations = defaultdict(int)
    
    # Get all TypeScript files
    for root, dirs, files in os.walk(api_dir):
        # Skip node_modules and .next
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.next']]
        
        for file in files:
            if file.endswith('.ts') and not file.endswith('.test.ts'):
                file_path = os.path.join(root, file)
                violations = count_database_violations(file_path)
                
                if violations > 0:
                    file_violations[file_path] = violations
                    violations_count += violations
    
    # Sort by violation count
    sorted_files = sorted(file_violations.items(), key=lambda x: x[1], reverse=True)
    
    print(f"\nTotal remaining direct Prisma write violations: {violations_count}")
    print(f"Files with violations: {len(file_violations)}")
    
    print("\nTop 10 files with most violations:")
    for i, (file_path, count) in enumerate(sorted_files[:10], 1):
        print(f"{i}. {file_path}: {count} violations")
    
    # Save results
    with open('violations_report.json', 'w') as f:
        json.dump({
            'total_violations': violations_count,
            'files_with_violations': len(file_violations),
            'top_files': sorted_files[:10],
            'all_files': dict(sorted_files)
        }, f, indent=2)
    
    print("\nReport saved to violations_report.json")

if __name__ == "__main__":
    main()
