from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import jwt, JWTError
import qrcode
import io
import base64
import socketio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)
socket_app = socketio.ASGIApp(sio, app)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        restaurant_id: str = payload.get("restaurant_id")
        role: str = payload.get("role")
        if restaurant_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return {"restaurant_id": restaurant_id, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

class RestaurantSignup(BaseModel):
    restaurant_name: str
    email: EmailStr
    password: str

class RestaurantLogin(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    token: str
    restaurant_id: str
    restaurant_name: str
    role: str

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    name: str
    price: float
    category: str
    is_available: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MenuItemCreate(BaseModel):
    name: str
    price: float
    category: str
    is_available: bool = True

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    is_available: Optional[bool] = None

class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    table_name: str
    qr_code: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TableCreate(BaseModel):
    table_name: str

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    table_id: str
    table_name: str
    items: List[OrderItem]
    total: float
    status: str = "waiting"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None

class OrderCreate(BaseModel):
    table_id: str
    items: List[OrderItem]

class OrderStatusUpdate(BaseModel):
    status: str

class GalleryImage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    image_url: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GalleryImageCreate(BaseModel):
    image_url: str

class BellNotification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    table_id: str
    table_name: str
    is_resolved: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BellNotificationCreate(BaseModel):
    table_id: str

class DailySales(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    date: str
    total_sales: float
    total_orders: int
    avg_order_value: float
    total_visitors: int
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DashboardStats(BaseModel):
    live_customers: int
    active_tables: int
    monthly_customers: int
    today_total_sales: float
    today_orders: int
    today_visitors: int
    monthly_visitors: int
    monthly_orders: int
    monthly_revenue: float
    subscription_status: str
    subscription_end: Optional[str]

class CustomerVisit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    table_id: str
    session_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SubscriptionUpdate(BaseModel):
    subscription_start: str
    subscription_end: str

@api_router.post("/auth/signup", response_model=AuthResponse)
async def signup(data: RestaurantSignup):
    existing = await db.restaurants.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    restaurant_id = str(uuid.uuid4())
    restaurant_doc = {
        "id": restaurant_id,
        "restaurant_name": data.restaurant_name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "subscription_start": datetime.now(timezone.utc).isoformat(),
        "subscription_end": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.restaurants.insert_one(restaurant_doc)
    
    token = create_access_token({"restaurant_id": restaurant_id, "role": "admin"})
    
    return AuthResponse(
        token=token,
        restaurant_id=restaurant_id,
        restaurant_name=data.restaurant_name,
        role="admin"
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(data: RestaurantLogin):
    restaurant = await db.restaurants.find_one({"email": data.email}, {"_id": 0})
    if not restaurant or not verify_password(data.password, restaurant["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"restaurant_id": restaurant["id"], "role": "admin"})
    
    return AuthResponse(
        token=token,
        restaurant_id=restaurant["id"],
        restaurant_name=restaurant["restaurant_name"],
        role="admin"
    )

@api_router.get("/menu", response_model=List[MenuItem])
async def get_menu(current_user: dict = Depends(get_current_user)):
    menu_items = await db.menu_items.find(
        {"restaurant_id": current_user["restaurant_id"]},
        {"_id": 0}
    ).to_list(1000)
    return menu_items

@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(item: MenuItemCreate, current_user: dict = Depends(get_current_user)):
    menu_item = MenuItem(**item.model_dump(), restaurant_id=current_user["restaurant_id"])
    await db.menu_items.insert_one(menu_item.model_dump())
    return menu_item

@api_router.put("/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(
    item_id: str,
    item_update: MenuItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.menu_items.find_one_and_update(
        {"id": item_id, "restaurant_id": current_user["restaurant_id"]},
        {"$set": update_data},
        projection={"_id": 0},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return MenuItem(**result)

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.menu_items.delete_one(
        {"id": item_id, "restaurant_id": current_user["restaurant_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted"}

@api_router.get("/tables", response_model=List[Table])
async def get_tables(current_user: dict = Depends(get_current_user)):
    tables = await db.tables.find(
        {"restaurant_id": current_user["restaurant_id"]},
        {"_id": 0}
    ).to_list(1000)
    return tables

@api_router.post("/tables", response_model=Table)
async def create_table(table_data: TableCreate, current_user: dict = Depends(get_current_user)):
    table_id = str(uuid.uuid4())
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr_data = f"{table_id}"
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    table = Table(
        id=table_id,
        restaurant_id=current_user["restaurant_id"],
        table_name=table_data.table_name,
        qr_code=qr_code_base64
    )
    
    await db.tables.insert_one(table.model_dump())
    return table

@api_router.delete("/tables/{table_id}")
async def delete_table(table_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tables.delete_one(
        {"id": table_id, "restaurant_id": current_user["restaurant_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted"}

@api_router.get("/customer/table/{table_id}")
async def get_customer_table_info(table_id: str):
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    restaurant = await db.restaurants.find_one(
        {"id": table["restaurant_id"]},
        {"_id": 0, "restaurant_name": 1, "subscription_end": 1}
    )
    
    subscription_end = datetime.fromisoformat(restaurant["subscription_end"])
    if subscription_end < datetime.now(timezone.utc):
        raise HTTPException(status_code=403, detail="Restaurant subscription has expired")
    
    menu_items = await db.menu_items.find(
        {"restaurant_id": table["restaurant_id"], "is_available": True},
        {"_id": 0}
    ).to_list(1000)
    
    gallery = await db.gallery.find(
        {"restaurant_id": table["restaurant_id"]},
        {"_id": 0}
    ).to_list(100)
    
    session_id = str(uuid.uuid4())
    visit = CustomerVisit(
        restaurant_id=table["restaurant_id"],
        table_id=table_id,
        session_id=session_id
    )
    await db.customer_visits.insert_one(visit.model_dump())
    
    return {
        "table": table,
        "restaurant_name": restaurant["restaurant_name"],
        "menu": menu_items,
        "gallery": gallery,
        "session_id": session_id
    }

@api_router.post("/customer/orders")
async def create_customer_order(order_data: OrderCreate):
    table = await db.tables.find_one({"id": order_data.table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    total = sum(item.price * item.quantity for item in order_data.items)
    
    order = Order(
        restaurant_id=table["restaurant_id"],
        table_id=order_data.table_id,
        table_name=table["table_name"],
        items=[item.model_dump() for item in order_data.items],
        total=total
    )
    
    await db.orders.insert_one(order.model_dump())
    
    await sio.emit('new_order', order.model_dump(), room=table["restaurant_id"])
    
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"restaurant_id": current_user["restaurant_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return orders

@api_router.put("/orders/{order_id}", response_model=Order)
async def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    update_data = {"status": status_update.status}
    if status_update.status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.orders.find_one_and_update(
        {"id": order_id, "restaurant_id": current_user["restaurant_id"]},
        {"$set": update_data},
        projection={"_id": 0},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await sio.emit('order_updated', result, room=current_user["restaurant_id"])
    
    return Order(**result)

@api_router.get("/gallery", response_model=List[GalleryImage])
async def get_gallery(current_user: dict = Depends(get_current_user)):
    images = await db.gallery.find(
        {"restaurant_id": current_user["restaurant_id"]},
        {"_id": 0}
    ).to_list(1000)
    return images

@api_router.post("/gallery", response_model=GalleryImage)
async def add_gallery_image(image_data: GalleryImageCreate, current_user: dict = Depends(get_current_user)):
    image = GalleryImage(**image_data.model_dump(), restaurant_id=current_user["restaurant_id"])
    await db.gallery.insert_one(image.model_dump())
    return image

@api_router.delete("/gallery/{image_id}")
async def delete_gallery_image(image_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.gallery.delete_one(
        {"id": image_id, "restaurant_id": current_user["restaurant_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"message": "Image deleted"}

@api_router.post("/customer/bell")
async def call_staff(notification_data: BellNotificationCreate):
    table = await db.tables.find_one({"id": notification_data.table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    notification = BellNotification(
        restaurant_id=table["restaurant_id"],
        table_id=notification_data.table_id,
        table_name=table["table_name"]
    )
    
    await db.bell_notifications.insert_one(notification.model_dump())
    
    await sio.emit('staff_called', notification.model_dump(), room=table["restaurant_id"])
    
    return notification

@api_router.get("/bell-notifications", response_model=List[BellNotification])
async def get_bell_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.bell_notifications.find(
        {"restaurant_id": current_user["restaurant_id"], "is_resolved": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return notifications

@api_router.put("/bell-notifications/{notification_id}")
async def resolve_bell_notification(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.bell_notifications.find_one_and_update(
        {"id": notification_id, "restaurant_id": current_user["restaurant_id"]},
        {"$set": {"is_resolved": True}},
        projection={"_id": 0},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    await sio.emit('bell_resolved', result, room=current_user["restaurant_id"])
    
    return result

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    restaurant_id = current_user["restaurant_id"]
    
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    subscription_end = datetime.fromisoformat(restaurant["subscription_end"])
    subscription_status = "active" if subscription_end > datetime.now(timezone.utc) else "expired"
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_str = today_start.isoformat()
    
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_start_str = month_start.isoformat()
    
    active_orders = await db.orders.count_documents({
        "restaurant_id": restaurant_id,
        "status": {"$in": ["waiting", "preparing"]}
    })
    
    active_tables_cursor = db.orders.aggregate([
        {
            "$match": {
                "restaurant_id": restaurant_id,
                "status": {"$in": ["waiting", "preparing"]}
            }
        },
        {
            "$group": {"_id": "$table_id"}
        },
        {
            "$count": "total"
        }
    ])
    active_tables_result = await active_tables_cursor.to_list(1)
    active_tables = active_tables_result[0]["total"] if active_tables_result else 0
    
    today_orders = await db.orders.count_documents({
        "restaurant_id": restaurant_id,
        "created_at": {"$gte": today_start_str}
    })
    
    today_completed_orders = await db.orders.find(
        {
            "restaurant_id": restaurant_id,
            "status": "completed",
            "created_at": {"$gte": today_start_str}
        },
        {"_id": 0, "total": 1}
    ).to_list(10000)
    today_total_sales = sum(order["total"] for order in today_completed_orders)
    
    today_visitors = await db.customer_visits.count_documents({
        "restaurant_id": restaurant_id,
        "created_at": {"$gte": today_start_str}
    })
    
    monthly_orders = await db.orders.count_documents({
        "restaurant_id": restaurant_id,
        "created_at": {"$gte": month_start_str}
    })
    
    monthly_completed_orders = await db.orders.find(
        {
            "restaurant_id": restaurant_id,
            "status": "completed",
            "created_at": {"$gte": month_start_str}
        },
        {"_id": 0, "total": 1}
    ).to_list(10000)
    monthly_revenue = sum(order["total"] for order in monthly_completed_orders)
    
    monthly_visitors = await db.customer_visits.count_documents({
        "restaurant_id": restaurant_id,
        "created_at": {"$gte": month_start_str}
    })
    
    return DashboardStats(
        live_customers=active_orders,
        active_tables=active_tables,
        monthly_customers=monthly_orders,
        today_total_sales=today_total_sales,
        today_orders=today_orders,
        today_visitors=today_visitors,
        monthly_visitors=monthly_visitors,
        monthly_orders=monthly_orders,
        monthly_revenue=monthly_revenue,
        subscription_status=subscription_status,
        subscription_end=restaurant["subscription_end"]
    )

@api_router.post("/sales/close-day", response_model=DailySales)
async def close_day(current_user: dict = Depends(get_current_user)):
    restaurant_id = current_user["restaurant_id"]
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_str = today.strftime("%Y-%m-%d")
    today_iso = today.isoformat()
    
    existing = await db.daily_sales.find_one(
        {"restaurant_id": restaurant_id, "date": today_str},
        {"_id": 0}
    )
    if existing:
        return DailySales(**existing)
    
    today_completed_orders = await db.orders.find(
        {
            "restaurant_id": restaurant_id,
            "status": "completed",
            "created_at": {"$gte": today_iso}
        },
        {"_id": 0, "total": 1}
    ).to_list(10000)
    
    total_sales = sum(order["total"] for order in today_completed_orders)
    total_orders = len(today_completed_orders)
    avg_order_value = total_sales / total_orders if total_orders > 0 else 0
    
    total_visitors = await db.customer_visits.count_documents({
        "restaurant_id": restaurant_id,
        "created_at": {"$gte": today_iso}
    })
    
    daily_sales = DailySales(
        restaurant_id=restaurant_id,
        date=today_str,
        total_sales=total_sales,
        total_orders=total_orders,
        avg_order_value=avg_order_value,
        total_visitors=total_visitors
    )
    
    await db.daily_sales.insert_one(daily_sales.model_dump())
    
    return daily_sales

@api_router.get("/sales/history", response_model=List[DailySales])
async def get_sales_history(current_user: dict = Depends(get_current_user)):
    sales_history = await db.daily_sales.find(
        {"restaurant_id": current_user["restaurant_id"]},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    return sales_history

@api_router.put("/subscription", response_model=dict)
async def update_subscription(sub_data: SubscriptionUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.restaurants.find_one_and_update(
        {"id": current_user["restaurant_id"]},
        {"$set": {
            "subscription_start": sub_data.subscription_start,
            "subscription_end": sub_data.subscription_end
        }},
        projection={"_id": 0},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    return {
        "message": "Subscription updated",
        "subscription_start": result["subscription_start"],
        "subscription_end": result["subscription_end"]
    }

@sio.event
async def connect(sid, environ):
    logging.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")

@sio.event
async def join_restaurant(sid, data):
    restaurant_id = data.get('restaurant_id')
    if restaurant_id:
        sio.enter_room(sid, restaurant_id)
        logging.info(f"Client {sid} joined restaurant room {restaurant_id}")

@sio.event
async def leave_restaurant(sid, data):
    restaurant_id = data.get('restaurant_id')
    if restaurant_id:
        sio.leave_room(sid, restaurant_id)
        logging.info(f"Client {sid} left restaurant room {restaurant_id}")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
