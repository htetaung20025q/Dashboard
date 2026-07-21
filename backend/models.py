import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Employee")  # "Super Admin", "HR", "Manager", "Employee"
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=True)

    employee = relationship("Employee", back_populates="user")
    notices = relationship("Notice", back_populates="creator")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    position = Column(String, nullable=False)
    base_salary = Column(Float, default=0.0)
    bonus = Column(Float, default=0.0)
    
    # Extended profile info
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="employee", uselist=False, cascade="all, delete-orphan")
    attendance = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="employee", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="employee", cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    check_in = Column(DateTime, nullable=False)
    check_out = Column(DateTime, nullable=True)
    date = Column(Date, nullable=False)
    overtime_hours = Column(Float, default=0.0)  # Integrated with payroll calculation

    employee = relationship("Employee", back_populates="attendance")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    leave_type = Column(String, nullable=False)  # "Casual", "Medical", "Annual"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(String, nullable=True)
    status = Column(String, default="Pending")  # "Pending", "Approved", "Rejected"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    employee = relationship("Employee", back_populates="leave_requests")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    employee = relationship("Employee", back_populates="documents")


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    creator = relationship("User", back_populates="notices")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)  # "Travel", "Meals", "Office Supplies", "Hardware", "Other"
    description = Column(String, nullable=False)
    receipt_path = Column(String, nullable=True)  # receipt image/pdf file path
    status = Column(String, default="Pending")  # "Pending", "Approved", "Rejected"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    employee = relationship("Employee", back_populates="expenses")


class FinancialRecord(Base):
    __tablename__ = "financial_records"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # "income" or "expense"
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)  # "Sales", "Rent", "Payroll", "Marketing", etc.
    description = Column(String, nullable=True)
    date = Column(Date, nullable=False)
