# AI-Powered Automated Dashboard Generation System

Automatically generates interactive analytics dashboards from any uploaded CSV/Excel dataset,
using pandas/scikit-learn for statistical analysis and an LLM for natural-language insights.
No dashboard type is hardcoded — a sales dataset produces a Sales Analytics Dashboard, an HR
dataset produces an HR Analytics Dashboard, a student dataset produces a Student Performance
Dashboard, purely from what the pipeline detects.

## Pipeline

```
Raw Dataset -> Ingestion -> Profiling -> Automatic Cleaning -> ML Pattern Analysis
            -> Insight + Summary Generation -> Chart Recommendation -> Layout Generation
            -> Dashboard JSON -> React UI
```

The cleaning stage (`services/cleaning.py`) runs right after profiling and before any
analysis: it fixes formatting issues (currency/percent-formatted text coerced to numbers,
inconsistent text casing/whitespace normalized), drops exact duplicate rows, and imputes
missing values in a type-aware way (median for numeric columns, mode for categorical —
IDs, free text, and dates are never fabricated). Every fix is recorded in a `CleaningReport`
that's stored with the dataset and shown in the UI, so cleaning is never a silent black box.
The cleaned data is what every later stage (ML analysis, chart selection, dashboard) works on.

## Stack

- **Frontend**: React + TypeScript + Vite, Tailwind CSS, Recharts, Axios, React Router
- **Backend**: FastAPI, SQLAlchemy, Pydantic, Uvicorn
- **ML/Analysis**: pandas, NumPy, SciPy, scikit-learn (Isolation Forest, K-Means, correlation, linregress)
- **AI layer**: OpenAI-compatible chat completions API (swappable via `.env`), with a deterministic
  template fallback when no LLM key is configured — numbers always come from the Python analysis,
  never from the LLM.
- **Database**: PostgreSQL via SQLAlchemy ORM
- **Auth**: JWT (register/login/logout, optional — upload & dashboard generation work anonymously too)

## Project Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, startup, error handling
│   ├── config.py                # Settings (env-driven)
│   ├── database/session.py      # SQLAlchemy engine/session
│   ├── models/models.py         # User, Dataset, AnalysisResult, Dashboard
│   ├── schemas/schemas.py       # Pydantic request/response models
│   ├── api/
│   │   ├── auth.py              # /api/auth/*
│   │   ├── datasets.py          # /api/upload, /api/datasets/*, /api/analyze
│   │   └── dashboards.py        # /api/generate-dashboard, /api/dashboards/*
│   ├── services/
│   │   ├── data_processor.py    # Ingestion: CSV/XLSX parsing & validation
│   │   ├── profiler.py          # Automatic data understanding
│   │   ├── cleaning.py          # Automatic cleaning: missing values, duplicates, formatting
│   │   ├── ml_analyzer.py       # Correlation / anomaly / trend / clustering
│   │   ├── insight_engine.py    # LLM + template natural-language insights + plain-language summary
│   │   ├── chart_selector.py    # Visualization recommendation engine
│   │   └── dashboard_generator.py  # KPIs, filters, layout, final JSON config
│   └── utils/                   # security.py (JWT/bcrypt), deps.py (auth deps)
├── sample_data/sales_sample.csv
└── requirements.txt

frontend/
├── src/
│   ├── pages/            # Landing, Login, Register, Analysis, Dashboard, DatasetDetails, MyDatasets
│   ├── dashboards/        # DashboardLayout.tsx (renders backend layout[] blocks)
│   ├── charts/            # ChartRenderer.tsx (Recharts: line/bar/pie/scatter/histogram/heatmap)
│   ├── components/        # KPICard, InsightsPanel, FilterBar, Navbar, ProtectedRoute, ErrorBoundary
│   ├── hooks/             # AuthContext.tsx + useAuth.ts (JWT-backed auth state)
│   ├── services/api.ts    # Axios client
│   └── types/index.ts     # TypeScript types mirroring backend schemas
```

## Running Locally

### Option A — Docker Compose (recommended)

```bash
cp backend/.env.example backend/.env
# Optionally edit backend/.env to add an LLM_API_KEY and set LLM_ENABLED=true
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API docs (Swagger): http://localhost:8000/docs

