import { NextResponse } from 'next/server';

import { verifyAuthToken } from '@/lib/firebase';
import { getMission } from '@/services/missions/missions';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const mission = await getMission(authResult.uid, id);

    if (!mission) {
      return NextResponse.json({ success: false, error: 'Mission not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, mission });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch mission',
      },
      { status: 500 },
    );
  }
}
