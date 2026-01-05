import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

const VALID_CATEGORIES = [
  'IDENTITY', 'MEDICAL', 'FINANCIAL', 'HOUSEHOLD',
  'EDUCATION', 'LEGAL', 'PETS', 'OTHER'
];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where: any = {
      familyId: session.user.familyId,
    };

    if (category) {
      where.category = category;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      category,
      fileUrl,
      fileSize,
      mimeType,
      documentNumber,
      issuedDate,
      expiresAt,
      tags,
      notes,
      accessList,
    } = body;

    // Validate required fields
    if (!name || !category || !fileUrl || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: 'Name, category, fileUrl, fileSize, and mimeType are required' },
        { status: 400 }
      );
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Create document
    const document = await prisma.document.create({
      data: {
        familyId: session.user.familyId,
        name: name.trim(),
        category,
        fileUrl,
        fileSize,
        mimeType,
        documentNumber: documentNumber?.trim() || null,
        issuedDate: issuedDate ? new Date(issuedDate) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        tags: tags || [],
        notes: notes?.trim() || null,
        uploadedBy: session.user.id,
        accessList: accessList || [session.user.id],
      },
      include: {
        uploader: {
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
        action: 'DOCUMENT_UPLOADED',
        result: 'SUCCESS',
        metadata: {
          documentId: document.id,
          name: document.name,
          category: document.category,
        },
      },
    });

    return NextResponse.json(
      { document, message: 'Document uploaded successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
