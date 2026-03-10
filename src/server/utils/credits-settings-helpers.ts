import { env } from '@/env';
import { creditsSettings, db } from '@/server/db';
import { eq } from 'drizzle-orm';

/**
 * Returns the company name from creditsSettings, or undefined if not configured.
 * Useful for injecting into PDF report headers.
 */
export async function getReportCompanyName(): Promise<string | undefined> {
  const settings = await db.query.creditsSettings.findFirst({
    where: eq(creditsSettings.appSlug, env.IAM_APP_SLUG),
    columns: {
      companyName: true,
    },
  });

  return settings?.companyName ?? undefined;
}
