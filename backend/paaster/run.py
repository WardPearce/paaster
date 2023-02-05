import uvicorn
from app.main import app


def main():
    uvicorn.run(app)
