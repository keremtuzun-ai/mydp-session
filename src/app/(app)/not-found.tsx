import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That page does not exist, or you do not have access to it.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
