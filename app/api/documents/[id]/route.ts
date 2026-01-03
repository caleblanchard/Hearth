import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const VALID_CATEGORIES = [
  'IDENTITY', 'MEDICAL', 'FINANCIAL', 'HOUSEHOLD',
  'EDUCATION', 'LEGAL', 'PETS', 'OTHER'
];

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
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
        versions: {
          take: 5,
          orderBy: {
            uploadedAt: 'desc',
          },
        },
      },
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

    // Check access list (anyone in family can view)
    // In a more restrictive setup, you could check document.accessList
    // For now, family membership is sufficient

    // Log access
    await prisma.documentAccessLog.create({
      data: {
        documentId: document.id,
        accessedBy: session.user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'DOCUMENT_ACCESSED',
        result: 'SUCCESS',
        metadata: {
          documentId: document.id,
          documentName: document.name,
        },
      },
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can update documents
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can update documents' },
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
    const {
      name,
      category,
      documentNumber,
      issuedDate,
      expiresAt,
      tags,
      notes,
      accessList,
    } = body;

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: {
        name: name?.trim() || document.name,
        category: category || document.category,
        documentNumber: documentNumber !== undefined ? documentNumber?.trim() || null : document.documentNumber,
        issuedDate: issuedDate ? new Date(issuedDate) : document.issuedDate,
        expiresAt: expiresAt ? new Date(expiresAt) : document.expiresAt,
        tags: tags !== undefined ? tags : document.tags,
        notes: notes !== undefined ? notes?.trim() || null : document.notes,
        accessList: accessList !== undefined ? accessList : document.accessList,
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
        action: 'DOCUMENT_UPDATED',
        result: 'SUCCESS',
        metadata: {
          documentId: updatedDocument.id,
          documentName: updatedDocument.name,
        },
      },
    });

    return NextResponse.json({
      document: updatedDocument,
      message: 'Document updated successfully',
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can delete documents
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can delete documents' },
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

    // Delete document (cascade will delete versions, share links, access logs)
    await prisma.document.delete({
      where: { id: params.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'DOCUMENT_DELETED',
        result: 'SUCCESS',
        metadata: {
          documentId: document.id,
          documentName: document.name,
        },
      },
    });

    return NextResponse.json({
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
