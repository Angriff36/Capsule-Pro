import json
from collections import defaultdict

# Load the violations report
with open('violations_report.json', 'r') as f:
    api_data = json.load(f)

# Count violations by domain
domain_violations = defaultdict(int)
domain_files = defaultdict(int)

for file_path, count in api_data['all_files'].items():
    # Extract domain from path (remove leading .\ and split by backslash)
    clean_path = file_path.replace('./', '')
    parts = clean_path.split('\')
    if len(parts) > 0:
        domain = parts[0]
        domain_violations[domain] += count
        domain_files[domain] += 1

print('API Routes - Violations by Domain:')
sorted_domains = sorted(domain_violations.items(), key=lambda x: x[1], reverse=True)
for domain, count in sorted_domains:
    print(f'  {domain}: {count} violations in {domain_files[domain]} files')
