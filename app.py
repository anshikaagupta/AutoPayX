from fastapi import FastAPI, WebSocket, WebSocketDisconnect # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from typing import List
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Process received data
            try:
                message = json.loads(data)
                # Handle different message types
                if message.get('type') == 'verification_request':
                    # Process verification request
                    await manager.broadcast({
                        'type': 'verification_update',
                        'result': {
                            'status': 'processing',
                            'message': 'Document verification in progress'
                        }
                    })
                elif message.get('type') == 'payment_request':
                    # Process payment request
                    await manager.broadcast({
                        'type': 'payment_update',
                        'payment': {
                            'status': 'processing',
                            'message': 'Payment processing'
                        }
                    })
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# REST endpoints
@app.get("/")
async def read_root():
    return {"message": "Welcome to Financial Automation API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Document endpoints
@app.post("/api/documents/upload")
async def upload_document():
    # TODO: Implement document upload
    return {"message": "Document upload endpoint"}

@app.get("/api/documents/{document_id}")
async def get_document(document_id: str):
    return {"document_id": document_id, "status": "processing"}

# Verification endpoints
@app.post("/api/verify")
async def verify_document():
    # TODO: Implement document verification
    return {"message": "Document verification endpoint"}

# Payment endpoints
@app.post("/api/payments/process")
async def process_payment():
    # TODO: Implement payment processing
    return {"message": "Payment processing endpoint"}

@app.get("/api/payments/{payment_id}")
async def get_payment_status(payment_id: str):
    return {"payment_id": payment_id, "status": "processing"}

if __name__ == "__main__":
    import uvicorn # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)
