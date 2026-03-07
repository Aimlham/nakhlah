import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background">
      <div className="text-center space-y-4 max-w-sm">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto">
          <AlertCircle className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-404-title">Page Not Found</h1>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild>
          <Link href="/" data-testid="link-go-home">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
