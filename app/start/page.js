import Start from './Start';
import { ProgressProvider } from '../lib/progress';
import { DEFAULT_SCENE } from '../lib/scenes';

export const metadata = { title: 'Your first Thai · Soi Talk' };

// soitalk.app/start: the default first session (ads link to /start/<scene>)
export default function StartPage() {
  return (
    <ProgressProvider>
      <Start sceneId={DEFAULT_SCENE} />
    </ProgressProvider>
  );
}
