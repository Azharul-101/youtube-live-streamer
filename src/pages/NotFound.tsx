import { Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <PageMeta title="Page Not Found" description="" />
      <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          404
        </h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          The page may have been deleted or does not exist. Please check the URL is correct.
        </p>
        <Button asChild variant="outline">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </>
  );
}
