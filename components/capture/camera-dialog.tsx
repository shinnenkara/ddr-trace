import Webcam from "react-webcam";
import { RefObject, useState } from "react";
import { useDictionary } from "@/lib/i18n/dictionary-provider";

const videoConstraints = {
  facingMode: "environment",
  width: 720,
  height: 720,
};

type Props = {
  ref: RefObject<Webcam | null>;
  onLoad: () => void;
};

export function CameraDialog({ ref, onLoad }: Props) {
  const dict = useDictionary();
  const [isLoading, setIsLoading] = useState(true);

  const handleUserMedia = () => {
    setIsLoading(false);
    onLoad();
  };

  const handleError = (err: string | DOMException) => {
    console.error("Webcam Error: ", err);
    setIsLoading(false);
    onLoad();
  };

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="aspect-square max-w-md">
        {isLoading && (
          <div className="flex h-[360px] w-[360px] items-center rounded-lg bg-muted">
            <span className="w-full p-10 text-center text-muted-foreground">
              {dict.logPlay.photo.loadingCamera}
            </span>
          </div>
        )}
        <Webcam
          ref={ref}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          className={`rounded-lg ${isLoading ? "h-0 opacity-0" : "opacity-100 transition-opacity duration-500 ease-in-out"}`}
          onUserMediaError={handleError}
          onUserMedia={handleUserMedia}
        />
      </div>
    </div>
  );
}
