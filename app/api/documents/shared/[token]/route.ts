import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const shareLink = await prisma.documentShareLink.findUnique({
      where: { token: params.token },
      include: {
        document: {
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Check if link is revoked
    if (shareLink.revokedAt) {
      return NextResponse.json(
        { error: 'Share link has been revoked' },
        { status: 410 }
      );
    }

    // Check if link is expired
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      );
    }

    // Increment access count and update last accessed time
    await prisma.documentShareLink.update({
      where: { id: shareLink.id },
      data: {
        accessCount: {
          increment: 1,
        },
        lastAccessedAt: new Date(),
      },
    });

    // Create document access log for external access
    await prisma.documentAccessLog.create({
      data: {
        documentId: shareLink.documentId,
        accessedBy: null, // External access
        ipAddress: 'unknown',
        userAgent: 'unknown',
        viaShareLink: shareLink.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: shareLink.document.familyId,
        memberId: shareLink.createdBy,
        action: 'DOCUMENT_SHARE_ACCESSED',
        result: 'SUCCESS',
        metadata: {
          documentId: shareLink.documentId,
          documentName: shareLink.document.name,
          shareLinkId: shareLink.id,
          token: params.token,
        },
      },
    });

    return NextResponse.json({
      document: {
        id: shareLink.document.id,
        name: shareLink.document.name,
        category: shareLink.document.category,
        fileUrl: shareLink.document.fileUrl,
        fileSize: shareLink.document.fileSize,
        mimeType: shareLink.document.mimeType,
        notes: shareLink.document.notes,
        uploader: shareLink.document.uploader,
      },
      shareInfo: {
        createdAt: shareLink.createdAt,
        expiresAt: shareLink.expiresAt,
        createdBy: shareLink.createdBy, // User ID who created the share link
      },
    });
  } catch (error) {
    logger.error('Error accessing shared document:', error);
    return NextResponse.json(
      { error: 'Failed to access shared document' },
      { status: 500 }
    );
  }
}
