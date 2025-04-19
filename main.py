from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager # Need this for lifespan
from pydantic import BaseModel
import uvicorn
import logging
# Import the instrumentator
from prometheus_fastapi_instrumentator import Instrumentator

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


# Define a simple request body model for a POST request
class Item(BaseModel):
    name: str
    price: float
    is_offer: bool = None

# Endpoint 1: Root endpoint
@app.get("/")
async def read_root():
    """
    Root endpoint returning a welcome message.
    """
    return {"message": "Welcome to the FastAPI application!"}

# Endpoint 2: Endpoint with a path parameter
@app.get("/items/{item_id}")
async def read_item(item_id: int):
    """
    Endpoint returning an item based on its ID.
    """
    fake_items_db = {
        1: {"name": "laptop", "price": 1200},
        2: {"name": "mouse", "price": 25},
        3: {"name": "keyboard", "price": 75},
    }
    if item_id not in fake_items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"item_id": item_id, **fake_items_db[item_id]}

# Endpoint 3: Endpoint with query parameters
@app.get("/search/")
async def search_items(name: str = None, min_price: float = 0):
    """
    Endpoint for searching items by name and minimum price.
    """
    results = []
    all_items = [
        {"name": "laptop", "price": 1200},
        {"name": "mouse", "price": 25},
        {"name": "keyboard", "price": 75},
        {"name": "monitor", "price": 300},
        {"name": "webcam", "price": 50},
    ]

    for item in all_items:
        if (name is None or name.lower() in item["name"].lower()) and item["price"] >= min_price:
            results.append(item)

    return {"search_results": results}

# Endpoint 4: POST endpoint to create an item
@app.post("/items/")
async def create_item(item: Item):
    """
    Endpoint to create a new item.
    Accepts a JSON request body matching the Item model.
    """
    return {"message": "Item created successfully", "item": item}

# Endpoint 5: Another GET endpoint
@app.get("/status")
async def get_status():
    """
    Endpoint returning the application status.
    """
    return {"status": "healthy", "version": "1.0"}

# Optional: Add a block to run the application directly with Uvicorn
if __name__ == "__main__":
    # --- Keep port 5060 for consistency ---
    uvicorn.run("main:app", host="0.0.0.0", port=5060, reload=True)