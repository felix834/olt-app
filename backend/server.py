from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId
import os
import logging
from pathlib import Path
import jwt
import random

# Emergent Integrations for AI
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT and Password Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'olt-management-secret-key-2024')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 168))
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# LLM Configuration for AI Support
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="OLT Management API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserRole:
    OPERATOR = "operator"
    FIELD_ENGINEER = "field_engineer"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    phone: Optional[str] = None
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class OLTDevice(BaseModel):
    id: str
    name: str
    location: str
    ip_address: str
    status: str  # active, inactive, fault
    total_ports: int
    active_ports: int
    last_updated: datetime

class GEPort(BaseModel):
    port_number: int
    status: str  # online, offline, degraded
    traffic_mbps: float
    connected_onus: int

class Customer(BaseModel):
    id: str
    customer_id: str
    name: str
    phone: str
    email: Optional[str] = None
    address: str
    broadband_plan: str
    billing_status: str  # paid, pending, overdue
    billing_amount: float
    connection_status: str  # active, inactive, faulty
    onu_id: Optional[str] = None
    created_at: datetime

class ONU(BaseModel):
    id: str
    onu_id: str
    mac_address: str
    customer_id: str
    olt_id: str
    port_number: int
    power_level_dbm: float
    status: str  # online, offline, low_power
    last_seen: datetime

class FaultTicketCreate(BaseModel):
    customer_id: str
    fault_type: str
    description: str
    priority: str = "medium"

class FaultTicketUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    location_verified: Optional[bool] = None
    gps_location: Optional[dict] = None

class FaultTicket(BaseModel):
    id: str
    ticket_id: str
    customer_id: str
    customer_name: str
    fault_type: str
    description: str
    status: str  # open, assigned, in_progress, resolved, closed
    priority: str  # high, medium, low
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_by: str
    created_by_name: str
    gps_location: Optional[dict] = None
    location_verified: bool = False
    created_at: datetime
    updated_at: datetime
    resolution_notes: Optional[str] = None

class AIChatRequest(BaseModel):
    message: str
    context: Optional[str] = None

class AIChatResponse(BaseModel):
    response: str
    timestamp: datetime

class MACUnbindRequest(BaseModel):
    reason: str

# ==================== AUTH UTILITIES ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")

def require_operator(user: dict = Depends(get_current_user)):
    if user.get("role") != UserRole.OPERATOR:
        raise HTTPException(status_code=403, detail="Operator access required")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    if user_data.role not in [UserRole.OPERATOR, UserRole.FIELD_ENGINEER]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Create user
    user_dict = {
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "phone": user_data.phone,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Create token
    access_token = create_access_token({"sub": user_id, "role": user_data.role})
    
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        phone=user_data.phone,
        created_at=user_dict["created_at"]
    )
    
    return TokenResponse(access_token=access_token, token_type="bearer", user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    access_token = create_access_token({"sub": user_id, "role": user["role"]})
    
    user_response = UserResponse(
        id=user_id,
        email=user["email"],
        name=user["name"],
        role=user["role"],
        phone=user.get("phone"),
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=access_token, token_type="bearer", user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        role=user["role"],
        phone=user.get("phone"),
        created_at=user["created_at"]
    )

# ==================== OLT MONITORING ENDPOINTS ====================

@api_router.get("/olts", response_model=List[OLTDevice])
async def get_olts(user: dict = Depends(get_current_user)):
    olts = await db.olt_devices.find().to_list(100)
    return [
        OLTDevice(
            id=str(olt["_id"]),
            name=olt["name"],
            location=olt["location"],
            ip_address=olt["ip_address"],
            status=olt["status"],
            total_ports=olt["total_ports"],
            active_ports=olt["active_ports"],
            last_updated=olt["last_updated"]
        ) for olt in olts
    ]

@api_router.get("/olts/{olt_id}", response_model=OLTDevice)
async def get_olt(olt_id: str, user: dict = Depends(get_current_user)):
    olt = await db.olt_devices.find_one({"_id": ObjectId(olt_id)})
    if not olt:
        raise HTTPException(status_code=404, detail="OLT device not found")
    
    return OLTDevice(
        id=str(olt["_id"]),
        name=olt["name"],
        location=olt["location"],
        ip_address=olt["ip_address"],
        status=olt["status"],
        total_ports=olt["total_ports"],
        active_ports=olt["active_ports"],
        last_updated=olt["last_updated"]
    )

@api_router.get("/olts/{olt_id}/ports", response_model=List[GEPort])
async def get_olt_ports(olt_id: str, user: dict = Depends(get_current_user)):
    olt = await db.olt_devices.find_one({"_id": ObjectId(olt_id)})
    if not olt:
        raise HTTPException(status_code=404, detail="OLT device not found")
    
    ports = olt.get("ge_ports", [])
    return [GEPort(**port) for port in ports]

# ==================== CUSTOMER MANAGEMENT ENDPOINTS ====================

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(
    search: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"customer_id": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    if status:
        query["connection_status"] = status
    
    customers = await db.customers.find(query).limit(50).to_list(50)
    return [
        Customer(
            id=str(c["_id"]),
            customer_id=c["customer_id"],
            name=c["name"],
            phone=c["phone"],
            email=c.get("email"),
            address=c["address"],
            broadband_plan=c["broadband_plan"],
            billing_status=c["billing_status"],
            billing_amount=c["billing_amount"],
            connection_status=c["connection_status"],
            onu_id=c.get("onu_id"),
            created_at=c["created_at"]
        ) for c in customers
    ]

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"$or": [{"_id": ObjectId(customer_id) if ObjectId.is_valid(customer_id) else None}, {"customer_id": customer_id}]})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return Customer(
        id=str(customer["_id"]),
        customer_id=customer["customer_id"],
        name=customer["name"],
        phone=customer["phone"],
        email=customer.get("email"),
        address=customer["address"],
        broadband_plan=customer["broadband_plan"],
        billing_status=customer["billing_status"],
        billing_amount=customer["billing_amount"],
        connection_status=customer["connection_status"],
        onu_id=customer.get("onu_id"),
        created_at=customer["created_at"]
    )

