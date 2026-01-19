# Branch Protection Rules Setup

To prevent Dependabot and other failing PRs from blocking deployments, set up these branch protection rules:

## For `main` branch:
1. Go to: Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

4. Status checks that must pass:
   - ✅ CI (from `.github/workflows/ci.yml`)
   - ✅ Security Scan (from `.github/workflows/security.yml`)
   - ✅ Dependabot PR Checks (from `.github/workflows/dependabot.yml`) - if it's a Dependabot PR

## For `develop` branch:
1. Similar rules but can be less strict
2. Require CI checks but maybe not security scans

## Additional Recommendations:

### Require Reviews
- ✅ Require 1+ approvals
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners

### Restrict Pushes
- ✅ Allow force pushes: No
- ✅ Allow deletions: No

### Auto-merge (Optional)
- Consider enabling auto-merge for Dependabot PRs that pass all checks:
  - In Dependabot config, uncomment the auto-merge settings
  - Only for minor/patch updates