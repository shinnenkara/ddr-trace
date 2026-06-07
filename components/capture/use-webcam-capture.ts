import { useRef } from "react";
import Webcam from "react-webcam";

export function useWebcamCapture() {
  const webcamRef = useRef<Webcam>(null);

  const capture = () => {
    return webcamRef.current?.getScreenshot();
  };

  return { webcamRef, capture };
}
