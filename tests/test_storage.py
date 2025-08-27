import boto3
import pytest
from moto import mock_aws

from infra.storage import LocalObjectStore, S3ObjectStore


@pytest.mark.parametrize("backend", ["local", "s3"])
def test_object_store_put_get_url(tmp_path, backend):
    src = tmp_path / "in.bin"
    data = b"hello"
    src.write_bytes(data)
    key = "folder/in.bin"

    if backend == "local":
        store = LocalObjectStore(tmp_path / "store")
        store.put(key, src)
        out = tmp_path / "out.bin"
        store.get(key, out)
        assert out.read_bytes() == data
        url = store.url(key)
        assert url.startswith("file://")
    else:
        with mock_aws():
            client = boto3.client("s3", region_name="us-east-1")
            bucket = "test-bucket"
            client.create_bucket(Bucket=bucket)
            store = S3ObjectStore(bucket, client=client)
            store.put(key, src)
            out = tmp_path / "out.bin"
            store.get(key, out)
            assert out.read_bytes() == data
            url = store.url(key)
            assert url.startswith("http")
