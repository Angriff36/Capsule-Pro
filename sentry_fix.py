import subprocess
import pathlib
import re

pattern = re.compile(r'import \* as Sentry from "@sentry/nextjs";')
result = subprocess.run(["rg", "-l", "Sentry\\.captureException"], capture_output=True, text=True)
files = [pathlib.Path(line) for line in result.stdout.strip().splitlines() if line]
print("files count", len(files))
changed = []
for path in files:
    text = path.read_text()
    new_text = pattern.sub("import { captureException } from \"@sentry/nextjs\";", text)
    new_text = new_text.replace("captureException(", "captureException(")
    if new_text != text:
        path.write_text(new_text)
        changed.append(path)
print("changed", len(changed))
