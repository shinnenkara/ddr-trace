import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import type { ChartType, PlayerSide } from "@/lib/ddr-match/ai-results-schema";
import { cn } from "@/lib/utils";

type Props = {
  chartType: ChartType;
  onChartTypeChange: (value: ChartType) => void;
  playerSide: PlayerSide;
  onPlayerSideChange: (value: PlayerSide) => void;
  hint: string;
  onHintChange: (value: string) => void;
};

const selectClassName = cn(
  "h-7 w-full rounded-md border border-input bg-input/20 px-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 md:text-xs/relaxed dark:bg-input/30",
);

export function DdrCaptureForm({
  chartType,
  onChartTypeChange,
  playerSide,
  onPlayerSideChange,
  hint,
  onHintChange,
}: Props) {
  const dict = useDictionary();
  const maxLength = 200;

  return (
    <div className="grid w-full gap-4">
      <div className="grid w-full gap-2">
        <Label htmlFor="chart_type">{dict.logPlay.photo.chartType}</Label>
        <select
          id="chart_type"
          value={chartType}
          onChange={(event) =>
            onChartTypeChange(event.target.value as ChartType)
          }
          className={selectClassName}
        >
          <option value="single">{dict.songs.type.single}</option>
          <option value="double">{dict.songs.type.double}</option>
        </select>
      </div>
      <div className="grid w-full gap-2">
        <Label htmlFor="player_side">{dict.logPlay.photo.playerSide}</Label>
        <select
          id="player_side"
          value={playerSide}
          onChange={(event) =>
            onPlayerSideChange(event.target.value as PlayerSide)
          }
          className={selectClassName}
        >
          <option value="auto">{dict.logPlay.photo.playerSideAuto}</option>
          <option value="left">{dict.logPlay.photo.playerSideLeft}</option>
          <option value="right">{dict.logPlay.photo.playerSideRight}</option>
        </select>
        <p className="text-xs text-muted-foreground">
          {dict.logPlay.photo.playerSideHelp}
        </p>
      </div>
      <div className="grid w-full gap-2">
        <Label htmlFor="hint">{dict.logPlay.photo.hint}</Label>
        <Textarea
          placeholder={dict.logPlay.photo.hintPlaceholder}
          id="hint"
          value={hint}
          onChange={(event) => onHintChange(event.target.value)}
          maxLength={maxLength}
        />
      </div>
    </div>
  );
}
