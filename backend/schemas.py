from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


# --- User Schemas ---
class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "Employee"  # "Super Admin", "HR", "Manager", "Employee"
    employee_id: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    employee_id: Optional[int] = None

    class Config:
        from_attributes = True

class EmployeeRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    position: str
    username: str
    password: str


# --- Employee Schemas ---
class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    position: str
    base_salary: float = Field(default=0.0, ge=0)
    bonus: float = Field(default=0.0, ge=0)
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    position: Optional[str] = None
    base_salary: Optional[float] = Field(default=None, ge=0)
    bonus: Optional[float] = Field(default=None, ge=0)
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    position: str
    base_salary: float
    bonus: float
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    total_salary: float = 0.0
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Attendance Schemas ---
class AttendanceCreate(BaseModel):
    employee_id: int
    check_in: datetime.datetime
    date: datetime.date

class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    check_in: datetime.datetime
    check_out: Optional[datetime.datetime] = None
    date: datetime.date
    overtime_hours: float
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True

class AttendanceStatusResponse(BaseModel):
    is_checked_in: bool
    last_check_in: Optional[datetime.datetime] = None
    last_check_out: Optional[datetime.datetime] = None
    attendance_id: Optional[int] = None
    overtime_hours: float = 0.0


# --- Leave Requests Schemas ---
class LeaveRequestCreate(BaseModel):
    leave_type: str = Field(description="Must be 'Casual', 'Medical', or 'Annual'")
    start_date: datetime.date
    end_date: datetime.date
    reason: Optional[str] = None

class LeaveRequestUpdateStatus(BaseModel):
    status: str = Field(description="Must be 'Approved' or 'Rejected'")

class LeaveRequestResponse(BaseModel):
    id: int
    employee_id: int
    leave_type: str
    start_date: datetime.date
    end_date: datetime.date
    reason: Optional[str] = None
    status: str
    created_at: datetime.datetime
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: int
    employee_id: int
    file_name: str
    file_path: str
    uploaded_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Notice board Schemas ---
class NoticeCreate(BaseModel):
    title: str
    content: str

class NoticeResponse(BaseModel):
    id: int
    title: str
    content: str
    created_by: Optional[int] = None
    creator_name: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Notifications Schemas ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Expense Tracking Schemas ---
class ExpenseCreate(BaseModel):
    amount: float = Field(ge=0.01)
    category: str = Field(description="Travel, Meals, Office Supplies, Hardware, Other")
    description: str

class ExpenseUpdateStatus(BaseModel):
    status: str = Field(description="Must be 'Approved' or 'Rejected'")

class ExpenseResponse(BaseModel):
    id: int
    employee_id: int
    amount: float
    category: str
    description: str
    receipt_path: Optional[str] = None
    status: str
    created_at: datetime.datetime
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- FinancialRecord Schemas ---
class FinancialRecordCreate(BaseModel):
    type: str = Field(description="Must be 'income' or 'expense'")
    amount: float = Field(ge=0)
    category: str
    description: Optional[str] = None
    date: datetime.date

class FinancialRecordResponse(BaseModel):
    id: int
    type: str
    amount: float
    category: str
    description: Optional[str] = None
    date: datetime.date

    class Config:
        from_attributes = True


# --- Dashboard & Analytics Schemas ---
class ChartDataPoint(BaseModel):
    name: str
    income: float
    expenses: float

class ExpenseCategoryData(BaseModel):
    name: str  # category name
    value: float  # sum of expenses

class FinancialStatsResponse(BaseModel):
    total_income: float
    total_expenses: float
    net_profit: float
    profit_margin: float
    mom_growth_rate: float
    income_change: float
    chart_data: List[ChartDataPoint]
    category_distribution: List[ExpenseCategoryData]
