#!/usr/bin/env node

/**
 * PDF Generation Setup Checker
 * Verifies that Playwright browsers are installed and environment is configured
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking PDF Generation Setup...\n');

let hasErrors = false;

// 1. Check if Playwright is installed
console.log('1️⃣  Checking Playwright installation...');
try {
  const playwrightVersion = execSync('npx playwright --version', { encoding: 'utf-8' }).trim();
  console.log(`   ✅ Playwright installed: ${playwrightVersion}\n`);
} catch (error) {
  console.log('   ❌ Playwright not found\n');
  hasErrors = true;
}

// 2. Check if Chromium browser is installed
console.log('2️⃣  Checking Chromium browser...');
try {
  const browsers = execSync('npx playwright list', { encoding: 'utf-8' });
  if (browsers.includes('chromium')) {
    console.log('   ✅ Chromium browser installed\n');
  } else {
    console.log('   ❌ Chromium browser not installed');
    console.log('   💡 Run: npx playwright install chromium\n');
    hasErrors = true;
  }
} catch (error) {
  console.log('   ⚠️  Could not check browser status\n');
}

// 3. Check environment variables
console.log('3️⃣  Checking environment variables...');
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');

  if (envContent.includes('NEXT_PUBLIC_CONVEX_URL')) {
    console.log('   ✅ NEXT_PUBLIC_CONVEX_URL configured');
  } else {
    console.log('   ⚠️  NEXT_PUBLIC_CONVEX_URL not found');
  }

  if (envContent.includes('PDF_API_TOKEN')) {
    console.log('   ✅ PDF_API_TOKEN configured');
  } else {
    console.log('   ⚠️  PDF_API_TOKEN not found (optional for development)');
  }
  console.log('');
} else {
  console.log('   ⚠️  .env.local file not found\n');
}

// 4. Check PDF API routes exist
console.log('4️⃣  Checking PDF API routes...');
const pdfRoutes = [
  'app/api/pdf/infection-prevention/route.ts',
  'app/api/pdf/moving-handling/route.ts',
  'app/api/pdf/bladder-bowel/route.ts',
  'app/api/pdf/long-term-falls/route.ts',
];

let routesOk = true;
pdfRoutes.forEach(route => {
  const routePath = path.join(process.cwd(), route);
  if (fs.existsSync(routePath)) {
    console.log(`   ✅ ${route.split('/').pop()}`);
  } else {
    console.log(`   ❌ ${route} not found`);
    routesOk = false;
  }
});

if (routesOk) {
  console.log('\n');
}

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (hasErrors) {
  console.log('❌ PDF generation setup has issues. Please fix the errors above.');
  console.log('\n📝 Quick fix:');
  console.log('   npm install');
  console.log('   npx playwright install chromium\n');
  process.exit(1);
} else {
  console.log('✅ PDF generation is properly configured!');
  console.log('\n🚀 You can now generate PDFs for risk assessments.\n');
}
