import { NextResponse } from 'next/server';
import { getPricingPage } from '@/services/page';
import { applySubscriptionPricingFilter } from '@/services/subscription';
import { headers } from 'next/headers';

/**
 * 获取定价数据 API
 * GET /api/get-pricing?locale=en
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en';
    const source = searchParams.get('source');

    const page = await getPricingPage(locale);
    const pricing = page.pricing
      ? applySubscriptionPricingFilter(page.pricing, {
        surface: source === 'research' ? 'research' : 'general',
      }) ?? page.pricing
      : undefined;
    
    if (!pricing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pricing data not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      pricing,
    });
  } catch (error) {
    console.error('Failed to get pricing data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get pricing data',
      },
      { status: 500 }
    );
  }
}
