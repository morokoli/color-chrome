import { MutableRefObject } from "react"

interface DeletionConfirmationModalProps {
  isOpen: boolean
  text: string
  onClose: () => void
  onConfirm: MutableRefObject<(() => void)>
}

export const DeletionConfirmationModal = ({
  isOpen,
  text,
  onClose,
  onConfirm,
}: DeletionConfirmationModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 m-6 rounded border flex flex-col justify-center items-center gap-4">
        <h2 className="text-xl mb-4 text-center">Deletion Confirmation</h2>
        <p className="text-center">{text}</p>
        <div className="flex gap-4">
          <button className="border p-1 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="border p-1 text-sm" onClick={() => onConfirm.current()}>
            Confirm
          </button> 
        </div>
      </div>
    </div>
  )
}
