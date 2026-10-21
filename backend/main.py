import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.api import SIM, TICK_HZ, router


@asynccontextmanager
async def lifespan(_: FastAPI):
    async def ticker():
        # Real-time clock for the simulation. Positions depend only on the tick count, so this only sets the pace.
        while True:
            await asyncio.sleep(1 / (TICK_HZ * SIM.speed))
            if SIM.running:
                SIM.step()

    task = asyncio.create_task(ticker())
    yield
    task.cancel()


app = FastAPI(title="GeoWild API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
