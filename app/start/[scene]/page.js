import Start from '../Start';
import { ProgressProvider } from '../../lib/progress';
import { SCENES, DEFAULT_SCENE } from '../../lib/scenes';

export const metadata = { title: 'Your first Thai · Soi Talk' };
export const generateStaticParams = () => Object.keys(SCENES).map((scene) => ({ scene }));

// One first session per ad: soitalk.app/start/7eleven, later /start/taxi, ...
export default function ScenePage({ params }) {
  const scene = SCENES[params.scene] || SCENES[DEFAULT_SCENE];
  return (
    <ProgressProvider>
      <Start sceneId={scene.id} />
    </ProgressProvider>
  );
}
