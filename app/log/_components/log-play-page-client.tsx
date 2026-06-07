"use client";

import { useState } from "react";
import { ManualPlayForm } from "@/components/log-play/manual-play-form";
import { PhotoUploadDrawer } from "@/components/log-play/photo-upload-drawer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDictionary } from "@/lib/i18n/dictionary-provider";

export function LogPlayPageClient() {
  const dict = useDictionary();
  const [showPhotoDrawer, setShowPhotoDrawer] = useState(false);

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {dict.logPlay.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dict.logPlay.description}
        </p>
      </div>

      <Tabs defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">{dict.logPlay.tabs.manual}</TabsTrigger>
          <TabsTrigger value="photo">{dict.logPlay.tabs.photo}</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{dict.logPlay.manual.title}</CardTitle>
              <CardDescription>{dict.logPlay.manual.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ManualPlayForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photo" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{dict.logPlay.photo.title}</CardTitle>
              <CardDescription>{dict.logPlay.photo.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowPhotoDrawer(true)}>
                {dict.logPlay.photo.openCamera}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showPhotoDrawer && (
        <PhotoUploadDrawer onClose={() => setShowPhotoDrawer(false)} />
      )}
    </div>
  );
}
