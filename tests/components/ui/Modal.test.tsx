import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Modal, ConfirmModal, AlertModal } from '@/components/ui/Modal'

describe('Modal', () => {
  it('should not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={jest.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>
    )

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>
    )

    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('should call onClose when backdrop is clicked', () => {
    const onClose = jest.fn()
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    )

    const backdrop = document.querySelector('.fixed.inset-0.bg-black')
    fireEvent.click(backdrop!)

    expect(onClose).toHaveBeenCalled()
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    )

    const closeButton = screen.getByLabelText('Close modal')
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('should not call onClose when modal content is clicked', () => {
    const onClose = jest.fn()
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    )

    const content = screen.getByText('Content')
    fireEvent.click(content)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('should apply correct size classes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal" size="sm">
        <p>Content</p>
      </Modal>
    )

    expect(document.querySelector('.max-w-md')).toBeInTheDocument()

    rerender(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal" size="lg">
        <p>Content</p>
      </Modal>
    )

    expect(document.querySelector('.max-w-2xl')).toBeInTheDocument()
  })

  it('should prevent body scroll when open', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>
    )

    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <Modal isOpen={false} onClose={jest.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>
    )

    expect(document.body.style.overflow).toBe('unset')
  })
})

describe('ConfirmModal', () => {
  it('should render confirmation modal', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm Action"
        message="Are you sure?"
      />
    )

    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should call onConfirm and onClose when confirm is clicked', () => {
    const onConfirm = jest.fn()
    const onClose = jest.fn()
    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Confirm Action"
        message="Are you sure?"
      />
    )

    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    expect(onConfirm).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('should call onClose when cancel is clicked', () => {
    const onClose = jest.fn()
    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={jest.fn()}
        title="Confirm Action"
        message="Are you sure?"
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('should use custom button text', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm Action"
        message="Are you sure?"
        confirmText="Delete"
        cancelText="Keep"
      />
    )

    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Keep')).toBeInTheDocument()
  })

  it('should apply correct color classes', () => {
    const { rerender } = render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm Action"
        message="Are you sure?"
        confirmColor="red"
      />
    )

    expect(screen.getByText('Confirm').closest('button')).toHaveClass('bg-red-600')

    rerender(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm Action"
        message="Are you sure?"
        confirmColor="green"
      />
    )

    expect(screen.getByText('Confirm').closest('button')).toHaveClass('bg-green-600')
  })
})

describe('AlertModal', () => {
  it('should render alert modal', () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={jest.fn()}
        title="Alert"
        message="This is an alert"
      />
    )

    expect(screen.getByText('Alert')).toBeInTheDocument()
    expect(screen.getByText('This is an alert')).toBeInTheDocument()
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('should render success type', () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={jest.fn()}
        title="Success"
        message="Operation successful"
        type="success"
      />
    )

    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('should render error type', () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={jest.fn()}
        title="Error"
        message="Operation failed"
        type="error"
      />
    )

    expect(screen.getByText('✕')).toBeInTheDocument()
  })

  it('should render warning type', () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={jest.fn()}
        title="Warning"
        message="Please be careful"
        type="warning"
      />
    )

    expect(screen.getByText('⚠')).toBeInTheDocument()
  })

  it('should call onClose when OK is clicked', () => {
    const onClose = jest.fn()
    render(
      <AlertModal
        isOpen={true}
        onClose={onClose}
        title="Alert"
        message="This is an alert"
      />
    )

    const okButton = screen.getByText('OK')
    fireEvent.click(okButton)

    expect(onClose).toHaveBeenCalled()
  })
})
