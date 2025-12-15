const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get ESLint warnings
const output = execSync('npx eslint app components lib --ext .ts,.tsx --format json', {
  encoding: 'utf-8',
  maxBuffer: 10 * 1024 * 1024
});

const results = JSON.parse(output);
const filesToFix = new Map();

// Group warnings by file
results.forEach(result => {
  if (result.messages.length > 0) {
    const unusedVars = result.messages.filter(msg =>
      msg.ruleId === '@typescript-eslint/no-unused-vars' &&
      msg.message.match(/'.*' is defined but never used/)
    );

    if (unusedVars.length > 0) {
      filesToFix.set(result.filePath, unusedVars.map(v => {
        const match = v.message.match(/'(.*)' is defined but never used/);
        return match ? match[1] : null;
      }).filter(Boolean));
    }
  }
});

console.log(`Found ${filesToFix.size} files with unused imports`);

// Fix each file
let fixedCount = 0;
filesToFix.forEach((unusedVars, filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const newLines = [];

    for (let line of lines) {
      let shouldKeep = true;

      // Check if this is an import line with unused variables
      if (line.trim().startsWith('import')) {
        for (const unusedVar of unusedVars) {
          // Match single imports like: import { Foo } from 'bar'
          const singleImportRegex = new RegExp(`import\\s*\\{\\s*${unusedVar}\\s*\\}\\s*from`);
          if (singleImportRegex.test(line)) {
            shouldKeep = false;
            break;
          }

          // Remove from multi-imports: import { Foo, Bar, Baz } from 'bar'
          const regex = new RegExp(`\\b${unusedVar}\\b\\s*,?\\s*`, 'g');
          line = line.replace(regex, '');
        }

        // Clean up empty imports or malformed ones
        if (line.match(/import\s*\{\s*,*\s*\}\s*from/) || line.match(/import\s*\{\s*\}\s*from/)) {
          shouldKeep = false;
        }

        // Clean up trailing commas
        line = line.replace(/,\s*,/g, ',').replace(/\{\s*,/g, '{').replace(/,\s*\}/g, '}');
      }

      if (shouldKeep && line.trim()) {
        newLines.push(line);
      }
    }

    const newContent = newLines.join('\n');
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      fixedCount++;
      console.log(`Fixed: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log(`\nFixed ${fixedCount} files`);
