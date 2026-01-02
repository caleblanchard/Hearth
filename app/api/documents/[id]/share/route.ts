import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can create share links
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can create share links' },
        { status: 403 }
      );
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify family ownership
    if (document.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { expiresInDays, recipientEmail, notes } = body;

    // Generate secure token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const shareLink = await prisma.documentShareLink.create({
      data: {
        documentId: document.id,
        token,
        expiresAt,
        recipientEmail: recipientEmail?.trim() || null,
        notes: notes?.trim() || null,
        createdBy: session.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'DOCUMENT_SHARED',
        result: 'SUCCESS',
        metadata: {
          documentId: document.id,
          documentName: document.name,
          shareLinkId: shareLink.id,
          recipientEmail: recipientEmail || 'none',
        },
      },
    });

    return NextResponse.json({
      shareLink,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/shared/${token}`,
      message: 'Share link created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify family ownership
    if (document.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const shareLinks = await prisma.documentShareLink.findMany({
      where: {
        documentId: params.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ shareLinks });
  } catch (error) {
    console.error('Error fetching share links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share links' },
      { status: 500 }
    );
  }
}
