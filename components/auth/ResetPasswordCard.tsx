import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import ResetPasswordForm from "./forms/ResetPasswordForm";

export default function ResetPasswordCard() {
  return (
    <>
      <div className="flex items-center gap-2">
        <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
        <p className="font-semibold">Acme Inc.</p>
      </div>
      <Card className="w-full max-w-sm my-4">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            We&apos;ll send you a link with instructions on how to reset your
            password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
        <CardFooter className="flex-col justify-start gap-2 flex items-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground group transition-all"
          >
            Remembered your password?
            <span className="text-primary group-hover:underline"> Login</span>
          </Link>
        </CardFooter>
      </Card>
    </>
  );
}
