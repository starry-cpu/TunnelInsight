"""
查询数据库中的用户
"""
import asyncio
import asyncpg

async def check_users():
    conn = await asyncpg.connect(
        host='localhost',
        port=5432,
        user='postgres',
        password='123456',
        database='tunnel_defect_db'
    )

    try:
        users = await conn.fetch("""
            SELECT id, username, email, password_hash, created_at
            FROM users
            WHERE username = 'admin'
            ORDER BY created_at DESC
        """)

        print(f"\nFound {len(users)} admin user(s):")
        for u in users:
            print(f"  ID: {u['id']}")
            print(f"  Username: {u['username']}")
            print(f"  Email: {u['email']}")
            print(f"  Password Hash: {u['password_hash'][:30]}...")
            print(f"  Created: {u['created_at']}")
            print()

        if len(users) > 1:
            print("[INFO] Multiple admin users found, keeping only the latest one...")
            latest_id = users[0]['id']
            await conn.execute("DELETE FROM users WHERE username = 'admin' AND id != $1", latest_id)
            print(f"[OK] Kept user: {latest_id}")

    except Exception as e:
        print(f"[ERROR] {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_users())
