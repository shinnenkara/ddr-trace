"use client";

import { useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GlobeIcon } from "@hugeicons/core-free-icons";
import { setLocale } from "@/lib/i18n/actions";
import { type Locale, localeNames } from "@/lib/i18n/config";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  currentLocale: Locale;
};

export function LocaleSwitcher({ currentLocale }: Props) {
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (locale: Locale) => {
    startTransition(async () => {
      await setLocale(locale);
      window.location.reload();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          aria-label={dict.a11y.switchLanguage}
        >
          <HugeiconsIcon
            icon={GlobeIcon}
            className="size-4 text-muted-foreground"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(localeNames).map(([locale, name]) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLocaleChange(locale as Locale)}
            className={currentLocale === locale ? "bg-accent" : ""}
          >
            {name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
