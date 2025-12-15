#!/bin/bash

# Auto-fix linting issues
echo "Running ESLint with auto-fix..."
npx eslint . --fix --ext .ts,.tsx --max-warnings 1000

echo "Lint fixes complete!"
