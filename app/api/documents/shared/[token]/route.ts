import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
        creator: {
          select: {
            id: true,
            name: true,
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

    // Check if link is expired
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      );
    }

    // Check if link was revoked
    if (shareLink.revokedAt) {
      return NextResponse.json(
        { error: 'Share link has been revoked' },
        { status: 410 }
      );
    }

    // Increment access count
    await prisma.documentShareLink.update({
      where: { id: shareLink.id },
      data: {
        accessCount: {
          increment: 1,
        },
        lastAccessedAt: new Date(),
      },
    });

    // Log access
    await prisma.documentAccessLog.create({
      data: {
        documentId: shareLink.documentId,
        accessedBy: null, // External access
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
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
        createdBy: shareLink.creator.name,
        createdAt: shareLink.createdAt,
        notes: shareLink.notes,
      },
    });
  } catch (error) {
    console.error('Error accessing shared document:', error);
    return NextResponse.json(
      { error: 'Failed to access shared document' },
      { status: 500 }
    );
  }
}
