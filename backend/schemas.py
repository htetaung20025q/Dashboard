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
    role: str = "Employee"  # "Admin" or "Employee"
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

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    position: Optional[str] = None
    base_salary: Optional[float] = Field(default=None, ge=0)
    bonus: Optional[float] = Field(default=None, ge=0)

class EmployeeResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    position: str
    base_salary: float
    bonus: float
    total_salary: float = 0.0
    created_at: datetime.datetime

    class Config:
        from_attributes = True

    # Compute total_salary dynamically on serialization
    @property
    def total_salary_computed(self) -> float:
        return self.base_salary + self.bonus

    # Pydantic v2 handles custom computed values or we can populate it in CRUD.
    # We will compute it in crud.py or dynamically. Let's make it a regular field and compute it in crud.


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
    employee_name: Optional[str] = None  # To display in directory/history

    class Config:
        from_attributes = True

class AttendanceStatusResponse(BaseModel):
    is_checked_in: bool
    last_check_in: Optional[datetime.datetime] = None
    last_check_out: Optional[datetime.datetime] = None
    attendance_id: Optional[int] = None


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

# --- Dashboard & Reports Schemas ---
class ChartDataPoint(BaseModel):
    name: str  # e.g., "Jan", "Feb" or "2026-07"
    income: float
    expenses: float

class FinancialStatsResponse(BaseModel):
    total_income: float
    total_expenses: float
    net_profit: float
    profit_margin: float  # percentage
    mom_growth_rate: float  # percentage
    income_change: float  # relative change indicator
    chart_data: List[ChartDataPoint]