### Option B — Manual

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Point DATABASE_URL at a running Postgres instance (or use `docker run -p 5432:5432 postgres:16-alpine`)
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Key API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/upload` | Upload a CSV/XLSX dataset |
| POST | `/api/upload/sample` | Load the bundled sample dataset |
| POST | `/api/analyze?dataset_id=` | Run ML pattern analysis |
| POST | `/api/recommend-charts?dataset_id=` | Get ranked chart recommendations |
| POST | `/api/generate-insights?dataset_id=` | Get AI natural-language insights |
| POST | `/api/generate-dashboard?dataset_id=` | Generate & persist a full dashboard |
| GET | `/api/dashboards/{id}` | Fetch a saved dashboard config |
| POST | `/api/dashboards/{id}/regenerate` | Re-run the pipeline for a dashboard |
| GET | `/api/datasets` / `/api/datasets/{id}` | List / inspect datasets |
| DELETE | `/api/datasets/{id}` | Delete a dataset |
| POST | `/api/auth/register` \| `/login` \| `/logout` | JWT auth |

## Authentication

- Register/login/logout are implemented end-to-end: backend JWT issuance (`/api/auth/*`) plus
  frontend `Login.tsx` / `Register.tsx` pages and an `AuthContext` that persists the token in
  `localStorage` and attaches it to every API request via an Axios interceptor.
- `/datasets` ("My Datasets") is a **protected route** — `ProtectedRoute.tsx` redirects
  unauthenticated visitors to `/login` and returns them to the page they wanted afterward.
- Uploading a dataset and generating a dashboard work anonymously too (per the "Try Sample
  Dataset" frictionless-demo requirement); logging in additionally associates uploads with the
  user's account (`owner_id`) so they show up under "My Datasets".

## Database Migrations

Alembic is scaffolded under `backend/migrations/` (`env.py` reads `DATABASE_URL` from
`app.config.settings`, so no separate config is needed). Generate and apply migrations with:

```bash
cd backend
alembic revision --autogenerate -m "init"
alembic upgrade head
```

`main.py`'s `Base.metadata.create_all()` on startup is a convenience for local development only;
use Alembic migrations for anything resembling production.

## Design Notes

- **The frontend never hardcodes chart types per dataset.** `DashboardLayout.tsx` walks the
  backend's `layout[]` array and renders whatever KPI/chart/insight/filter blocks it references.
  Swap in a different dataset and the same frontend code renders a structurally different dashboard.
- **LLM never invents numbers.** `ml_analyzer.py` computes every statistic; `insight_engine.py`
  only rephrases pre-computed facts into sentences, with a strict system prompt and a JSON-array
  response format. If no LLM key is set, deterministic templates produce equivalent phrasing.
- **Domain detection** (`profiler.py::_infer_domain`) is a simple keyword-based classifier over
  column names (sales/hr/student/finance/marketing/healthcare); swap in an ML/embedding classifier
  for more robust detection if needed.
- **Chart de-duplication**: `chart_selector.py` ranks all candidate charts by an importance score
  and drops duplicate (type, x, y) combinations, so the dashboard shows a curated top-N rather than
  every possible chart.

## Testing

An automated pytest suite lives in `backend/tests/` and covers the service layer end-to-end:
column-type/domain detection, correlation/anomaly/trend/cluster detection, chart ranking &
de-duplication, insight generation, and dashboard-config validity (JSON-serializable, all
`layout[].refs` resolvable, domain-specific titles, etc.) across a synthetic sales dataset, a
synthetic student dataset, and a small "messy" low-signal dataset (missing values, duplicates,
a single numeric column, no dates).

```bash
cd backend
pip install -r requirements-dev.txt
pytest -v
```

**Verification status**: all 22 tests pass when executed directly against this service code (the
pipeline was run end-to-end during development, which also caught and fixed a real pandas-3.x
compatibility bug in date-column detection, and a test-fixture bug where injected outliers were
diluting an intentionally engineered correlation below its detection threshold). The
FastAPI/SQLAlchemy/React layers were built to the same interfaces but could not be executed live
in the environment that produced this code (no network access to install `fastapi`, `sqlalchemy`,
or npm packages) — install the pinned dependencies in `requirements.txt` / `package.json` to run
the full stack and API-level tests.

## Database Migrations

Alembic is scaffolded in `backend/alembic/`. After setting `DATABASE_URL` in `.env`:

```bash
cd backend
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

(`app.main` also calls `Base.metadata.create_all()` on startup for convenience in development —
switch to Alembic-only schema management for production.)

## Deployment

- **Frontend** → Vercel / Netlify (build with `npm run build`, deploy `dist/`)
- **Backend** → Render / Railway / AWS (use the provided `Dockerfile`)
- **Database** → Supabase / Neon / AWS RDS (set `DATABASE_URL` accordingly)
- **File storage** → swap `STORAGE_BACKEND` to `s3` or `cloudinary` and extend
  `data_processor.py`'s save/load functions accordingly; local disk storage is used by default.
