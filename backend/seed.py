import datetime
from database import SessionLocal, engine, Base
import models
import schemas
import crud

def seed_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Seeding extended database schema...")

        # 1. Create Default Super Admin (unmapped to employee)
        admin_in = schemas.UserCreate(
            username="superadmin",
            password="admin123",
            role="Super Admin"
        )
        crud.create_user(db, admin_in)
        print("Super Admin created (superadmin / admin123)")

        # 2. Create Employees with diverse roles
        employees_data = [
            {
                "first_name": "Alice", 
                "last_name": "Smith", 
                "email": "alice@company.com", 
                "position": "HR Lead", 
                "base_salary": 6800.0, 
                "bonus": 400.0,
                "phone": "555-0199",
                "address": "123 Cherry Lane, Metropolis",
                "emergency_contact_name": "John Smith",
                "emergency_contact_phone": "555-0190"
            },
            {
                "first_name": "Bob", 
                "last_name": "Johnson", 
                "email": "bob@company.com", 
                "position": "Engineering Director", 
                "base_salary": 8500.0, 
                "bonus": 1200.0,
                "phone": "555-0188",
                "address": "456 Oak Avenue, Gotham",
                "emergency_contact_name": "Mary Johnson",
                "emergency_contact_phone": "555-0180"
            },
            {
                "first_name": "Htet", 
                "last_name": "Aung", 
                "email": "htetaung@company.com", 
                "position": "Senior Software Architect", 
                "base_salary": 7200.0, 
                "bonus": 600.0,
                "phone": "999-0123",
                "address": "789 Pine Road, Yangon",
                "emergency_contact_name": "U Aung",
                "emergency_contact_phone": "999-0120"
            },
            {
                "first_name": "Diana", 
                "last_name": "Prince", 
                "email": "diana@company.com", 
                "position": "Support Analyst", 
                "base_salary": 5000.0, 
                "bonus": 200.0,
                "phone": "555-0177",
                "address": "202 Amazon Way, Themyscira",
                "emergency_contact_name": "Hippolyta Prince",
                "emergency_contact_phone": "555-0170"
            },
        ]

        # Save employees
        db_employees = []
        for emp_data in employees_data:
            emp_in = schemas.EmployeeCreate(**emp_data)
            emp = crud.create_employee(db=db, employee=emp_in)
            db_employees.append(emp)
            print(f"Employee {emp.first_name} {emp.last_name} created")

        # 3. Update User Roles for HR and Manager
        # Alice is HR
        alice_user = db.query(models.User).filter(models.User.username == "alice.smith").first()
        if alice_user:
            alice_user.role = "HR"
            print("Set alice.smith role to HR")
            
        # Bob is Manager
        bob_user = db.query(models.User).filter(models.User.username == "bob.johnson").first()
        if bob_user:
            bob_user.role = "Manager"
            print("Set bob.johnson role to Manager")

        # 4. Seed Attendance history (with OT hours)
        today = datetime.date.today()
        for i in range(10, 0, -1):
            check_date = today - datetime.timedelta(days=i)
            # Skip weekends
            if check_date.weekday() >= 5:
                continue

            for idx, emp in enumerate(db_employees):
                check_in_time = datetime.datetime.combine(check_date, datetime.time(9, 0)) + datetime.timedelta(minutes=(idx * 10))
                # Bob and Htet work overtime (9 hours shift -> 1.0 hour OT)
                hours_worked = 9 if emp.first_name in ["Bob", "Htet"] else 8
                check_out_time = check_in_time + datetime.timedelta(hours=hours_worked)
                
                db_attendance = models.Attendance(
                    employee_id=emp.id,
                    check_in=check_in_time,
                    check_out=check_out_time,
                    date=check_date,
                    overtime_hours=float(hours_worked - 8) if hours_worked > 8 else 0.0
                )
                db.add(db_attendance)

        # 5. Seed Leave Requests
        leaves = [
            {"employee_id": db_employees[2].id, "leave_type": "Medical", "start_date": today + datetime.timedelta(days=2), "end_date": today + datetime.timedelta(days=3), "reason": "Dental Checkup surgery", "status": "Approved"},
            {"employee_id": db_employees[3].id, "leave_type": "Annual", "start_date": today + datetime.timedelta(days=10), "end_date": today + datetime.timedelta(days=15), "reason": "Family vacation", "status": "Pending"},
            {"employee_id": db_employees[0].id, "leave_type": "Casual", "start_date": today - datetime.timedelta(days=15), "end_date": today - datetime.timedelta(days=14), "reason": "Moving apartment", "status": "Approved"}
        ]
        for l in leaves:
            db_leave = models.LeaveRequest(**l)
            db.add(db_leave)

        # 6. Seed Notices
        notices = [
            {"title": "Q3 General All-Hands meeting", "content": "Our Q3 all-hands meeting is scheduled for next Friday at 10 AM. We will discuss project expansion tracks and review quarterly financial margins.", "created_by": 1},
            {"title": "Leave Policy Update", "content": "Please submit annual leave requests at least 7 working days in advance to ensure managers have time to adjust shift allocations.", "created_by": 2}
        ]
        for n in notices:
            db_notice = models.Notice(**n)
            db.add(db_notice)

        # 7. Seed Expenses
        expenses = [
            {"employee_id": db_employees[2].id, "amount": 150.0, "category": "Travel", "description": "Client meeting downtown taxi fares", "status": "Approved"},
            {"employee_id": db_employees[3].id, "amount": 45.0, "category": "Meals", "description": "Late shift dinner allowance", "status": "Pending"},
            {"employee_id": db_employees[1].id, "amount": 320.0, "category": "Hardware", "description": "External monitor for corporate laptop", "status": "Approved"}
        ]
        for ex in expenses:
            db_ex = models.Expense(**ex)
            db.add(db_ex)
            # If approved, insert corresponding record in FinancialRecord
            if ex["status"] == "Approved":
                db_rec = models.FinancialRecord(
                    type="expense",
                    amount=ex["amount"],
                    category="Expenses",
                    description=f"Reimbursement: {ex['description']}",
                    date=today - datetime.timedelta(days=2)
                )
                db.add(db_rec)

        # 8. Seed Standard Financial Records (Last 6 Months)
        financials = [
            {"type": "income", "amount": 30000.0, "category": "Sales", "description": "Client Licenses", "date": today - datetime.timedelta(days=120)},
            {"type": "expense", "amount": 12000.0, "category": "Payroll", "description": "Salary rollout", "date": today - datetime.timedelta(days=120)},
            {"type": "expense", "amount": 5000.0, "category": "Rent", "description": "Office rent", "date": today - datetime.timedelta(days=120)},

            {"type": "income", "amount": 35000.0, "category": "Sales", "description": "Licenses", "date": today - datetime.timedelta(days=90)},
            {"type": "expense", "amount": 12000.0, "category": "Payroll", "description": "Salary rollout", "date": today - datetime.timedelta(days=90)},
            {"type": "expense", "amount": 5000.0, "category": "Rent", "description": "Office rent", "date": today - datetime.timedelta(days=90)},

            {"type": "income", "amount": 42000.0, "category": "Sales", "description": "Client Licenses", "date": today - datetime.timedelta(days=60)},
            {"type": "expense", "amount": 15000.0, "category": "Payroll", "description": "Salary rollout", "date": today - datetime.timedelta(days=60)},
            {"type": "expense", "amount": 5000.0, "category": "Rent", "description": "Office rent", "date": today - datetime.timedelta(days=60)},

            {"type": "income", "amount": 40000.0, "category": "Sales", "description": "Licenses", "date": today - datetime.timedelta(days=30)},
            {"type": "expense", "amount": 15000.0, "category": "Payroll", "description": "Salary rollout", "date": today - datetime.timedelta(days=30)},
            {"type": "expense", "amount": 5000.0, "category": "Rent", "description": "Office rent", "date": today - datetime.timedelta(days=30)},

            {"type": "income", "amount": 55000.0, "category": "Sales", "description": "Consulting", "date": today - datetime.timedelta(days=5)},
            {"type": "expense", "amount": 18000.0, "category": "Payroll", "description": "Salary rollout", "date": today - datetime.timedelta(days=5)},
            {"type": "expense", "amount": 5000.0, "category": "Rent", "description": "Office rent", "date": today - datetime.timedelta(days=5)}
        ]
        for f in financials:
            db_f = models.FinancialRecord(**f)
            db.add(db_f)

        db.commit()
        print("Seeding database complete. All roles, notice board items, expenses, and leaf requests created.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
