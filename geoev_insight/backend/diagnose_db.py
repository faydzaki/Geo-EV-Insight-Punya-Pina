"""Pemeriksaan MySQL baca-saja; jangan pernah mencetak atau membagikan password."""
from sqlalchemy import text
from database import get_engine
import os


def main():
    print("Konfigurasi koneksi (tanpa password):")
    print(f"Host: {os.getenv('DB_HOST', 'BELUM DIATUR')}")
    print(f"Port: {os.getenv('DB_PORT', '3306')}")
    print(f"Database pada .env: {os.getenv('DB_NAME', 'BELUM DIATUR')}")
    print(f"User aplikasi: {os.getenv('DB_USER', 'BELUM DIATUR')}")
    with get_engine().connect() as conn:
        print("\nDatabase aktual di MySQL:", conn.execute(text('SELECT DATABASE()')).scalar())
        for table in ('spklu', 'spklu_charger', 'hcs_by_brand', 'upload_history'):
            count = conn.execute(text(f'SELECT COUNT(*) FROM {table}')).scalar_one()
            print(f'{table}: {count} baris')
        total_hcs = conn.execute(text('SELECT COALESCE(SUM(jumlah), 0) FROM hcs_by_brand')).scalar_one()
        print(f'Total HCS agregat: {total_hcs}')
        print('Waktu upload terakhir:')
        rows = conn.execute(text('SELECT k, v FROM metadata ORDER BY k')).all()
        if not rows:
            print('  Belum ada upload')
        for key, value in rows:
            print(f'  {key}: {value}')
    print('\nKoneksi SELECT MySQL berhasil.')

if __name__ == '__main__':
    main()
