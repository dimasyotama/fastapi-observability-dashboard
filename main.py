from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager # Need this for lifespan
from pydantic import BaseModel
import uvicorn
import logging
# Import the instrumentator
from prometheus_fastapi_instrumentator import Instrumentator
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor # If using requests library
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter


resource = Resource(attributes={
    "service.name": "the-app" # Important for identifying your service in traces
})

otlp_exporter = OTLPSpanExporter(
    endpoint="otel-collector:4317", # Collector's gRPC endpoint
    insecure=True # Use insecure connection in this example
)


trace.set_tracer_provider(TracerProvider(resource=resource))
tracer = trace.get_tracer(__name__)


# Create a BatchSpanProcessor and add the OTLP exporter to it
span_processor = BatchSpanProcessor(otlp_exporter)
# add the span processor to the tracer provider
trace.get_tracer_provider().add_span_processor(span_processor)


# --- Define the lifespan context manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown events.
    """
    # --- Expose metrics on startup ---
    # Ensure the instrumentator is available here or passed appropriately if needed,
    # but since it's defined globally below, it should be accessible.
    instrumentator.expose(app)
    logging.info("Startup complete. Metrics exposed.") # Optional print statement
    yield
    # --- Code here would run on shutdown ---
    logging.info("Shutdown complete.")

# Create a FastAPI application instance, passing the lifespan manager
app = FastAPI(title="FastAPI Simple Endpoints", lifespan=lifespan)

# --- Instrument the app AFTER creating it ---
# This automatically adds /metrics endpoint and tracks requests
instrumentator = Instrumentator().instrument(app)

# Note: expose(app) is now called within the lifespan manager above

FastAPIInstrumentor.instrument_app(app)

# Define a simple request body model for a POST request
FAKE_ITEMS_DB: Dict[int, Dict[str, Any]] = {
    1: {"name": "laptop", "price": 1200},
    2: {"name": "mouse", "price": 25},
    3: {"name": "keyboard", "price": 75},
}

ALL_ITEMS: List[Dict[str, Any]] = [
    {"name": "laptop", "price": 1200},
    {"name": "mouse", "price": 25},
    {"name": "keyboard", "price": 75},
    {"name": "monitor", "price": 300},
    {"name": "webcam", "price": 50},
]

# --- Pydantic Models ---
class Item(BaseModel):
    name: str
    price: float
    is_offer: Optional[bool] = None


# --- Endpoints ---

@app.get("/", summary="Root endpoint")
async def read_root() -> Dict[str, str]:
    return {"message": "Welcome to the FastAPI application!"}


@app.get("/items/{item_id}", summary="Get item by ID")
async def read_item(item_id: int) -> Dict[str, Any]:
    if item_id not in FAKE_ITEMS_DB:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"item_id": item_id, **FAKE_ITEMS_DB[item_id]}


@app.get("/search/", summary="Search items by name and min price")
async def search_items(
    name: Optional[str] = None,
    min_price: float = 0
) -> Dict[str, List[Dict[str, Any]]]:
    results = [
        item for item in ALL_ITEMS
        if (name is None or name.lower() in item["name"].lower())
        and item["price"] >= min_price
    ]
    return {"search_results": results}


@app.post("/items/", summary="Create a new item")
async def create_item(item: Item) -> Dict[str, Any]:
    return {"message": "Item created successfully", "item": item.dict()}


@app.get("/status", summary="Get API health status")
async def get_status() -> Dict[str, str]:
    return {"status": "healthy", "version": "1.0"}


@app.get("/error-500", summary="Simulate internal server error")
async def get_error_500():
    raise HTTPException(status_code=500, detail="Internal Server Error")


@app.get("/error-400", summary="Simulate bad request error")
async def get_error_400():
    raise HTTPException(status_code=400, detail="Bad Request")


# Optional: Add a block to run the application directly with Uvicorn
if __name__ == "__main__":
    # --- Keep port 5060 for consistency ---
    uvicorn.run("main:app", host="0.0.0.0", port=5060, reload=True)