# ==================== ONU MANAGEMENT ENDPOINTS ====================

@api_router.get("/onus/customer/{customer_id}", response_model=List[ONU])
async def get_customer_onus(customer_id: str, user: dict = Depends(get_current_user)):
    onus = await db.onus.find({"customer_id": customer_id}).to_list(10)
    return [
        ONU(
            id=str(onu["_id"]),
            onu_id=onu["onu_id"],
            mac_address=onu["mac_address"],
            customer_id=onu["customer_id"],
            olt_id=onu["olt_id"],
            port_number=onu["port_number"],
            power_level_dbm=onu["power_level_dbm"],
            status=onu["status"],
            last_seen=onu["last_seen"]
        ) for onu in onus
    ]

@api_router.get("/onus/{onu_id}", response_model=ONU)
async def get_onu(onu_id: str, user: dict = Depends(get_current_user)):
    onu = await db.onus.find_one({"$or": [{"_id": ObjectId(onu_id) if ObjectId.is_valid(onu_id) else None}, {"onu_id": onu_id}]})
    if not onu:
        raise HTTPException(status_code=404, detail="ONU not found")
    
    return ONU(
        id=str(onu["_id"]),
        onu_id=onu["onu_id"],
        mac_address=onu["mac_address"],
        customer_id=onu["customer_id"],
        olt_id=onu["olt_id"],
        port_number=onu["port_number"],
        power_level_dbm=onu["power_level_dbm"],
        status=onu["status"],
        last_seen=onu["last_seen"]
    )

@api_router.post("/onus/{onu_id}/unbind-mac")
async def unbind_mac(onu_id: str, request: MACUnbindRequest, user: dict = Depends(get_current_user)):
    onu = await db.onus.find_one({"$or": [{"_id": ObjectId(onu_id) if ObjectId.is_valid(onu_id) else None}, {"onu_id": onu_id}]})
    if not onu:
        raise HTTPException(status_code=404, detail="ONU not found")
    
    # Simulate MAC unbind operation
    await db.onus.update_one(
        {"_id": onu["_id"]},
        {"$set": {"status": "offline", "last_seen": datetime.utcnow()}}
    )
    
    # Log the operation
    await db.mac_unbind_logs.insert_one({
        "onu_id": onu["onu_id"],
        "mac_address": onu["mac_address"],
        "reason": request.reason,
        "performed_by": str(user["_id"]),
        "performed_at": datetime.utcnow()
    })
    
    return {"message": "MAC address unbound successfully", "onu_id": onu["onu_id"]}

# ==================== FAULT MANAGEMENT ENDPOINTS ====================

