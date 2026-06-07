import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDictionary } from "@/lib/i18n/dictionary-provider";

type Props = {
  hint: string;
  onHintChange: (value: string) => void;
};

export function DdrCaptureForm({ hint, onHintChange }: Props) {
  const dict = useDictionary();
  const maxLength = 200;

  return (
    <div className="grid w-full gap-2">
      <Label htmlFor="hint">{dict.logPlay.photo.hint}</Label>
      <Textarea
        placeholder={dict.logPlay.photo.hintPlaceholder}
        id="hint"
        value={hint}
        onChange={(e) => onHintChange(e.target.value)}
        maxLength={maxLength}
      />
    </div>
  );
}
