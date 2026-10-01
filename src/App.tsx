import { createBrowserRouter, RouterProvider, useSearchParams } from 'react-router';
import ConjugationMode from './screens/ConjugationMode.tsx';
import GenderDrill from './screens/GenderDrill.tsx';
import Home from './screens/Home.tsx';
import InterrogativeDrill from './screens/InterrogativeDrill.tsx';
import NumbersMode from './screens/NumbersMode.tsx';
import PossessiveDrill from './screens/PossessiveDrill.tsx';
import PrepositionDrill from './screens/PrepositionDrill.tsx';
import Reference from './screens/Reference.tsx';
import ReferenceCardView from './screens/ReferenceCardView.tsx';
import Settings from './screens/Settings.tsx';

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
 * Route element for the possessive drill. A `?seed=` query param pins a
 * deterministic session (used by the deterministic e2e); without it the screen
 * rolls a fresh seed per visit.
 */
function PossessiveRoute() {
  const [params] = useSearchParams();
  const seed = params.get('seed') ?? undefined;
  return <PossessiveDrill seed={seed} />;
}

/**
 * Route element for the interrogative drill. A `?seed=` query param pins a
 * deterministic session (used by the deterministic e2e); without it the screen
 * rolls a fresh seed per visit.
 */
function InterrogativeRoute() {
  const [params] = useSearchParams();
  const seed = params.get('seed') ?? undefined;
  return <InterrogativeDrill seed={seed} />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
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
    path: '/drill/possessive',
    element: <PossessiveRoute />,
  },
  {
    path: '/drill/interrogative',
    element: <InterrogativeRoute />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
