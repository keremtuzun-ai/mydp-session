import Link from "next/link";

export function PermissionDenied({ message = "You don't have the permission to access the requested resource." }: { message?: string }) {
  return (
    <div className="error-card">
      <h1>403</h1>
      <p className="m-0">{message}</p>
      <p className="mt-3">
        <Link href="/dashboard" className="prose-link">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
