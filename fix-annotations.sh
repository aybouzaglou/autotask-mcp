#!/bin/bash
# Fix annotation syntax errors in tool.handler.ts
#
# Problem patterns:
# 1. Double commas after required: required: [],,
# 2. Malformed structure with extra closing braces
#
# Target structure should be:
#   required: [...],
# },
# annotations: {
#   title: "...",
#   ...ANNOTATIONS,
# },

FILE="src/handlers/tool.handler.ts"

# Create backup
cp "$FILE" "$FILE.backup-$(date +%Y%m%d-%H%M%S)"

# Fix pattern: required: [...],,\n        annotations: {...}\n        },
# Replace with: required: [...],\n        },\n        annotations: {...},

# Use perl for multi-line regex replacement
perl -i -0pe 's/required: (\[[^\]]*\]),,\n        annotations: \{\n          title: "([^"]+)",\n          \.\.\.([A-Z_]+),\n        \}\n        \}/required: $1,\n        },\n        annotations: {\n          title: "$2",\n          ...$3,\n        }/g' "$FILE"

echo "Fixed tool.handler.ts"
echo "Backup created at: $FILE.backup-$(date +%Y%m%d-%H%M%S)"
