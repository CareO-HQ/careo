"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";

export default function RunMigrationPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const migrationSQL = `
-- Add 'topical' to the emar_sheet_type enum
DO $$
BEGIN
  -- Check if 'topical' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'topical'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'emar_sheet_type')
  ) THEN
    -- Add 'topical' to the enum
    ALTER TYPE emar_sheet_type ADD VALUE 'topical';
  END IF;
END $$;
  `.trim();

  const verificationSQL = `SELECT enum_range(NULL::emar_sheet_type) as available_sheet_types;`;

  const runMigration = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      // Try to run the migration
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: migrationSQL
      });

      if (error) {
        // If RPC doesn't exist, show manual instructions
        console.error('Migration error:', error);
        setResult({
          success: false,
          error: error.message,
          needsManual: true
        });
        toast.error("Cannot run migration automatically. Please run manually in Supabase SQL Editor.");
      } else {
        // Verify the migration
        const { data: verifyData, error: verifyError } = await supabase.rpc('exec_sql', {
          sql_query: verificationSQL
        });

        if (verifyError) {
          console.error('Verification error:', verifyError);
        }

        setResult({
          success: true,
          message: "Migration completed successfully!",
          verification: verifyData
        });
        toast.success("Migration completed successfully!");
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setResult({
        success: false,
        error: err.message,
        needsManual: true
      });
      toast.error("Error running migration. Please run manually.");
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("SQL copied to clipboard!");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Add Topical eMAR Support</CardTitle>
          <CardDescription>
            This migration adds &apos;topical&apos; as a valid eMAR sheet type in the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Migration Attempt */}
          <div className="space-y-3">
            <h3 className="font-semibold">Option 1: Automatic Migration (Try First)</h3>
            <Button
              onClick={runMigration}
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? "Running Migration..." : "Run Migration Automatically"}
            </Button>
          </div>

          {/* Manual Instructions */}
          <div className="space-y-3">
            <h3 className="font-semibold">Option 2: Manual Migration (If Automatic Fails)</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to your Supabase Project Dashboard</li>
              <li>Navigate to SQL Editor</li>
              <li>Copy the SQL below and paste it</li>
              <li>Click &quot;Run&quot;</li>
            </ol>

            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                {migrationSQL}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(migrationSQL)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy SQL
              </Button>
            </div>
          </div>

          {/* Verification SQL */}
          <div className="space-y-3">
            <h3 className="font-semibold">Verification Query</h3>
            <p className="text-sm text-muted-foreground">
              Run this after the migration to verify it worked:
            </p>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                {verificationSQL}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(verificationSQL)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy SQL
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Expected result: <code className="bg-gray-100 px-2 py-1 rounded">&#123;medication,prn,topical&#125;</code>
            </p>
          </div>

          {/* Result Display */}
          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {result.success ? result.message : 'Migration Failed'}
                  </p>
                  {result.error && (
                    <p className="text-sm text-red-700 mt-1">{result.error}</p>
                  )}
                  {result.needsManual && (
                    <p className="text-sm text-red-700 mt-2">
                      Please use Option 2 (Manual Migration) above.
                    </p>
                  )}
                  {result.verification && (
                    <pre className="text-sm mt-2 bg-white p-2 rounded border">
                      {JSON.stringify(result.verification, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Important Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Important Notes</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>This migration is required for Topical eMAR functionality</li>
              <li>The migration is safe to run multiple times (it checks first)</li>
              <li>After running, topical medications will sync to the eMAR automatically</li>
              <li>You only need to run this once per database</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
