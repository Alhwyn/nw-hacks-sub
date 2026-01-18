import os
import asyncio
import httpx

async def main():
    async with httpx.AsyncClient(timeout=2.0) as client:
        resp = await client.get("http://localhost:3000/clear-arrow")
        if resp.status_code == 200:
            print("Success: Server accepted clear command.")
            return

    exit_code = os.system("fuser -k 3000/tcp")

if __name__ == "__main__":
    asyncio.run(main())
