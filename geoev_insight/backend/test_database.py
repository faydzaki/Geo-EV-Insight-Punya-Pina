"""Test MySQL persistence logic with an isolated, in-memory SQLite ENGINE.

This is ONLY a dependency-free transactional test double. The application
itself has NO SQLite fallback and requires configured MySQL at runtime.
"""
from collections import Counter
import json
from sqlalchemy import create_engine, select
from sqlalchemy.pool import StaticPool
import database


def main():
    mock_engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    database._engine = mock_engine
    database._metadata.create_all(mock_engine)
    sites, hcs, meta = database.load_data()
    assert sites.empty and hcs.empty and meta == {}

    sample = {
        "nama": "SPKLU Contoh", "alamat": "Kota Surabaya", "pengelola": "PLN",
        "provinsi": "Jawa Timur", "wilayah": "Kota Surabaya", "lat": -7.25,
        "lon": 112.75, "daya": 120.0, "unit": 2, "connector": 3,
        "rincian": json.dumps([{"kelompok": "_", "kw": 60.0, "unit": 2, "connector": 3}]),
    }
    database.save_spklu([sample])
    database.save_hcs(Counter({("Kota Surabaya", "BYD"): 7, ("Kabupaten Gresik", "WULING"): 3}))
    sites, hcs, meta = database.load_data()
    assert len(sites) == 1 and len(hcs) == 2
    assert sites.iloc[0].nama == "SPKLU Contoh" and json.loads(sites.iloc[0].rincian)[0]["kw"] == 60.0
    assert hcs.jumlah.sum() == 10
    assert "WIB" in meta["spklu_updated"] and "WIB" in meta["hcs_updated"]
    assert len(mock_engine.connect().execute(select(database.upload_history)).all()) == 2

    broken = dict(sample, rincian="bukan-JSON")
    try:
        database.save_spklu([broken])
        raise AssertionError("The malformed upload must fail")
    except json.JSONDecodeError:
        pass
    sites_after, hcs_after, _ = database.load_data()
    assert len(sites_after) == 1 and len(hcs_after) == 2, "A failed upload must roll back"
    print("TES DATABASE BERHASIL: tabel, insert, reload, audit, dan rollback atomik")


if __name__ == "__main__":
    main()
