export interface FormErrorProps {
  message?: string
}

export function FormError({ message }: FormErrorProps) {
  if (!message) {
    return null
  }
  return <p className="font-body text-sm text-oxblood">{message}</p>
}
