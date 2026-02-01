# Get recent Next.js dev server logs from terminal or check if we can access them
# Since the server is running in background, let's try to check the output
Get-Content "C:\Users\Ryan\AppData\Local\Temp\claude\C--projects-capsule-pro\tasks\b23835c.output" -Tail 100 -ErrorAction SilentlyContinue
