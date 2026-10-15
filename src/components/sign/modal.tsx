"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SiGithub, SiGoogle } from "react-icons/si";

import { Button } from "@/components/ui/button";
import EmailAuthForm from "@/components/sign/email-form";
import { cn } from "@/lib/utils";
import { signIn } from "next-auth/react";
import { useAppContext } from "@/contexts/app";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTranslations } from "next-intl";
import { authEvents } from "@/lib/analytics";

type AuthMode = "sign-in" | "sign-up" | "forgot";

export default function SignModal() {
  const t = useTranslations();
  const { showSignModal, setShowSignModal } = useAppContext();
  const [authMode, setAuthMode] = React.useState<AuthMode>("sign-in");

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const title =
    authMode === "sign-up"
      ? t("sign_modal.sign_up_title")
      : authMode === "forgot"
        ? t("sign_modal.reset_password")
        : t("sign_modal.sign_in_title");
  const description =
    authMode === "sign-up"
      ? t("sign_modal.sign_up_description")
      : authMode === "forgot"
        ? t("sign_modal.forgot_description")
        : t("sign_modal.sign_in_description");

  function handleOpenChange(next: boolean) {
    setShowSignModal(next);
    if (!next) setAuthMode("sign-in");
  }

  if (isDesktop) {
    return (
      <Dialog open={showSignModal} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <ProfileForm open={showSignModal} mode={authMode} onModeChange={setAuthMode} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={showSignModal} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[92vh] overflow-y-auto">
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <ProfileForm className="px-4" open={showSignModal} mode={authMode} onModeChange={setAuthMode} />
        <DrawerFooter className="pt-4">
          <DrawerClose asChild>
            <Button variant="outline">{t("sign_modal.cancel_title")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function ProfileForm({
  className,
  open,
  mode,
  onModeChange,
}: React.ComponentProps<"form"> & {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}) {
  const t = useTranslations();
  const [providers, setProviders] = React.useState<Record<string, any> | null>(null);

  // 动态获取可用的 providers
  React.useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data) => {
        setProviders(data);
      })
      .catch((err) => {
        console.error("Failed to fetch providers:", err);
      });
  }, []);

  const showOAuth = mode !== "forgot" && Boolean(providers?.google || providers?.github);

  return (
    <div className={cn("grid items-start gap-4", className)}>
      {mode !== "forgot" && providers?.google && (
        <Button
          className="h-10 w-full bg-white text-neutral-950 hover:bg-neutral-100 hover:text-neutral-950"
          onClick={() => {
            authEvents.signInStarted("google");
            signIn("google");
          }}
        >
          <SiGoogle className="w-4 h-4" />
          {t("sign_modal.google_sign_in")}
        </Button>
      )}

      {mode !== "forgot" && providers?.github && (
        <Button
          variant="outline"
          className="h-10 w-full"
          onClick={() => {
            authEvents.signInStarted("github");
            signIn("github");
          }}
        >
          <SiGithub className="w-4 h-4" />
          {t("sign_modal.github_sign_in")}
        </Button>
      )}

      {showOAuth ? (
        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span className="relative z-10 bg-background px-2 text-muted-foreground">
            {t("sign_modal.or")}
          </span>
        </div>
      ) : null}

      <EmailAuthForm
        key={open ? "open" : "closed"}
        onSignedIn={() => window.location.reload()}
        onModeChange={onModeChange}
      />
    </div>
  );
}
