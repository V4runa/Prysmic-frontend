import { Shot } from "./Shot";
import { LoopClip } from "./LoopClip";
import { moduleMap } from "../modules";

const frame =
  "overflow-hidden rounded-2xl border border-white/12 shadow-[0_28px_70px_-36px_rgba(0,0,0,0.85)]";

/**
 * The calendar is the plate. A note, a contract, and a mood sit on it,
 * slightly turned, so the hero reads as rooms arriving in one place.
 * The plate is a loop; its poster is painted even when the video is not.
 */
export function HeroStage() {
  const clip = moduleMap.calendar.clip;
  if (!clip) return null;

  return (
    <figure className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div className="relative aspect-[4/5] sm:aspect-[5/4]">
        <div className={`absolute inset-x-[6%] top-[8%] bottom-[14%] ${frame} rotate-[-2deg]`}>
          <div className="relative h-full">
            <LoopClip
              clip={clip}
              priority
              sizes="(min-width: 1024px) 560px, 90vw"
            />
          </div>
        </div>

        <div className={`absolute left-0 top-[6%] w-[48%] sm:w-[42%] ${frame} rotate-[3.5deg]`}>
          <Shot
            src="/marketing/note.webp"
            alt=""
            sizes="240px"
            className="aspect-[16/11]"
          />
        </div>

        <div className={`absolute bottom-[4%] right-0 w-[46%] sm:w-[40%] ${frame} rotate-[-3deg]`}>
          <Shot
            src="/marketing/habits.webp"
            alt=""
            sizes="240px"
            className="aspect-[16/10]"
          />
        </div>

        <div className={`absolute bottom-[18%] left-[6%] w-[34%] sm:w-[28%] ${frame} rotate-[2deg]`}>
          <Shot
            src="/marketing/moods-palette.webp"
            alt=""
            sizes="180px"
            className="aspect-[16/11]"
          />
        </div>
      </div>
      <figcaption className="mt-4 text-sm leading-relaxed text-slate-400">
        A calendar from the fictional workspace folio, with a note, a contract, and a mood laid over it. Sample entries, not a person.
      </figcaption>
    </figure>
  );
}
