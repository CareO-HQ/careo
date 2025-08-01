import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import NewPasswordForm from "./forms/NewPasswordForm";

export default function NewPasswordCard() {
  return (
    <>
      <div className="flex items-center gap-2">
        <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
        <p className="font-semibold">Acme Inc.</p>
      </div>
      <Card className="w-full max-w-sm my-4">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Use the form below to change your password. This request will expire
            in about 15 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewPasswordForm />
        </CardContent>
      </Card>
    </>
  );
}
