# Master Agent - AI Executive Producer

FastAPI microservice for autonomous content production.

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini API key
- `REDIS_URL` - Redis connection string

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/producer/start` | POST | Start new batch |
| `/producer/batch/{id}` | GET | Get batch status |
| `/producer/approve-headlines` | POST | Approve headlines |
| `/producer/approve-scripts` | POST | Approve scripts |
