from fastapi.testclient import TestClient
import schemathesis
from api.main import app

client = TestClient(app)

schema = schemathesis.openapi.from_asgi('/openapi.json', app)

def test_openapi_schema():
    schema.validate()

def test_endpoints_flow():
    t1 = client.post('/tracks:from_url', json={'url': 'a'}).json()
    t2 = client.post('/tracks:from_url', json={'url': 'b'}).json()
    pair = client.post('/pairs', json={'a': t1['id'], 'b': t2['id']}).json()
    assert pair['a'] == t1['id']
    r = client.post(f"/plan/{pair['id']}").json()
    assert r['status'] == 'ok'
    patch = client.post(f"/plan/{pair['id']}/patch", json={'ops': []}).json()
    assert patch['status'] == 'patched'
