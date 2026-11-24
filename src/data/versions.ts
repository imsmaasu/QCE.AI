export interface VersionItem {
  version: string;
  label: string;
  status: 'past' | 'present' | 'future';
  date: string;
  summary: string;
  features: string[];
}

export const VERSIONS: VersionItem[] = [
  // PAST
  {
    version: 'v0.1',
    label: 'Foundation',
    status: 'past',
    date: 'Oct 2026',
    summary: 'BBS Calculation Engine',
    features: [
      'Pure deterministic math engine for Footing, Column and Beam',
      "Sir Shahrukh's Excel formulas implemented verbatim",
      'Golden test suite with 195.654 kg verified output',
      'Formula working-steps breakdown for every row',
      'Landscape Letter PDF export matching BBS template',
    ],
  },
  {
    version: 'v0.2',
    label: 'Components',
    status: 'past',
    date: 'Oct 2026',
    summary: 'Multi-Instance Cards & Live Cost',
    features: [
      'Multi-instance project tree (F1, C1, B1, Rates)',
      'Live weight badges and cost calculation',
      'Row-level parameter overrides with reset',
      'Autosave to localStorage, JSON export and import',
      'Soft neutral design system with Light and Dark themes',
    ],
  },
  {
    version: 'v0.3',
    label: 'Drawings',
    status: 'past',
    date: 'Nov 2026',
    summary: '2D Engineering Drawings',
    features: [
      'Shared 3D parametric geometry layer in /src/geometry',
      'Orthographic projections: Section, Plan, Elevation',
      'Textbook and Color drawing styles',
      'Bi-directional highlight between drawing and BBS rows',
      'Proportional line weights based on text cap height H',
    ],
  },
  // PRESENT
  {
    version: 'v0.4',
    label: 'Polish',
    status: 'present',
    date: 'Nov 2026',
    summary: 'Drawing Fixes & Site View',
    features: [
      'Three styles: Textbook (1-rep), Simple (all bars), Color',
      'Site Working Drawing with bar mark tags and title block',
      'Per-view Labels ON/OFF toggle',
      'Collision-free annotation layout engine',
      'U-bar highlight fix and cover validation limits',
      'Export drawing section as PNG image & A3 PDF',
      'Version History page (you are here)',
    ],
  },
  // FUTURE
  {
    version: 'v0.5',
    label: 'Imagine 3D',
    status: 'future',
    date: 'Coming Soon',
    summary: 'Interactive 3D Rebar Viewer',
    features: [
      'Lazy-loaded React Three Fiber 3D canvas',
      'Full rebar cage visualization from shared geometry',
      'Orbit, pan and zoom with preset views (ISO, Top, Front)',
      'Rebar inspection tags on hover',
    ],
  },
  {
    version: 'v0.6',
    label: 'Components+',
    status: 'future',
    date: 'Coming Soon',
    summary: 'All RC Components & Quantities',
    features: [
      'Plinth Beam, One-Way Slab, Two-Way Slab BBS',
      'Staircase, Retaining Wall, Lintel BBS',
      'Block Masonry quantity calculation',
      'Earthwork, Lean Concrete and RCC quantities',
      'Expanded cost schedule with material rates',
    ],
  },
  {
    version: 'v0.7',
    label: 'Live Data',
    status: 'future',
    date: 'Coming Soon',
    summary: 'Live Market Rates',
    features: [
      'Real-time steel, cement and aggregate rates (Karachi market)',
      'Rate history chart with trend indicators',
      'Automatic cost recalculation when rates update',
      'Manual override with custom project rates',
    ],
  },
  {
    version: 'v1.0',
    label: 'AI',
    status: 'future',
    date: 'Coming Soon',
    summary: 'AI Drawing OCR & Chatbot',
    features: [
      'Upload structural drawing image — AI extracts member sizes and bar marks',
      'Side-by-side verification panel before calculation',
      'Upload & Solve: paste any quantity problem, AI sets up inputs',
      'Chatbot assistant for Cost and Estimation course queries',
      'Gemini Vision powered — AI extracts only, deterministic code calculates',
    ],
  },
];
