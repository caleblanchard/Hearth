import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostComposer from '@/app/components/communication/PostComposer';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    refresh: jest.fn(),
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('PostComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render post composer form', () => {
    render(<PostComposer userRole="PARENT" />);

    expect(screen.getByRole('combobox', { name: /post type/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /content/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /post/i })).toBeInTheDocument();
  });

  it('should show all post type options for parents', () => {
    render(<PostComposer userRole="PARENT" />);

    const typeSelect = screen.getByRole('combobox', { name: /post type/i });
    expect(typeSelect).toHaveValue('NOTE');

    // Check that all options are available
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(screen.getByRole('option', { name: /announcement/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /kudos/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /note/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /photo/i })).toBeInTheDocument();
  });

  it('should hide announcement option for children', () => {
    render(<PostComposer userRole="CHILD" />);

    const typeSelect = screen.getByRole('combobox', { name: /post type/i });

    // Should not have announcement option
    expect(screen.queryByRole('option', { name: /announcement/i })).not.toBeInTheDocument();

    // Should have other options
    expect(screen.getByRole('option', { name: /kudos/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /note/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /photo/i })).toBeInTheDocument();
  });

  it('should show image URL field when PHOTO type is selected', async () => {
    const user = userEvent.setup();
    render(<PostComposer userRole="PARENT" />);

    // Initially no image URL field
    expect(screen.queryByRole('textbox', { name: /image url/i })).not.toBeInTheDocument();

    // Select PHOTO type
    const typeSelect = screen.getByRole('combobox', { name: /post type/i });
    await user.selectOptions(typeSelect, 'PHOTO');

    // Now image URL field should appear
    expect(screen.getByRole('textbox', { name: /image url/i })).toBeInTheDocument();
  });

  it('should validate required content field', async () => {
    const user = userEvent.setup();
    render(<PostComposer userRole="PARENT" />);

    const submitButton = screen.getByRole('button', { name: /post/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/content is required/i)).toBeInTheDocument();
    });
  });

  it('should submit post successfully', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = jest.fn();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        post: {
          id: 'new-post-1',
          type: 'NOTE',
          content: 'Test post content',
          title: 'Test Title',
        },
      }),
    });

    render(<PostComposer userRole="PARENT" onSuccess={mockOnSuccess} />);

    // Fill in form
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    const contentInput = screen.getByRole('textbox', { name: /content/i });

    await user.type(titleInput, 'Test Title');
    await user.type(contentInput, 'Test post content');

    // Submit
    const submitButton = screen.getByRole('button', { name: /post/i });
    await user.click(submitButton);

    await waitFor(() => {
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/communication');
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].headers).toEqual({ 'Content-Type': 'application/json' });
      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({
        type: 'NOTE',
        title: 'Test Title',
        content: 'Test post content',
      });
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should include imageUrl when posting PHOTO type', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        post: {
          id: 'new-post-1',
          type: 'PHOTO',
          content: 'Beach day!',
          imageUrl: 'https://example.com/photo.jpg',
        },
      }),
    });

    render(<PostComposer userRole="PARENT" />);

    // Select PHOTO type
    const typeSelect = screen.getByRole('combobox', { name: /post type/i });
    await user.selectOptions(typeSelect, 'PHOTO');

    // Fill in form
    const contentInput = screen.getByRole('textbox', { name: /content/i });
    const imageUrlInput = screen.getByRole('textbox', { name: /image url/i });

    await user.type(contentInput, 'Beach day!');
    await user.type(imageUrlInput, 'https://example.com/photo.jpg');

    // Submit
    const submitButton = screen.getByRole('button', { name: /post/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/communication',
        expect.objectContaining({
          body: JSON.stringify({
            type: 'PHOTO',
            content: 'Beach day!',
            imageUrl: 'https://example.com/photo.jpg',
          }),
        })
      );
    });
  });

  it('should clear form after successful submission', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        post: {
          id: 'new-post-1',
          type: 'NOTE',
          content: 'Test content',
        },
      }),
    });

    render(<PostComposer userRole="PARENT" />);

    const titleInput = screen.getByRole('textbox', { name: /title/i }) as HTMLInputElement;
    const contentInput = screen.getByRole('textbox', { name: /content/i }) as HTMLTextAreaElement;

    await user.type(titleInput, 'Test Title');
    await user.type(contentInput, 'Test content');

    expect(titleInput.value).toBe('Test Title');
    expect(contentInput.value).toBe('Test content');

    const submitButton = screen.getByRole('button', { name: /post/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(titleInput.value).toBe('');
      expect(contentInput.value).toBe('');
    });
  });

  it('should show loading state while submitting', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ post: { id: 'new-post-1' } }),
              }),
            100
          )
        )
    );

    render(<PostComposer userRole="PARENT" />);

    const contentInput = screen.getByRole('textbox', { name: /content/i });
    await user.type(contentInput, 'Test content');

    const submitButton = screen.getByRole('button', { name: /post/i });
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText(/posting/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByText(/posting/i)).not.toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to create post' }),
    });

    render(<PostComposer userRole="PARENT" />);

    const contentInput = screen.getByRole('textbox', { name: /content/i });
    await user.type(contentInput, 'Test content');

    const submitButton = screen.getByRole('button', { name: /post/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to create post/i)).toBeInTheDocument();
    });
  });

  it('should allow canceling the form', async () => {
    const user = userEvent.setup();
    const mockOnCancel = jest.fn();

    render(<PostComposer userRole="PARENT" onCancel={mockOnCancel} />);

    const contentInput = screen.getByRole('textbox', { name: /content/i });
    await user.type(contentInput, 'Test content');

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should show success message after posting', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        post: { id: 'new-post-1' },
        message: 'Post created successfully',
      }),
    });

    render(<PostComposer userRole="PARENT" />);

    const contentInput = screen.getByRole('textbox', { name: /content/i });
    await user.type(contentInput, 'Test content');

    const submitButton = screen.getByRole('button', { name: /post/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/post created successfully/i)).toBeInTheDocument();
    });
  });

  it('should reset type to NOTE after submission', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ post: { id: 'new-post-1' } }),
    });

    render(<PostComposer userRole="PARENT" />);

    const typeSelect = screen.getByRole('combobox', { name: /post type/i }) as HTMLSelectElement;
    await user.selectOptions(typeSelect, 'ANNOUNCEMENT');

    expect(typeSelect.value).toBe('ANNOUNCEMENT');

    const contentInput = screen.getByRole('textbox', { name: /content/i });
    await user.type(contentInput, 'Test content');

    const submitButton = screen.getByRole('button', { name: /post/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(typeSelect.value).toBe('NOTE');
    });
  });
});
