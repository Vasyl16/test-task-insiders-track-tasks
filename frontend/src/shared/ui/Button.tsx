import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "ghost" | "logout" | "nav";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const baseClasses = "font-body disabled:cursor-not-allowed";

const variantClasses: Record<ButtonVariant, string> = {
  // Brass fill reads clearly on both the paper cards (modals, forms) and
  // the dark desk canvas (page-level "New workspace"/"New project" actions)
  // — an ink-on-ink fill disappeared against the desk background.
  primary: "rounded-lg bg-brass px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-brass-deep disabled:opacity-50 disabled:hover:bg-brass",
  ghost: "rounded-lg px-3 py-2 text-sm text-ink/60 transition-colors hover:text-ink",
  logout: "rounded-lg px-3 py-1.5 text-sm font-medium text-oxblood transition-colors hover:bg-oxblood/10",
  // Quiet text action on a dark (desk-navy) surface — the header, not cards/modals.
  // Also used for pager Previous/Next, which is why it needs its own visible
  // disabled state (unlike ghost/logout, never used with `disabled` today).
  nav: "rounded-lg px-3 py-2 text-sm text-fog transition-colors hover:text-brass-light disabled:opacity-30 disabled:hover:text-fog",
};

export function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