@api_router.get("/faults", response_model=List[FaultTicket])
async def get_faults(
    status: Optional[str] = None,
    assigned_to_me: bool = False,
    user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if assigned_to_me and user.get("role") == UserRole.FIELD_ENGINEER:
        query["assigned_to"] = str(user["_id"])
    
    faults = await db.fault_tickets.find(query).sort("created_at", -1).to_list(100)
    
    # Enrich with user names
    result = []
    for fault in faults:
        # Get customer name
        customer = await db.customers.find_one({"customer_id": fault["customer_id"]})
        customer_name = customer["name"] if customer else "Unknown"
        
        # Get assigned to name
        assigned_to_name = None
        if fault.get("assigned_to"):
            assigned_user = await db.users.find_one({"_id": ObjectId(fault["assigned_to"])})
            assigned_to_name = assigned_user["name"] if assigned_user else None
        
        # Get created by name
        created_by_user = await db.users.find_one({"_id": ObjectId(fault["created_by"])})
        created_by_name = created_by_user["name"] if created_by_user else "System"
        
        result.append(FaultTicket(
            id=str(fault["_id"]),
            ticket_id=fault["ticket_id"],
            customer_id=fault["customer_id"],
            customer_name=customer_name,
            fault_type=fault["fault_type"],
            description=fault["description"],
            status=fault["status"],
            priority=fault["priority"],
            assigned_to=fault.get("assigned_to"),
            assigned_to_name=assigned_to_name,
            created_by=fault["created_by"],
            created_by_name=created_by_name,
            gps_location=fault.get("gps_location"),
            location_verified=fault.get("location_verified", False),
            created_at=fault["created_at"],
            updated_at=fault["updated_at"],
            resolution_notes=fault.get("resolution_notes")
        ))
    
    return result

@api_router.post("/faults", response_model=FaultTicket)
async def create_fault(fault_data: FaultTicketCreate, user: dict = Depends(require_operator)):
    # Verify customer exists
    customer = await db.customers.find_one({"customer_id": fault_data.customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Generate ticket ID
    ticket_count = await db.fault_tickets.count_documents({})
    ticket_id = f"FAULT-{datetime.utcnow().strftime('%Y%m%d')}-{ticket_count + 1:04d}"
    
    fault_dict = {
        "ticket_id": ticket_id,
        "customer_id": fault_data.customer_id,
        "fault_type": fault_data.fault_type,
        "description": fault_data.description,
        "status": "open",
        "priority": fault_data.priority,
        "assigned_to": None,
        "created_by": str(user["_id"]),
        "gps_location": None,
        "location_verified": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "resolution_notes": None
    }
    
    result = await db.fault_tickets.insert_one(fault_dict)
    
    return FaultTicket(
        id=str(result.inserted_id),
        ticket_id=ticket_id,
        customer_id=fault_data.customer_id,
        customer_name=customer["name"],
        fault_type=fault_data.fault_type,
        description=fault_data.description,
        status="open",
        priority=fault_data.priority,
        assigned_to=None,
        assigned_to_name=None,
        created_by=str(user["_id"]),
        created_by_name=user["name"],
        gps_location=None,
        location_verified=False,
        created_at=fault_dict["created_at"],
        updated_at=fault_dict["updated_at"],
        resolution_notes=None
    )

@api_router.get("/faults/{fault_id}", response_model=FaultTicket)
async def get_fault(fault_id: str, user: dict = Depends(get_current_user)):
    fault = await db.fault_tickets.find_one({"_id": ObjectId(fault_id)})
    if not fault:
        raise HTTPException(status_code=404, detail="Fault ticket not found")
    
    # Enrich with names
    customer = await db.customers.find_one({"customer_id": fault["customer_id"]})
    customer_name = customer["name"] if customer else "Unknown"
    
    assigned_to_name = None
    if fault.get("assigned_to"):
        assigned_user = await db.users.find_one({"_id": ObjectId(fault["assigned_to"])})
        assigned_to_name = assigned_user["name"] if assigned_user else None
    
    created_by_user = await db.users.find_one({"_id": ObjectId(fault["created_by"])})
    created_by_name = created_by_user["name"] if created_by_user else "System"
    
    return FaultTicket(
        id=str(fault["_id"]),
        ticket_id=fault["ticket_id"],
        customer_id=fault["customer_id"],
        customer_name=customer_name,
        fault_type=fault["fault_type"],
        description=fault["description"],
        status=fault["status"],
        priority=fault["priority"],
        assigned_to=fault.get("assigned_to"),
        assigned_to_name=assigned_to_name,
        created_by=fault["created_by"],
        created_by_name=created_by_name,
        gps_location=fault.get("gps_location"),
        location_verified=fault.get("location_verified", False),
        created_at=fault["created_at"],
        updated_at=fault["updated_at"],
        resolution_notes=fault.get("resolution_notes")
    )

@api_router.put("/faults/{fault_id}")
async def update_fault(fault_id: str, update_data: FaultTicketUpdate, user: dict = Depends(get_current_user)):
    fault = await db.fault_tickets.find_one({"_id": ObjectId(fault_id)})
    if not fault:
        raise HTTPException(status_code=404, detail="Fault ticket not found")
    
    update_fields = {"updated_at": datetime.utcnow()}
    
    if update_data.status:
        update_fields["status"] = update_data.status
    if update_data.assigned_to:
        # Only operators can assign
        if user.get("role") != UserRole.OPERATOR:
            raise HTTPException(status_code=403, detail="Only operators can assign tickets")
        update_fields["assigned_to"] = update_data.assigned_to
        if fault["status"] == "open":
            update_fields["status"] = "assigned"
    if update_data.resolution_notes:
        update_fields["resolution_notes"] = update_data.resolution_notes
    if update_data.location_verified is not None:
        update_fields["location_verified"] = update_data.location_verified
    if update_data.gps_location:
        update_fields["gps_location"] = update_data.gps_location
        update_fields["location_verified"] = True
    
    await db.fault_tickets.update_one({"_id": ObjectId(fault_id)}, {"$set": update_fields})
    
    return {"message": "Fault ticket updated successfully"}

# ==================== AI SUPPORT ENDPOINTS ====================

@api_router.post("/ai/chat", response_model=AIChatResponse)
async def ai_chat(request: AIChatRequest, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    try:
        # Build context-aware prompt
        system_message = """You are an AI assistant for an OLT (Optical Line Terminal) Management System for FTTH (Fiber-To-The-Home) operations. 
        You help field engineers and operators troubleshoot network issues, understand ONU power levels, diagnose connectivity problems, and provide guidance on fault resolution.
        
        Common troubleshooting steps:
        1. Check ONU power levels (should be between -8 dBm to -28 dBm)
        2. Verify MAC address binding
        3. Check fiber connections for physical damage
        4. Verify OLT port status
        5. Check customer billing status
        
        Provide clear, concise, and actionable advice."""
        
        # Create chat instance
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(user["_id"]),
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        # Create user message
        user_msg = UserMessage(text=request.message)
        
        # Get response
        ai_response = await chat.send_message(user_msg)
        
        # Save chat history
        await db.ai_chat_history.insert_one({
            "user_id": str(user["_id"]),
            "message": request.message,
            "response": ai_response,
            "context": request.context,
            "created_at": datetime.utcnow()
        })
        
        return AIChatResponse(response=ai_response, timestamp=datetime.utcnow())
    
    except Exception as e:
        logger.error(f"AI chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# ==================== ANALYTICS ENDPOINTS ====================

@api_router.get("/analytics/faults")
async def get_fault_analytics(user: dict = Depends(require_operator)):
    total_faults = await db.fault_tickets.count_documents({})
    open_faults = await db.fault_tickets.count_documents({"status": "open"})
    in_progress = await db.fault_tickets.count_documents({"status": {"$in": ["assigned", "in_progress"]}})
    resolved = await db.fault_tickets.count_documents({"status": "resolved"})
    
    return {
        "total_faults": total_faults,
        "open_faults": open_faults,
        "in_progress": in_progress,
        "resolved": resolved,
        "resolution_rate": (resolved / total_faults * 100) if total_faults > 0 else 0
    }

@api_router.get("/analytics/olts")
async def get_olt_analytics(user: dict = Depends(get_current_user)):
    total_olts = await db.olt_devices.count_documents({})
    active_olts = await db.olt_devices.count_documents({"status": "active"})
    faulty_olts = await db.olt_devices.count_documents({"status": "fault"})
    
    return {
        "total_olts": total_olts,
        "active_olts": active_olts,
        "faulty_olts": faulty_olts,
        "health_percentage": (active_olts / total_olts * 100) if total_olts > 0 else 0
    }

# ==================== SEED DATA ENDPOINT ====================

@api_router.post("/seed")
async def seed_database():
    # Check if already seeded
    user_count = await db.users.count_documents({})
    if user_count > 0:
        return {"message": "Database already seeded"}
    
    # Create users
    operator_id = (await db.users.insert_one({
        "email": "operator@olt.com",
        "password": hash_password("operator123"),
        "name": "John Operator",
        "role": UserRole.OPERATOR,
        "phone": "+919876543210",
        "created_at": datetime.utcnow()
    })).inserted_id
    
    field_engineer_id = (await db.users.insert_one({
        "email": "field@olt.com",
        "password": hash_password("field123"),
        "name": "Mike Field",
        "role": UserRole.FIELD_ENGINEER,
        "phone": "+919876543211",
        "created_at": datetime.utcnow()
    })).inserted_id
    
    # Create OLT devices
    olt_devices = []
    for i in range(5):
        active_ports = random.randint(12, 16)
        ge_ports = []
        for p in range(16):
            ge_ports.append({
                "port_number": p + 1,
                "status": random.choice(["online", "online", "online", "offline"]),
                "traffic_mbps": round(random.uniform(10, 1000), 2),
                "connected_onus": random.randint(0, 32)
            })
        
        olt_id = (await db.olt_devices.insert_one({
            "name": f"OLT-{chr(65+i)}-{i+1}",
            "location": f"Area {chr(65+i)}, Sector {i+1}",
            "ip_address": f"192.168.{i+1}.{random.randint(1, 254)}",
            "status": random.choice(["active", "active", "active", "fault"]),
            "total_ports": 16,
            "active_ports": active_ports,
            "ge_ports": ge_ports,
            "last_updated": datetime.utcnow()
        })).inserted_id
        olt_devices.append(str(olt_id))
    
    # Create customers
    customers = []
    for i in range(30):
        customer_id_str = f"CUST{10001 + i}"
        customer = {
            "customer_id": customer_id_str,
            "name": f"Customer {chr(65 + (i % 26))}{i}",
            "phone": f"+9198765{43210 + i}",
            "email": f"customer{i}@example.com",
            "address": f"House {i+1}, Street {(i % 10) + 1}, Area {chr(65 + (i % 5))}",
            "broadband_plan": random.choice(["100 Mbps", "200 Mbps", "500 Mbps", "1 Gbps"]),
            "billing_status": random.choice(["paid", "paid", "paid", "pending", "overdue"]),
            "billing_amount": random.choice([599, 799, 1299, 1999]),
            "connection_status": random.choice(["active", "active", "active", "inactive", "faulty"]),
            "onu_id": None,
            "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 365))
        }
        result = await db.customers.insert_one(customer)
        customers.append((str(result.inserted_id), customer_id_str))
    
    # Create ONUs
    for i, (cust_id, customer_id_str) in enumerate(customers):
        onu_id_str = f"ONU{20001 + i}"
        power_level = round(random.uniform(-28, -8), 2)
        status = "online" if power_level > -25 else "low_power" if power_level > -27 else "offline"
        
        onu = {
            "onu_id": onu_id_str,
            "mac_address": f"00:11:22:{random.randint(10,99)}:{random.randint(10,99)}:{random.randint(10,99)}",
            "customer_id": customer_id_str,
            "olt_id": random.choice(olt_devices),
            "port_number": random.randint(1, 16),
            "power_level_dbm": power_level,
            "status": status,
            "last_seen": datetime.utcnow() - timedelta(minutes=random.randint(0, 120))
        }
        result = await db.onus.insert_one(onu)
        
        # Update customer with ONU ID
        await db.customers.update_one({"_id": ObjectId(cust_id)}, {"$set": {"onu_id": onu_id_str}})
    
    # Create fault tickets
    fault_types = ["No Internet", "Slow Speed", "Intermittent Connection", "Hardware Issue", "Fiber Cut"]
    for i in range(15):
        customer_id_str = customers[random.randint(0, len(customers)-1)][1]
        ticket_id = f"FAULT-{datetime.utcnow().strftime('%Y%m%d')}-{i+1:04d}"
        
        status = random.choice(["open", "assigned", "in_progress", "resolved"])
        fault = {
            "ticket_id": ticket_id,
            "customer_id": customer_id_str,
            "fault_type": random.choice(fault_types),
            "description": f"Customer reported {random.choice(fault_types).lower()}. Needs investigation.",
            "status": status,
            "priority": random.choice(["high", "medium", "low"]),
            "assigned_to": str(field_engineer_id) if status != "open" else None,
            "created_by": str(operator_id),
            "gps_location": {"lat": 28.6139 + random.uniform(-0.1, 0.1), "lng": 77.2090 + random.uniform(-0.1, 0.1)} if status in ["in_progress", "resolved"] else None,
            "location_verified": status in ["in_progress", "resolved"],
            "created_at": datetime.utcnow() - timedelta(hours=random.randint(1, 72)),
            "updated_at": datetime.utcnow() - timedelta(minutes=random.randint(0, 60)),
            "resolution_notes": "Issue resolved by technician" if status == "resolved" else None
        }
        await db.fault_tickets.insert_one(fault)
    
    return {
        "message": "Database seeded successfully",
        "users": 2,
        "olts": 5,
        "customers": 30,
        "onus": 30,
        "faults": 15
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
