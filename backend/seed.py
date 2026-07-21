import datetime
from database import SessionLocal, engine, Base
import models
import schemas
import crud

def seed_db():
    # 1. Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if Admin already exists
        admin_user = crud.get_user_by_username(db, "admin")
        if admin_user:
            print("Database already seeded.")
            return

        print("Seeding database...")

        # 2. Create Default Admin
        admin_in = schemas.UserCreate(
            username="admin",
            password="admin123",
            role="Admin"
        )
        crud.create_user(db, admin_in)
        print("Admin user created (admin / admin123)")

        # 3. Create Default Employees
        employees_data = [
            {"first_name": "Alice", "last_name": "Smith", "email": "alice@company.com", "position": "Software Engineer", "base_salary": 6500.0, "bonus": 500.0},
            {"first_name": "Bob", "last_name": "Johnson", "email": "bob@company.com", "position": "Product Manager", "base_salary": 7500.0, "bonus": 1000.0},
            {"first_name": "Charlie", "last_name": "Brown", "email": "charlie@company.com", "position": "UI/UX Designer", "base_salary": 5800.0, "bonus": 400.0},
            {"first_name": "Diana", "last_name": "Prince", "email": "diana@company.com", "position": "HR Specialist", "base_salary": 5200.0, "bonus": 300.0},
        ]

        employees = []
        for emp_data in employees_data:
            emp_in = schemas.EmployeeCreate(**emp_data)
            emp = crud.create_employee(db, emp_in)
            employees.append(emp)
            print(f"Employee {emp.first_name} {emp.last_name} created (username: {emp.first_name.lower()}.{emp.last_name.lower()} / password: employee123)")

        # 4. Seed Attendance History (Last 5 days)
        today = datetime.date.today()
        for i in range(5, 0, -1):
            check_date = today - datetime.timedelta(days=i)
            # Skip weekends (Saturday=5, Sunday=6)
            if check_date.weekday() >= 5:
                continue

            for emp in employees:
                # Add attendance
                check_in_time = datetime.datetime.combine(check_date, datetime.time(9, 0)) + datetime.timedelta(minutes=int(hash(emp.first_name) % 30))
                check_out_time = check_in_time + datetime.timedelta(hours=8, minutes=int(hash(emp.last_name) % 45))
                
                db_attendance = models.Attendance(
                    employee_id=emp.id,
                    check_in=check_in_time,
                    check_out=check_out_time,
                    date=check_date
                )
                db.add(db_attendance)

        # 5. Seed Financial Records (Last 6 Months)
        # Months offset to populate income/expense data
        # Let's say current date is July 2026. Seed from Feb 2026 to July 2026
        financials = [
            # Feb 2026
            {"type": "income", "amount": 25000.0, "category": "Sales", "description": "Q1 Software Contracts", "date": datetime.date(2026, 2, 10)},
            {"type": "income", "amount": 12000.0, "category": "Consulting", "description": "Architecture Review Services", "date": datetime.date(2026, 2, 24)},
            {"type": "expense", "amount": 10000.0, "category": "Rent", "description": "Office Space Lease", "date": datetime.date(2026, 2, 1)},
            {"type": "expense", "amount": 25000.0, "category": "Payroll", "description": "Staff Salaries & Benefits", "date": datetime.date(2026, 2, 28)},
            {"type": "expense", "amount": 1500.0, "category": "Utilities", "description": "Electricity & Water", "date": datetime.date(2026, 2, 15)},
            
            # Mar 2026
            {"type": "income", "amount": 32000.0, "category": "Sales", "description": "Product Subscription Billing", "date": datetime.date(2026, 3, 10)},
            {"type": "income", "amount": 15000.0, "category": "Consulting", "description": "Enterprise Development Support", "date": datetime.date(2026, 3, 22)},
            {"type": "expense", "amount": 10000.0, "category": "Rent", "description": "Office Space Lease", "date": datetime.date(2026, 3, 1)},
            {"type": "expense", "amount": 25000.0, "category": "Payroll", "description": "Staff Salaries & Benefits", "date": datetime.date(2026, 3, 28)},
            {"type": "expense", "amount": 2000.0, "category": "Marketing", "description": "Online Advertising Campaigns", "date": datetime.date(2026, 3, 15)},
            
            # Apr 2026
            {"type": "income", "amount": 28000.0, "category": "Sales", "description": "Subscription Billing", "date": datetime.date(2026, 4, 10)},
            {"type": "income", "amount": 8000.0, "category": "Consulting", "description": "System Audit Contract", "date": datetime.date(2026, 4, 25)},
            {"type": "expense", "amount": 10000.0, "category": "Rent", "description": "Office Space Lease", "date": datetime.date(2026, 4, 1)},
            {"type": "expense", "amount": 25000.0, "category": "Payroll", "description": "Staff Salaries & Benefits", "date": datetime.date(2026, 4, 28)},
            {"type": "expense", "amount": 1200.0, "category": "Utilities", "description": "Electricity, Internet", "date": datetime.date(2026, 4, 15)},
            
            # May 2026
            {"type": "income", "amount": 41000.0, "category": "Sales", "description": "New Client Onboarding Fee", "date": datetime.date(2026, 5, 12)},
            {"type": "income", "amount": 18000.0, "category": "Consulting", "description": "AI Training Workshop", "date": datetime.date(2026, 5, 20)},
            {"type": "expense", "amount": 10000.0, "category": "Rent", "description": "Office Space Lease", "date": datetime.date(2026, 5, 1)},
            {"type": "expense", "amount": 25000.0, "category": "Payroll", "description": "Staff Salaries & Benefits", "date": datetime.date(2026, 5, 28)},
            {"type": "expense", "amount": 3500.0, "category": "Marketing", "description": "Tech Conference Booth", "date": datetime.date(2026, 5, 18)},

            # Jun 2026
            {"type": "income", "amount": 38000.0, "category": "Sales", "description": "Recurring Platform Licenses", "date": datetime.date(2026, 6, 10)},
            {"type": "income", "amount": 21000.0, "category": "Consulting", "description": "Strategy Advisory Service", "date": datetime.date(2026, 6, 27)},
            {"type": "expense", "amount": 10000.0, "category": "Rent", "description": "Office Space Lease", "date": datetime.date(2026, 6, 1)},
            {"type": "expense", "amount": 25000.0, "category": "Payroll", "description": "Staff Salaries & Benefits", "date": datetime.date(2026, 6, 28)},
            {"type": "expense", "amount": 1800.0, "category": "Utilities", "description": "Electricity & Water", "date": datetime.date(2026, 6, 15)},
            
            # Jul 2026 (Current Month)
            {"type": "income", "amount": 45000.0, "category": "Sales", "description": "Enterprise API Integrations", "date": datetime.date(2026, 7, 5)},
            {"type": "income", "amount": 25000.0, "category": "Consulting", "description": "Database Migration Consult", "date": datetime.date(2026, 7, 12)},
            {"type": "expense", "amount": 10000.0, "category": "Rent", "description": "Office Space Lease", "date": datetime.date(2026, 7, 1)},
            {"type": "expense", "amount": 26200.0, "category": "Payroll", "description": "Employee Salaries & Paid Bonuses", "date": datetime.date(2026, 7, 15)},
            {"type": "expense", "amount": 4200.0, "category": "Marketing", "description": "Q3 Digital Ad Campaign", "date": datetime.date(2026, 7, 10)},
            {"type": "expense", "amount": 2100.0, "category": "Utilities", "description": "Monthly Office Utilities", "date": datetime.date(2026, 7, 15)}
        ]

        for record in financials:
            db_record = models.FinancialRecord(**record)
            db.add(db_record)

        db.commit()
        print("Database seeded with mock historical metrics, attendance, and employees.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
