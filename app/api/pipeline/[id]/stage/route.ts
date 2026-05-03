/**
 * PUT /api/pipeline/[id]/stage
 * Called by: Kanban board drag-drop handler, stage transition buttons
 * Auth: none
 * Body: { stage: PipelineStage }
 * Response: { data: { changes: number, stage: PipelineStage, stage_entered_at: number } }
 *
 * Updates the pipeline stage and resets the stage timer so days_in_stage
 * counts from when the card moved — not from original package creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';
import type { PipelineStage } from '@/types';

// Valid pipeline stage values — reject unknown stages before hitting the DB
const VALID_STAGES: PipelineStage[] = [
  'proposal',
  'sent',
  'in-review',
  'meeting',
  'negotiating',
  'greenlit',
  'pass',
];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const stage = body.stage as PipelineStage;

    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage: ${stage}. Valid stages: ${VALID_STAGES.join(', ')}` },
        { status: 400 }
      );
    }

    const now = Date.now();

    const result = run(
      `UPDATE packages
       SET pipeline_stage = ?, stage_entered_at = ?, days_in_stage = 0, updated_at = ?
       WHERE id = ?`,
      [stage, now, now, id]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        changes: result.changes,
        stage,
        stage_entered_at: now,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
