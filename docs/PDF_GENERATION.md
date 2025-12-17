# PDF Generation System

## Overview

The iCare application uses **Playwright** to generate PDF documents for risk assessments and other care file forms. This document explains how the system works and how to troubleshoot issues.

## How It Works

1. **User submits a form** (e.g., Infection Prevention Assessment)
2. **Convex stores the data** in the database
3. **Convex triggers an internal action** to generate the PDF
4. **Internal action calls Next.js API route** (`/api/pdf/[assessment-type]`)
5. **API route uses Playwright** to:
   - Launch a headless Chromium browser
   - Render HTML content with the assessment data
   - Generate a PDF from the rendered HTML
   - Store the PDF in Convex file storage
6. **PDF URL is returned** to the user for viewing/downloading

## Setup Requirements

### 1. Install Playwright Browsers

Playwright browsers are automatically installed when you run `npm install` thanks to the `postinstall` script.

**Manual installation** (if needed):
```bash
npx playwright install chromium
```

### 2. Environment Variables

Required in `.env.local`:
```bash
# Convex URL (required)
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud

# PDF API Token (optional for development)
PDF_API_TOKEN=your-secret-token-here
```

### 3. Verify Setup

Run the setup checker:
```bash
npm run check-pdf
```

## Supported Assessments

The following risk assessments support PDF generation:

- ✅ Infection Prevention Assessment (`/api/pdf/infection-prevention`)
- ✅ Moving & Handling Assessment (`/api/pdf/moving-handling`)
- ✅ Bladder & Bowel Assessment (`/api/pdf/bladder-bowel`)
- ✅ Long Term Falls Assessment (`/api/pdf/long-term-falls`)

## Troubleshooting

### Issue: "Spinning loader" when creating assessments

**Cause**: Playwright browsers not installed

**Solution**:
```bash
npx playwright install chromium
npm run check-pdf
```

### Issue: PDF generation fails with 401 Unauthorized

**Cause**: Missing or incorrect `PDF_API_TOKEN`

**Solution**:
1. Check `.env.local` has `PDF_API_TOKEN` set
2. Restart development server: `npm run dev`

### Issue: PDF generation timeout

**Cause**: Slow HTML rendering or large content

**Solution**:
- Check browser console for errors
- Increase timeout in API route (currently 30s)
- Ensure network is stable

### Issue: Chromium fails to launch

**Cause**: Missing system dependencies

**Solution** (Linux):
```bash
sudo apt-get install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2
```

**Solution** (macOS): Usually no additional dependencies needed

## Development

### Testing PDF Generation Locally

1. Start development server:
   ```bash
   npm run dev
   ```

2. Navigate to a resident's care file
3. Create a risk assessment
4. Check browser console for PDF generation logs
5. PDF should generate in 2-5 seconds

### Adding New PDF Templates

To add a new PDF template:

1. **Create API route**: `app/api/pdf/[new-assessment]/route.ts`
2. **Generate HTML template**: Function to create HTML from assessment data
3. **Add Convex action**: Trigger PDF generation after form submission
4. **Update documentation**: Add to supported assessments list

Example structure:
```typescript
import { chromium } from "playwright";

export async function POST(request: NextRequest) {
  const { assessmentId } = await request.json();

  // Fetch data from Convex
  const data = await convexClient.query(api.careFiles.getAssessment, {
    id: assessmentId
  });

  // Generate HTML
  const html = generateHTML(data);

  // Generate PDF with Playwright
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html);
  const pdfBuffer = await page.pdf({ format: "A4" });
  await browser.close();

  // Store in Convex
  // ...
}
```

## Performance

- **Cold start**: 3-5 seconds (first PDF generation)
- **Warm start**: 1-2 seconds (subsequent generations)
- **Browser memory**: ~150MB per Chromium instance
- **Concurrent limit**: 5 PDF generations at once (can be increased)

## Security

- API routes are protected with `PDF_API_TOKEN` bearer auth
- PDFs are stored securely in Convex with access control
- No sensitive data is logged to console
- Temporary files are cleaned up automatically

## Support

For issues or questions about PDF generation:
1. Run `npm run check-pdf` to verify setup
2. Check browser console for error messages
3. Review Convex logs for API call failures
4. Ensure Playwright browsers are installed

## References

- [Playwright Documentation](https://playwright.dev/)
- [Convex File Storage](https://docs.convex.dev/file-storage)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
