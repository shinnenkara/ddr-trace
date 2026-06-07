import { CameraDialog } from "@/components/capture/camera-dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DrawerFooter } from "@/components/ui/drawer";
import { useWebcamCapture } from "@/components/capture/use-webcam-capture";
import { useDictionary } from "@/lib/i18n/dictionary-provider";

type Props = {
  onCapture: (captureSrc: string) => void;
  onFilesSelected: (files: File[]) => void;
};

export function CaptureState({ onCapture, onFilesSelected }: Props) {
  const dict = useDictionary();
  const { webcamRef, capture } = useWebcamCapture();
  const [isLoading, setIsLoading] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    onFilesSelected(files);
    e.target.value = "";
  };

  const handleCapture = () => {
    const screenshot = capture();
    if (!screenshot) {
      console.error("Unexpected Error: no image captured");
      return;
    }

    onCapture(screenshot);
  };

  return (
    <>
      <CameraDialog ref={webcamRef} onLoad={() => setIsLoading(false)} />
      <DrawerFooter className="grid grid-cols-2 gap-4 pb-0">
        <Button variant="outline" asChild>
          <label className="cursor-pointer">
            {dict.logPlay.photo.selectFiles}
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
          </label>
        </Button>
        <Button onClick={handleCapture} disabled={isLoading}>
          {dict.logPlay.photo.capture}
        </Button>
      </DrawerFooter>
    </>
  );
}
