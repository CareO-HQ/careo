import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-dvh">
      <Link href="/login">
        <Button>Login</Button>
      </Link>
    </div>
  );
}
