"""
Create Test User
"""
import asyncio
import asyncpg
from datetime import datetime

async def create_test_user():
    # Connect to database
    conn = await asyncpg.connect(
        host='localhost',
        port=5432,
        user='postgres',
        password='123456',
        database='tunnel_defect_db'
    )

    try:
        # Create test user
        result = await conn.fetchrow("""
            INSERT INTO users (id, username, email, password_hash, full_name, is_active, is_verified, locale, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT DO NOTHING
            RETURNING id, username, email
        """,
        'admin',
        'admin@tunnelinsight.com',
        '$2b$12$KpW9r2NKGya9xkPc85Qem.v7n/arwt.FMjvbHRgkRD6Ee88VsncuS',  # Admin123!
        'Administrator',
        True,
        True,
        'zh-CN'
        )

        if result:
            print(f"[OK] Test user created successfully!")
            print(f"     ID: {result['id']}")
            print(f"     Username: {result['username']}")
            print(f"     Email: {result['email']}")
            print(f"     Password: Admin123!")
        else:
            # User already exists, query user info
            existing = await conn.fetchrow("""
                SELECT id, username, email FROM users WHERE username = $1
            """, 'admin')

            if existing:
                print(f"[INFO] User already exists:")
                print(f"       ID: {existing['id']}")
                print(f"       Username: {existing['username']}")
                print(f"       Email: {existing['email']}")
                print(f"       Password: Admin123!")
            else:
                print("[ERROR] Failed to create user")

    except Exception as e:
        print(f"[ERROR] {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(create_test_user())
