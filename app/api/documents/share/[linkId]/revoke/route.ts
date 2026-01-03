import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can revoke share links
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can revoke share links' },
        { status: 403 }
      );
    }

    const shareLink = await prisma.documentShareLink.findUnique({
      where: { id: params.linkId },
      include: {
        document: true,
      },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Verify family ownership
    if (shareLink.document.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the share link to revoke access
    await prisma.documentShareLink.delete({
      where: { id: params.linkId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'DOCUMENT_SHARED',
        result: 'SUCCESS',
        metadata: {
          documentId: shareLink.documentId,
          documentName: shareLink.document.name,
          shareLinkId: shareLink.id,
          action: 'revoked',
        },
      },
    });

    return NextResponse.json({
      message: 'Share link revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking share link:', error);
    return NextResponse.json(
      { error: 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}
