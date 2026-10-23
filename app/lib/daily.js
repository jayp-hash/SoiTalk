// The daily lesson, in one place, so every screen agrees on whether today is done
// (ui-principles 12: one finish line a day). Used by Today and the Word library.
import { readStore, dayKey } from './progress';

// One new lesson a day, in order, after the first session
export const SCENE_DAYS = ['restaurant', 'cafe', 'stall', 'market', 'stuck', 'where', 'taxi', 'smalltalk', 'bargain'];

// The lesson is the day: done once today's first session or today's lesson is finished
export function lessonDoneToday(firstSession = readStore('tsc-first-session', null), scenesDone = readStore('tsc-scenes', {})) {
  return !!firstSession && (firstSession.day === dayKey() || Object.values(scenesDone).includes(dayKey()));
}

// The next lesson not done yet (null when all are done)
export const nextLessonId = (scenesDone = readStore('tsc-scenes', {})) => SCENE_DAYS.find((id) => !scenesDone[id]) || null;
