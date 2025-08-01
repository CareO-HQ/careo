"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import LoginForm from "./forms/LoginForm";
import SignupForm from "./forms/SignupForm";
import { useQueryState } from "nuqs";

interface AuthCardProps {
  action: "login" | "signup";
  google?: boolean;
  microsoft?: boolean;
}

export default function AuthCard({
  action,
  google = false,
  microsoft = false
}: AuthCardProps) {
  const isLogin = action === "login";
  const [token] = useQueryState("token");

  return (
    <>
      <div className="flex items-center gap-2">
        <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
        <p className="font-semibold">Acme Inc.</p>
      </div>
      <Card className="w-full max-w-sm my-4">
        <CardHeader>
          <CardTitle>
            {isLogin ? "Login to your account" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your email below to login to your account"
              : "Please fill in the details to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLogin ? <LoginForm /> : <SignupForm />}
          {(google || microsoft) && (
            <div className="flex items-center justify-center gap-2 my-4">
              <Separator className="flex-1 bg-muted-foreground/20" />
              <span className="text-sm text-muted-foreground">
                Or continue with
              </span>
              <Separator className="flex-1 bg-muted-foreground/20" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            {google && (
              <Button variant="outline" className="w-full">
                <img src="/google.svg" alt="Google" className="w-4 h-4" />
                Google
              </Button>
            )}
            {microsoft && (
              <Button variant="outline" className="w-full">
                <img src="/microsoft.svg" alt="Microsoft" className="w-4 h-4" />
                Microsoft
              </Button>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col justify-start gap-2 flex items-center">
          <Link
            href={
              isLogin
                ? token
                  ? `/signup?token=${token}`
                  : "/signup"
                : token
                  ? `/login?token=${token}`
                  : "/login"
            }
            className="text-sm text-muted-foreground group transition-all"
          >
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span className="text-primary group-hover:underline">
              {isLogin ? "Register" : "Login"}
            </span>
          </Link>
        </CardFooter>
      </Card>
      <p className="text-xs text-muted-foreground max-w-xs text-center">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="text-primary hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </>
  );
}
