# CLAUDE.md

Read the following filesh before making changes to any manifest source file or writing any new manifest source file.

- C:\Projects\capsule-pro\manifest\source\manifest-native-capabilities-showcase.md
- C:\Projects\capsule-pro\manifest\source\manifest-example-native-fixed.manifest.example

 Treat the existing manifest source files as works in progress. Add new manifest source files or change existing ones whenever doing so will:

-  reduce code complexity or negate the need for typed code somewhere
-  reduce the amount of custom glue required for ANY system in capsule-pro
-  render an external dependency obsolete
-  reduce overall amount of code required whilst maintaining or improving app capabilities and functionality 
-  consolidate definitions of ANYTHING that results in less confusion about runtime behavior, file structure, architecture, domain ownership, state, routing, server and client separation, types, database information, or hooks. 
-  improve performance in any way. 

