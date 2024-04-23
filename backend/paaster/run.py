import uvicorn

from app.main import app


def main() -> None:
    uvicorn.run(app)
