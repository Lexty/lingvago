import { createBrowserRouter, RouterProvider, useSearchParams } from 'react-router';
import ConjugationMode from './screens/ConjugationMode.tsx';
import GenderDrill from './screens/GenderDrill.tsx';
import MockExam from './screens/MockExam.tsx';
import NumbersMode from './screens/NumbersMode.tsx';
import PrepositionDrill from './screens/PrepositionDrill.tsx';
import Reference from './screens/Reference.tsx';
import ReferenceCardView from './screens/ReferenceCardView.tsx';
import Settings from './screens/Settings.tsx';
import SurvivalKit from './screens/SurvivalKit.tsx';

/**
 * Route element for the numbers drill. A `?seed=` query param pins a
 * deterministic session (used by the deterministic e2e); without it the screen
 * rolls a fresh seed per visit.
 */
function NumbersRoute() {
  const [params] = useSearchParams();
  const seed = params.get('seed') ?? undefined;
  return <NumbersMode seed={seed} />;
}

/**
 * Route element for the conjugation drill. A `?seed=` query param pins a
 * deterministic session (used by the deterministic e2e); without it the screen
 * rolls a fresh seed per visit.
 */
function ConjugationRoute() {
  const [params] = useSearchParams();
  const seed = params.get('seed') ?? undefined;
  return <ConjugationMode seed={seed} />;
}

/**
 * Route element for the gender/article drill. A `?seed=` query param pins a
 * deterministic session (used by the deterministic e2e); without it the screen
 * rolls a fresh seed per visit.
 */
function GenderRoute() {
  const [params] = useSearchParams();
  const seed = params.get('seed') ?? undefined;
  return <GenderDrill seed={seed} />;
}

/**
 * Route element for the preposition drill. A `?seed=` query param pins a
 * deterministic session (used by the deterministic e2e); without it the screen
 * rolls a fresh seed per visit.
 */
function PrepositionRoute() {
  const [params] = useSearchParams();
  const seed = params.get('seed') ?? undefined;
  return <PrepositionDrill seed={seed} />;
}

/**
 * Route element for the timed mock (PaperSimulation). A `?duration=` query param
 * (milliseconds) injects a SHORT run length so the deterministic e2e reaches the
 * entry phase without a real 90-minute wait; without it the real 90-min length
 * is used. A non-numeric/non-positive value is ignored (falls back to default).
 */
function MockRoute() {
  const [params] = useSearchParams();
  const raw = params.get('duration');
  const parsed = raw === null ? NaN : Number(raw);
  const durationMs =
    Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  return <MockExam durationMs={durationMs} />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <SurvivalKit />,
  },
  {
    path: '/settings',
    element: <Settings />,
  },
  {
    path: '/reference',
    element: <Reference />,
  },
  {
    path: '/reference/:id',
    element: <ReferenceCardView />,
  },
  {
    path: '/drill/numbers',
    element: <NumbersRoute />,
  },
  {
    path: '/drill/conjugation',
    element: <ConjugationRoute />,
  },
  {
    path: '/drill/gender',
    element: <GenderRoute />,
  },
  {
    path: '/drill/preposition',
    element: <PrepositionRoute />,
  },
  {
    path: '/mock',
    element: <MockRoute />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
