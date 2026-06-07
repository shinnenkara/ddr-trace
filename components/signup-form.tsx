"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { signUp } from "@/lib/auth-client";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function renderLegalText(template: string, terms: string, privacy: string) {
  const parts = template.split(/(\{terms\}|\{privacy\})/);
  return parts.map((part, index) => {
    if (part === "{terms}") {
      return (
        <a key={index} href="#">
          {terms}
        </a>
      );
    }
    if (part === "{privacy}") {
      return (
        <a key={index} href="#">
          {privacy}
        </a>
      );
    }
    return part;
  });
}

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const dict = useDictionary();
  const t = dict.auth.signup;
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name"));
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    setLoading(true);
    const { error } = await signUp.email({
      name,
      email,
      password,
      callbackURL: "/",
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || t.error);
      return;
    }

    toast.success(t.success);
    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">{t.name}</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">{t.email}</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">{t.password}</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <FieldDescription>{t.passwordHint}</FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? t.submitting : t.submit}
                </Button>
                <FieldDescription className="text-center">
                  {t.hasAccount} <Link href="/login">{t.signInLink}</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        {renderLegalText(t.legal, t.terms, t.privacy)}
      </FieldDescription>
    </div>
  );
}
