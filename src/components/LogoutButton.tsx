import { useState } from "react";
import { Button } from "./ui/button.tsx";

export interface LogoutButtonProps {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
}

/**
 * Logout button component that calls the logout API endpoint
 * Redirects to /login on successful logout
 */
export const LogoutButton = ({ variant = "ghost", size = "sm", className }: LogoutButtonProps) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Redirect to login page after successful logout
        window.location.href = "/login";
      } else {
        // Log error but still attempt to redirect
        // eslint-disable-next-line no-console
        console.error("Logout failed:", response.statusText);
        window.location.href = "/login";
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Logout error:", error);
      // Even on error, redirect to login page
      window.location.href = "/login";
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={isLoggingOut}
      variant={variant}
      size={size}
      className={className}
      aria-label={isLoggingOut ? "Logging out" : "Log out"}
    >
      <svg
        className={`size-4 ${isLoggingOut ? "animate-spin" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        {isLoggingOut ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        )}
      </svg>
      <span className="ml-2">{isLoggingOut ? "Logging out..." : "Log out"}</span>
    </Button>
  );
};
